import { readFile } from "node:fs/promises";
import { z } from "zod";

export const DEFAULT_SCHEDULE_LIMITS = {
  timezone: "UTC",
  maxHorizonDays: 90,
  maxQueuedPosts: 50,
  minSpacingMinutes: 60,
} as const;

export type ScheduleViolationCode =
  | "invalid-timezone"
  | "invalid-timestamp"
  | "dst-skipped"
  | "dst-ambiguous"
  | "horizon"
  | "queue-cap"
  | "collision"
  | "spacing";

export interface ScheduleCalendarLimits {
  timezone: string;
  maxHorizonDays: number;
  maxQueuedPosts: number;
  minSpacingMinutes: number;
}

export interface ScheduleCalendarItem {
  id?: string | undefined;
  title?: string | undefined;
  series?: string | undefined;
  draftId?: string | undefined;
  sourceFile?: string | undefined;
  scheduledAt: string;
  source?: string | undefined;
}

export interface ScheduleViolation {
  code: ScheduleViolationCode;
  message: string;
}

export interface ScheduleCalendarDecision {
  allowed: boolean;
  limits: ScheduleCalendarLimits;
  queuedCount: number;
  candidateInstant?: string | undefined;
  violations: ScheduleViolation[];
}

const LimitsSchema = z
  .object({
    timezone: z.string().min(1).optional(),
    maxHorizonDays: z.number().int().positive().optional(),
    maxQueuedPosts: z.number().int().positive().optional(),
    minSpacingMinutes: z.number().int().nonnegative().optional(),
  })
  .passthrough();

export function parseScheduleLimits(raw: unknown): ScheduleCalendarLimits {
  const parsed = LimitsSchema.parse(raw ?? {});
  const limits: ScheduleCalendarLimits = {
    timezone: parsed.timezone ?? DEFAULT_SCHEDULE_LIMITS.timezone,
    maxHorizonDays: parsed.maxHorizonDays ?? DEFAULT_SCHEDULE_LIMITS.maxHorizonDays,
    maxQueuedPosts: parsed.maxQueuedPosts ?? DEFAULT_SCHEDULE_LIMITS.maxQueuedPosts,
    minSpacingMinutes: parsed.minSpacingMinutes ?? DEFAULT_SCHEDULE_LIMITS.minSpacingMinutes,
  };
  if (!isValidTimeZone(limits.timezone)) {
    throw new Error(`Invalid IANA timezone: ${limits.timezone}`);
  }
  return limits;
}

export function parsePublicationCatalogue(raw: unknown): ScheduleCalendarItem[] {
  if (Array.isArray(raw)) {
    return raw.flatMap((item, index) => parseCatalogueEntry(item, index, "item"));
  }
  if (raw && typeof raw === "object") {
    const object = raw as Record<string, unknown>;
    const groups: Array<[string, string]> = [
      ["posts", "post"],
      ["drafts", "draft"],
      ["notes", "note"],
      ["items", "item"],
      ["scheduled", "scheduled"],
    ];
    return groups.flatMap(([key, source]) =>
      Array.isArray(object[key])
        ? object[key].flatMap((item, index) => parseCatalogueEntry(item, index, source))
        : [],
    );
  }
  throw new Error("Publication catalogue must be a JSON object or array.");
}

export async function loadPublicationCatalogue(
  cataloguePath: string,
): Promise<ScheduleCalendarItem[]> {
  const parsed: unknown = JSON.parse(await readFile(cataloguePath, "utf8"));
  return parsePublicationCatalogue(parsed);
}

export async function loadScheduleLimits(
  policyPath: string | undefined,
): Promise<ScheduleCalendarLimits> {
  if (!policyPath) return { ...DEFAULT_SCHEDULE_LIMITS };
  const parsed: unknown = JSON.parse(await readFile(policyPath, "utf8"));
  return parseScheduleLimits(parsed);
}

export function evaluatePublicationSchedulePolicy(params: {
  candidate: ScheduleCalendarItem;
  calendar: readonly ScheduleCalendarItem[];
  limits: ScheduleCalendarLimits;
  now?: Date;
}): ScheduleCalendarDecision {
  const now = params.now ?? new Date();
  const violations: ScheduleViolation[] = [];

  if (!isValidTimeZone(params.limits.timezone)) {
    return {
      allowed: false,
      limits: params.limits,
      queuedCount: 0,
      violations: [
        {
          code: "invalid-timezone",
          message: `Invalid IANA timezone: ${params.limits.timezone}`,
        },
      ],
    };
  }

  const candidateResolved = resolveScheduledInstant(params.candidate.scheduledAt, params.limits.timezone);
  if (candidateResolved.status !== "ok") {
    return {
      allowed: false,
      limits: params.limits,
      queuedCount: countFutureItems(params.calendar, params.limits.timezone, now),
      violations: [toResolutionViolation(candidateResolved)],
    };
  }

  const horizonMs = params.limits.maxHorizonDays * 24 * 60 * 60 * 1000;
  if (candidateResolved.instant.getTime() - now.getTime() > horizonMs) {
    violations.push({
      code: "horizon",
      message: `Schedule time exceeds the ${params.limits.maxHorizonDays}-day horizon.`,
    });
  }

  const others = params.calendar.filter(
    (item) => !isSameCalendarIdentity(item, params.candidate) && item.scheduledAt,
  );
  const resolvedOthers = others.map((item) => ({
    item,
    resolved: resolveScheduledInstant(item.scheduledAt, params.limits.timezone),
  }));

  const futureOthers = resolvedOthers.filter(
    (entry) =>
      entry.resolved.status === "ok" && entry.resolved.instant.getTime() > now.getTime(),
  );
  const queuedCount = futureOthers.length + 1;
  if (queuedCount > params.limits.maxQueuedPosts) {
    violations.push({
      code: "queue-cap",
      message: `Queued schedule count ${queuedCount} exceeds the cap of ${params.limits.maxQueuedPosts}.`,
    });
  }

  const candidateMs = candidateResolved.instant.getTime();
  const spacingMs = params.limits.minSpacingMinutes * 60 * 1000;
  for (const entry of resolvedOthers) {
    if (entry.resolved.status !== "ok") continue;
    const delta = Math.abs(entry.resolved.instant.getTime() - candidateMs);
    if (delta === 0) {
      violations.push({
        code: "collision",
        message: `Schedule time collides with ${describeItem(entry.item)}.`,
      });
    } else if (delta < spacingMs) {
      violations.push({
        code: "spacing",
        message: `Schedule time is ${Math.round(delta / 60000)} minutes from ${describeItem(entry.item)}; minimum spacing is ${params.limits.minSpacingMinutes} minutes.`,
      });
    }
  }

  return {
    allowed: violations.length === 0,
    limits: params.limits,
    queuedCount,
    candidateInstant: candidateResolved.instant.toISOString(),
    violations,
  };
}

export type ResolvedScheduleInstant =
  | { status: "ok"; instant: Date }
  | { status: "invalid-timestamp"; message: string }
  | { status: "dst-skipped"; message: string }
  | { status: "dst-ambiguous"; message: string };

export function resolveScheduledInstant(
  value: string,
  timeZone: string,
): ResolvedScheduleInstant {
  const trimmed = value.trim();
  if (!trimmed) {
    return { status: "invalid-timestamp", message: "Schedule time is missing." };
  }

  if (hasExplicitOffset(trimmed)) {
    const instant = new Date(trimmed);
    if (Number.isNaN(instant.getTime())) {
      return { status: "invalid-timestamp", message: `Schedule time is not parseable: ${value}` };
    }
    return { status: "ok", instant };
  }

  const civil = parseCivilDateTime(trimmed);
  if (!civil) {
    return { status: "invalid-timestamp", message: `Schedule time is not parseable: ${value}` };
  }

  return resolveCivilInTimeZone(civil, timeZone);
}

export function isValidTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone }).format(new Date());
    return true;
  } catch {
    return false;
  }
}

function parseCatalogueEntry(
  raw: unknown,
  index: number,
  source: string,
): ScheduleCalendarItem[] {
  if (!raw || typeof raw !== "object") return [];
  const object = raw as Record<string, unknown>;
  const scheduledAt = firstString(
    object.scheduledAt,
    object.scheduleAt,
    object.scheduled_at,
    object.postDate,
    object.post_date,
  );
  if (!scheduledAt) return [];
  return [
    {
      id: firstString(object.id, object.draftId, object.postId) ?? `${source}-${index}`,
      title: firstString(object.title, object.subject),
      series: firstString(object.series, object.seriesId, object.series_id),
      draftId: firstString(object.draftId, object.draft_id, object.id),
      sourceFile: firstString(object.sourceFile, object.source_file, object.file),
      scheduledAt,
      source,
    },
  ];
}

function isSameCalendarIdentity(
  left: ScheduleCalendarItem,
  right: ScheduleCalendarItem,
): boolean {
  if (left.draftId && right.draftId && left.draftId === right.draftId) return true;
  if (left.sourceFile && right.sourceFile && left.sourceFile === right.sourceFile) return true;
  if (left.id && right.id && left.id === right.id) return true;
  return false;
}

function describeItem(item: ScheduleCalendarItem): string {
  return item.sourceFile ?? item.title ?? item.draftId ?? item.id ?? "another calendar item";
}

function countFutureItems(
  calendar: readonly ScheduleCalendarItem[],
  timeZone: string,
  now: Date,
): number {
  return calendar.filter((item) => {
    const resolved = resolveScheduledInstant(item.scheduledAt, timeZone);
    return resolved.status === "ok" && resolved.instant.getTime() > now.getTime();
  }).length;
}

function toResolutionViolation(resolved: Exclude<ResolvedScheduleInstant, { status: "ok" }>): ScheduleViolation {
  if (resolved.status === "dst-skipped") {
    return { code: "dst-skipped", message: resolved.message };
  }
  if (resolved.status === "dst-ambiguous") {
    return { code: "dst-ambiguous", message: resolved.message };
  }
  return { code: "invalid-timestamp", message: resolved.message };
}

function hasExplicitOffset(value: string): boolean {
  return /(?:[zZ]|[+-]\d{2}:\d{2})$/.test(value);
}

interface CivilDateTime {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

function parseCivilDateTime(value: string): CivilDateTime | undefined {
  const match = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?$/.exec(value);
  if (!match) return undefined;
  return {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
    hour: Number(match[4]),
    minute: Number(match[5]),
    second: Number(match[6] ?? "0"),
  };
}

function resolveCivilInTimeZone(
  civil: CivilDateTime,
  timeZone: string,
): ResolvedScheduleInstant {
  const utcGuess = Date.UTC(
    civil.year,
    civil.month - 1,
    civil.day,
    civil.hour,
    civil.minute,
    civil.second,
  );
  const offsetAtGuess = getTimeZoneOffsetMs(new Date(utcGuess), timeZone);
  const firstInstant = new Date(utcGuess - offsetAtGuess);
  const firstOffset = getTimeZoneOffsetMs(firstInstant, timeZone);
  const preferred = new Date(utcGuess - firstOffset);

  const hourMs = 60 * 60 * 1000;
  const candidates = uniqueDates([
    preferred,
    new Date(preferred.getTime() - hourMs),
    new Date(preferred.getTime() + hourMs),
    firstInstant,
  ]).filter((instant) => civilEquals(readCivilInTimeZone(instant, timeZone), civil));

  if (candidates.length === 0) {
    return {
      status: "dst-skipped",
      message: `${formatCivil(civil)} does not exist in ${timeZone} because of a DST gap.`,
    };
  }
  if (candidates.length > 1) {
    return {
      status: "dst-ambiguous",
      message: `${formatCivil(civil)} is ambiguous in ${timeZone} because of a DST fold. Use an explicit UTC offset.`,
    };
  }

  const instant = candidates[0];
  if (!instant) {
    return { status: "invalid-timestamp", message: `Schedule time is not parseable: ${formatCivil(civil)}` };
  }
  return { status: "ok", instant };
}

function getTimeZoneOffsetMs(instant: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(instant);
  const values = Object.fromEntries(
    parts.filter((part) => part.type !== "literal").map((part) => [part.type, part.value]),
  );
  const asUtc = Date.UTC(
    Number(values.year),
    Number(values.month) - 1,
    Number(values.day),
    Number(values.hour === "24" ? "0" : values.hour),
    Number(values.minute),
    Number(values.second),
  );
  return asUtc - instant.getTime();
}

function readCivilInTimeZone(instant: Date, timeZone: string): CivilDateTime {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(instant);
  const values = Object.fromEntries(
    parts.filter((part) => part.type !== "literal").map((part) => [part.type, part.value]),
  );
  return {
    year: Number(values.year),
    month: Number(values.month),
    day: Number(values.day),
    hour: Number(values.hour === "24" ? "0" : values.hour),
    minute: Number(values.minute),
    second: Number(values.second),
  };
}

function civilEquals(left: CivilDateTime, right: CivilDateTime): boolean {
  return (
    left.year === right.year &&
    left.month === right.month &&
    left.day === right.day &&
    left.hour === right.hour &&
    left.minute === right.minute &&
    left.second === right.second
  );
}

function formatCivil(civil: CivilDateTime): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${civil.year}-${pad(civil.month)}-${pad(civil.day)}T${pad(civil.hour)}:${pad(civil.minute)}:${pad(civil.second)}`;
}

function uniqueDates(values: Date[]): Date[] {
  const seen = new Set<number>();
  const unique: Date[] = [];
  for (const value of values) {
    if (seen.has(value.getTime())) continue;
    seen.add(value.getTime());
    unique.push(value);
  }
  return unique;
}

function firstString(...values: unknown[]): string | undefined {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
  }
  return undefined;
}
