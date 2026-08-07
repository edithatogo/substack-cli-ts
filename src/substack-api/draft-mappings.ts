import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { z } from "zod";
import { draftMappingsFilePath } from "../config/paths.js";

const DraftMappingEventType = z.enum([
  "link",
  "create",
  "update",
  "reconcile",
  "import",
  "unschedule",
  "revise",
]);

const DraftMappingSchema = z.object({
  sourceFile: z.string().min(1),
  publicationUrl: z.string().url(),
  publicationId: z.string().min(1),
  draftId: z.union([z.string(), z.number()]).transform(String),
  draftUrl: z.string().url().optional(),
  title: z.string().min(1),
  slug: z.string().optional(),
  updatedAt: z.string().datetime(),
  eventId: z.string().min(1).optional(),
  eventSequence: z.number().int().nonnegative().optional(),
  eventType: DraftMappingEventType.optional(),
  serverUpdatedAt: z.string().datetime().optional(),
  queueHash: z.string().length(64).optional(),
});

const DraftMappingsFileSchema = z.object({
  schemaVersion: z.number().default(1),
  mappings: z.array(DraftMappingSchema).default([]),
  mappingsFileVersion: z.number().optional(),
});

const DraftMappingLegacyRecordSchema = z.record(z.string(), z.unknown());

export interface DraftMappingEventSummary {
  status: "no-op" | "imported";
  sourceFile: string;
  publicationUrl: string;
  publicationId: string | undefined;
  appended: number;
  skipped: number;
  duplicates: number;
  total: number;
  beforeHash: string;
  afterHash: string;
}

export interface SaveDraftMappingInput {
  sourceFile: string;
  publicationUrl: string;
  draftId: string | number;
  draftUrl?: string | undefined;
  title: string;
  slug?: string | undefined;
  serverUpdatedAt?: string | undefined;
  eventType?: z.infer<typeof DraftMappingEventType>;
}

export type DraftMapping = z.infer<typeof DraftMappingSchema>;

export interface DraftMappingsExport {
  schemaVersion: 1;
  exportedAt: string;
  mappings: DraftMapping[];
}

function mapKey(sourceFile: string, publicationUrl: string): string {
  return `${sourceFile}\u0000${publicationUrl}`;
}

function normalizePublicationId(publicationUrl: string): string {
  const url = new URL(publicationUrl);
  return url.pathname && url.pathname !== "/" ? `${url.hostname}${url.pathname}` : url.hostname;
}

function buildEventFingerprint(input: {
  sourceFile: string;
  publicationUrl: string;
  draftId: string;
  draftUrl?: string | undefined;
  title: string;
  slug?: string | undefined;
  eventType: z.infer<typeof DraftMappingEventType>;
  serverUpdatedAt?: string | undefined;
  updatedAt?: string | undefined;
}): string {
  const payload = {
    sourceFile: input.sourceFile,
    publicationUrl: input.publicationUrl,
    draftId: input.draftId,
    draftUrl: input.draftUrl,
    title: input.title,
    slug: input.slug,
    eventType: input.eventType,
    serverUpdatedAt: input.serverUpdatedAt,
    updatedAt: input.updatedAt,
  };

  return createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}

function buildQueueHash(mappings: DraftMapping[]): string {
  const normalized = [...mappings]
    .map((mapping) => ({
      sourceFile: mapping.sourceFile,
      publicationUrl: mapping.publicationUrl,
      publicationId: mapping.publicationId,
      draftId: mapping.draftId,
      draftUrl: mapping.draftUrl,
      title: mapping.title,
      slug: mapping.slug,
      updatedAt: mapping.updatedAt,
      eventId: mapping.eventId,
      eventSequence: mapping.eventSequence,
      eventType: mapping.eventType,
      serverUpdatedAt: mapping.serverUpdatedAt,
    }))
    .sort((left, right) => {
      if (left.publicationUrl === right.publicationUrl) {
        if (left.sourceFile === right.sourceFile) {
          return (left.eventSequence ?? 0) - (right.eventSequence ?? 0);
        }
        return left.sourceFile.localeCompare(right.sourceFile);
      }
      return left.publicationUrl.localeCompare(right.publicationUrl);
    });

  return createHash("sha256").update(JSON.stringify(normalized)).digest("hex");
}

function buildLatestSequenceByKey(mappings: DraftMapping[]): Map<string, number> {
  const sequenceByKey = new Map<string, number>();
  for (const mapping of mappings) {
    if (mapping.eventSequence === undefined) continue;
    const key = mapKey(mapping.sourceFile, mapping.publicationUrl);
    const existing = sequenceByKey.get(key) ?? 0;
    if (mapping.eventSequence > existing) {
      sequenceByKey.set(key, mapping.eventSequence);
    }
  }
  return sequenceByKey;
}

interface DraftMappingInput {
  sourceFile: string;
  publicationUrl: string;
  publicationId: string;
  draftId: string | number;
  draftUrl?: string | undefined;
  title: string;
  slug?: string | undefined;
  eventId?: string | undefined;
  eventSequence?: number | undefined;
  updatedAt?: string | undefined;
  eventType?: z.infer<typeof DraftMappingEventType>;
  serverUpdatedAt?: string | undefined;
  queueHash?: string | undefined;
}

function normalizeIncoming(
  input: DraftMappingInput,
  sequenceByKey: Map<string, number>,
): DraftMapping {
  const key = mapKey(input.sourceFile, input.publicationUrl);
  const nextSequence = (sequenceByKey.get(key) ?? 0) + 1;
  sequenceByKey.set(key, nextSequence);
  const updatedAt = new Date().toISOString();
  const eventType: z.infer<typeof DraftMappingEventType> = input.eventType ?? "reconcile";
  const candidate = {
    sourceFile: input.sourceFile,
    publicationUrl: input.publicationUrl,
    publicationId: normalizePublicationId(input.publicationUrl),
    draftId: String(input.draftId),
    draftUrl: input.draftUrl,
    title: input.title,
    slug: input.slug,
    eventId: input.eventId,
    eventSequence: nextSequence,
    eventType,
    serverUpdatedAt: input.serverUpdatedAt,
    updatedAt,
    queueHash: input.queueHash,
  } satisfies DraftMapping & { eventType: z.infer<typeof DraftMappingEventType> };

  return {
    ...candidate,
    eventId: candidate.eventId ?? buildEventFingerprint(candidate),
  };
}

function writeFingerprintAwareMappings(mappings: DraftMapping[]): DraftMapping[] {
  return mappings.map((mapping, index) => {
    return {
      ...mapping,
      queueHash: buildQueueHash(mappings.slice(0, index + 1)),
    };
  });
}

export async function loadDraftMappings(): Promise<DraftMapping[]> {
  try {
    const raw = await readFile(draftMappingsFilePath(), "utf8");
    const parsed = parseDraftMappingsPayload(raw);
    return parsed;
  } catch (error) {
    if (isMissingFile(error)) {
      return [];
    }
    throw error;
  }
}

export function buildDraftMappingsExport(mappings?: DraftMapping[]): DraftMappingsExport {
  return {
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    mappings: mappings ?? [],
  };
}

export async function saveDraftMapping(input: SaveDraftMappingInput): Promise<DraftMapping> {
  const current = await loadDraftMappings();
  const sequenceByKey = buildLatestSequenceByKey(current);
  const eventType: z.infer<typeof DraftMappingEventType> = input.eventType ?? "link";
  const next = normalizeIncoming(
    {
      sourceFile: normalizeSourceFile(input.sourceFile),
      publicationUrl: normalizePublicationUrl(input.publicationUrl),
      draftId: input.draftId,
      draftUrl: input.draftUrl,
      title: input.title,
      slug: input.slug,
      eventType,
      serverUpdatedAt: input.serverUpdatedAt,
      eventId: undefined,
      eventSequence: undefined,
      updatedAt: undefined,
      publicationId: normalizePublicationId(input.publicationUrl),
      queueHash: undefined,
    },
    sequenceByKey,
  );

  const nextMappings = writeFingerprintAwareMappings([...current, next]);
  await writeDraftMappings(nextMappings);
  return next;
}

export async function importDraftMappings(
  raw: string,
  options?: { dryRun?: boolean | undefined },
): Promise<DraftMappingEventSummary> {
  const payload = parseDraftMappingsPayload(raw);
  const current = await loadDraftMappings();
  const beforeHash = buildQueueHash(current);
  const sequenceByKey = buildLatestSequenceByKey(current);
  const existingSignatures = new Set(
    current.map(
      (entry) =>
        `${entry.sourceFile}\u0000${entry.publicationUrl}\u0000${entry.draftId}\u0000${entry.eventId}`,
    ),
  );

  let appended = 0;
  let skipped = 0;
  let duplicates = 0;
  const merged = [...current];

  for (const incoming of payload) {
    const eventType: z.infer<typeof DraftMappingEventType> = incoming.eventType ?? "import";
    const withComputed = normalizeIncoming(
      {
        sourceFile: normalizeSourceFile(incoming.sourceFile),
        publicationUrl: normalizePublicationUrl(incoming.publicationUrl),
        publicationId: incoming.publicationId,
        draftId: incoming.draftId,
        draftUrl: incoming.draftUrl,
        title: incoming.title,
        slug: incoming.slug,
        eventType,
        serverUpdatedAt: incoming.serverUpdatedAt,
        eventId: incoming.eventId,
        eventSequence: incoming.eventSequence,
        updatedAt: incoming.updatedAt,
        queueHash: incoming.queueHash,
      },
      sequenceByKey,
    );

    const signature = `${withComputed.sourceFile}\u0000${withComputed.publicationUrl}\u0000${withComputed.draftId}\u0000${withComputed.eventId}`;
    if (existingSignatures.has(signature)) {
      skipped += 1;
      duplicates += 1;
      continue;
    }

    existingSignatures.add(signature);
    merged.push(withComputed);
    appended += 1;
  }

  const normalizedSource = writeFingerprintAwareMappings(merged);

  if (!options?.dryRun) {
    await writeDraftMappings(normalizedSource);
  }

  return {
    status: appended > 0 ? "imported" : "no-op",
    sourceFile: "import",
    publicationUrl: "import",
    publicationId: undefined,
    appended,
    skipped,
    duplicates,
    total: normalizedSource.length,
    beforeHash,
    afterHash: buildQueueHash(normalizedSource),
  };
}

export async function findDraftMapping(
  sourceFile: string,
  publicationUrl: string,
): Promise<DraftMapping | null> {
  const normalizedSourceFile = normalizeSourceFile(sourceFile);
  const normalizedPublicationUrl = normalizePublicationUrl(publicationUrl);
  const mappings = await loadDraftMappings();

  const scoped = mappings.filter(
    (mapping) =>
      mapping.sourceFile === normalizedSourceFile &&
      mapping.publicationUrl === normalizedPublicationUrl,
  );
  const sorted = scoped.sort((a, b) => {
    const sequenceDiff = (b.eventSequence ?? 0) - (a.eventSequence ?? 0);
    if (sequenceDiff !== 0) return sequenceDiff;

    return Date.parse(b.updatedAt) - Date.parse(a.updatedAt);
  });

  return sorted[0] ?? null;
}

export function parseDraftMappingsPayload(raw: string): DraftMapping[] {
  const candidate = JSON.parse(raw);

  if (Array.isArray(candidate)) {
    return DraftMappingSchema.array().parse(candidate);
  }

  if (candidate && typeof candidate === "object") {
    const payload = candidate as Record<string, unknown>;
    const envelope = DraftMappingsFileSchema.safeParse(payload);
    if (Object.hasOwn(payload, "schemaVersion")) {
      if (!Object.hasOwn(payload, "mappings")) {
        throw new Error("Draft mappings payload envelopes must include a mappings array.");
      }
      if (!envelope.success) {
        throw new Error("Invalid draft mappings payload envelope.");
      }
      return DraftMappingSchema.array().parse(envelope.data.mappings);
    }

    if (Object.hasOwn(payload, "mappings")) {
      if (!envelope.success) {
        throw new Error("Invalid draft mappings payload.");
      }
      return DraftMappingSchema.array().parse(envelope.data.mappings);
    }

    if (DraftMappingLegacyRecordSchema.safeParse(candidate).success) {
      const records = Object.values(candidate).filter(
        (value): value is DraftMapping =>
          typeof value === "object" && value !== null && "sourceFile" in value,
      );
      if (records.length === 0) {
        throw new Error("Invalid draft mappings payload.");
      }
      return DraftMappingSchema.array().parse(records);
    }
  }

  throw new Error("Invalid draft mappings payload. Expected an array or draft mappings envelope.");
}

export function normalizeSourceFile(sourceFile: string): string {
  return resolve(sourceFile);
}

export function normalizePublicationUrl(publicationUrl: string): string {
  const url = new URL(publicationUrl);
  url.pathname = "/";
  url.search = "";
  url.hash = "";
  return url.toString();
}

async function writeDraftMappings(mappings: DraftMapping[]): Promise<void> {
  await mkdir(dirname(draftMappingsFilePath()), { recursive: true });
  await writeFile(draftMappingsFilePath(), `${JSON.stringify({ mappings }, null, 2)}\n`, "utf8");
}

function isMissingFile(error: unknown): boolean {
  return error instanceof Error && "code" in error && error.code === "ENOENT";
}
