import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { z } from "zod";
import { draftMappingsFilePath } from "../config/paths.js";

const DraftMappingSchema = z.object({
  sourceFile: z.string().min(1),
  publicationUrl: z.string().url(),
  draftId: z.union([z.string(), z.number()]).transform(String),
  draftUrl: z.string().url().optional(),
  title: z.string().min(1),
  slug: z.string().optional(),
  updatedAt: z.string().datetime(),
  serverUpdatedAt: z.string().datetime().optional(),
});

const DraftMappingsSchema = z.object({
  mappings: z.array(DraftMappingSchema).default([]),
});

export type DraftMapping = z.infer<typeof DraftMappingSchema>;

export interface SaveDraftMappingInput {
  sourceFile: string;
  publicationUrl: string;
  draftId: string | number;
  draftUrl?: string | undefined;
  title: string;
  slug?: string | undefined;
  serverUpdatedAt?: string | undefined;
}

export async function loadDraftMappings(): Promise<DraftMapping[]> {
  try {
    const raw = await readFile(draftMappingsFilePath(), "utf8");
    return DraftMappingsSchema.parse(JSON.parse(raw)).mappings;
  } catch (error) {
    if (isMissingFile(error)) {
      return [];
    }

    throw error;
  }
}

export async function saveDraftMapping(input: SaveDraftMappingInput): Promise<DraftMapping> {
  const current = await loadDraftMappings();
  const next = DraftMappingSchema.parse({
    sourceFile: normalizeSourceFile(input.sourceFile),
    publicationUrl: normalizePublicationUrl(input.publicationUrl),
    draftId: input.draftId,
    draftUrl: input.draftUrl,
    title: input.title,
    slug: input.slug,
    updatedAt: new Date().toISOString(),
    serverUpdatedAt: input.serverUpdatedAt ?? undefined,
  });

  const filtered = current.filter(
    (mapping) =>
      !(mapping.sourceFile === next.sourceFile && mapping.publicationUrl === next.publicationUrl),
  );

  await writeDraftMappings([...filtered, next]);
  return next;
}

export async function findDraftMapping(
  sourceFile: string,
  publicationUrl: string,
): Promise<DraftMapping | null> {
  const normalizedSourceFile = normalizeSourceFile(sourceFile);
  const normalizedPublicationUrl = normalizePublicationUrl(publicationUrl);
  const mappings = await loadDraftMappings();

  return (
    mappings.find(
      (mapping) =>
        mapping.sourceFile === normalizedSourceFile &&
        mapping.publicationUrl === normalizedPublicationUrl,
    ) ?? null
  );
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
