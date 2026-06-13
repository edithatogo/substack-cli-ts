export interface BatchScheduleItem {
  draftId: string;
  scheduledAt: string;
  title?: string | undefined;
  sourceFile?: string | undefined;
  status?: string | undefined;
}

export interface BatchSelectorPlan {
  selectorSourceFiles: string[];
  items: BatchScheduleItem[];
  skipped: Array<BatchScheduleItem & { reason: string }>;
}

export function parseIdFileContent(content: string): string[] {
  return content
    .split(/\r?\n/)
    .map((line) => line.replace(/#.*/, "").trim())
    .filter(Boolean);
}

export function parseBatchScheduleFileContent(content: string, sourceName = "schedule file") {
  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Could not parse ${sourceName} as JSON: ${message}`);
  }

  const rawItems = Array.isArray(parsed)
    ? parsed
    : isRecord(parsed) && Array.isArray(parsed.items)
      ? parsed.items
      : null;
  if (!rawItems) {
    throw new Error(`${sourceName} must contain a JSON array or an object with an items array.`);
  }

  return rawItems.map((item, index) => parseBatchScheduleItem(item, index, sourceName));
}

export function buildBatchSchedulePlan(input: {
  scheduleItems: BatchScheduleItem[];
  ids?: string[] | undefined;
  draftIds?: string[] | undefined;
  limit?: number | undefined;
  selectorSourceFiles: string[];
}): BatchSelectorPlan {
  const allowedIds = new Set([...(input.ids ?? []), ...(input.draftIds ?? [])]);
  const filtered =
    allowedIds.size > 0
      ? input.scheduleItems.filter((item) => allowedIds.has(item.draftId))
      : input.scheduleItems;
  const limited = input.limit !== undefined ? filtered.slice(0, input.limit) : filtered;
  const items: BatchScheduleItem[] = [];
  const skipped: Array<BatchScheduleItem & { reason: string }> = [];

  for (const item of limited) {
    if (isAlreadyLive(item.status)) {
      skipped.push({ ...item, reason: "already-scheduled-or-live" });
      continue;
    }
    items.push(item);
  }

  return {
    selectorSourceFiles: input.selectorSourceFiles,
    items,
    skipped,
  };
}

function parseBatchScheduleItem(
  item: unknown,
  index: number,
  sourceName: string,
): BatchScheduleItem {
  if (!isRecord(item)) {
    throw new Error(`${sourceName} item ${index + 1} must be an object.`);
  }

  const draftId = stringField(item, "draftId", "draft_id", "id");
  if (!draftId) {
    throw new Error(`${sourceName} item ${index + 1} is missing draftId.`);
  }

  const scheduledAt = stringField(item, "scheduledAt", "scheduled_at", "scheduleAt", "at");
  if (!scheduledAt) {
    throw new Error(`${sourceName} item ${index + 1} is missing scheduledAt.`);
  }
  if (Number.isNaN(Date.parse(scheduledAt))) {
    throw new Error(`${sourceName} item ${index + 1} has an invalid scheduledAt timestamp.`);
  }

  return {
    draftId,
    scheduledAt,
    title: stringField(item, "title", "subject"),
    sourceFile: stringField(item, "sourceFile", "source_file", "file"),
    status: stringField(item, "status", "state"),
  };
}

function isAlreadyLive(status: string | undefined): boolean {
  const normalized = status?.trim().toLocaleLowerCase();
  return (
    normalized === "scheduled" ||
    normalized === "live" ||
    normalized === "published" ||
    normalized === "sent"
  );
}

function stringField(record: Record<string, unknown>, ...keys: string[]): string | undefined {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.length > 0) return value;
    if (typeof value === "number") return String(value);
  }
  return undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
