export type ScheduleReconcileKey = "title" | "time" | "draft-id";

export interface ExpectedScheduleItem {
  title?: string | undefined;
  draftId?: string | undefined;
  sourceFile?: string | undefined;
  scheduledAt: string;
}

export interface ScheduledQueueItem {
  title?: string | undefined;
  draftId?: string | undefined;
  postId?: string | undefined;
  scheduledAt?: string | null | undefined;
  status?: string | undefined;
  source: "post" | "draft" | "broadcast";
}

export interface ScheduleReconcileOptions {
  by?: ScheduleReconcileKey[] | undefined;
  toleranceMinutes?: number | undefined;
}

export interface ScheduleMatch {
  expected: ExpectedScheduleItem;
  actual: ScheduledQueueItem;
}

export interface ScheduleTimestampMismatch {
  expected: ExpectedScheduleItem;
  candidates: ScheduledQueueItem[];
}

export interface ScheduleDuplicateCollision {
  expected: ExpectedScheduleItem;
  candidates: ScheduledQueueItem[];
  reason: "multiple-matches" | "duplicate-queue-key";
}

export interface ScheduleReconcileReport {
  status: "ok" | "mismatch";
  by: ScheduleReconcileKey[];
  toleranceMinutes: number;
  expectedCount: number;
  matchedCount: number;
  missing: ExpectedScheduleItem[];
  matches: ScheduleMatch[];
  timestampMismatches: ScheduleTimestampMismatch[];
  duplicateCollisions: ScheduleDuplicateCollision[];
  queueCount: number;
  message: string;
}

export function parseScheduleReconcileKeys(value: string | undefined): ScheduleReconcileKey[] {
  const raw = value ?? "title,time";
  const keys = raw
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  if (keys.length === 0) {
    throw new Error("At least one reconcile key is required.");
  }

  const parsed: ScheduleReconcileKey[] = [];
  for (const key of keys) {
    if (key === "title" || key === "time" || key === "draft-id") {
      parsed.push(key);
      continue;
    }
    throw new Error(`Unsupported reconcile key "${key}". Use title,time,draft-id.`);
  }

  return parsed;
}

export function parseScheduleFileContent(content: string, sourceName = "schedule file") {
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

  return rawItems.map((item, index) => parseExpectedScheduleItem(item, index, sourceName));
}

export function reconcileSchedule(
  expected: ExpectedScheduleItem[],
  queue: ScheduledQueueItem[],
  options: ScheduleReconcileOptions = {},
): ScheduleReconcileReport {
  const by = options.by ?? ["title", "time"];
  const toleranceMinutes = options.toleranceMinutes ?? 5;
  const usedQueueIndexes = new Set<number>();
  const matches: ScheduleMatch[] = [];
  const missing: ExpectedScheduleItem[] = [];
  const timestampMismatches: ScheduleTimestampMismatch[] = [];
  const duplicateCollisions: ScheduleDuplicateCollision[] = [];

  for (const expectedItem of expected) {
    const identityCandidates = queue
      .map((actual, index) => ({ actual, index }))
      .filter(
        ({ actual, index }) =>
          !usedQueueIndexes.has(index) && identityMatches(expectedItem, actual, by),
      );
    const matchingCandidates = by.includes("time")
      ? identityCandidates.filter(({ actual }) =>
          timeMatches(expectedItem.scheduledAt, actual.scheduledAt, toleranceMinutes),
        )
      : identityCandidates;

    if (matchingCandidates.length === 1) {
      const candidate = matchingCandidates[0];
      if (!candidate) continue;
      usedQueueIndexes.add(candidate.index);
      matches.push({ expected: expectedItem, actual: candidate.actual });
      continue;
    }

    if (matchingCandidates.length > 1) {
      duplicateCollisions.push({
        expected: expectedItem,
        candidates: matchingCandidates.map(({ actual }) => actual),
        reason: "multiple-matches",
      });
      continue;
    }

    if (by.includes("time") && identityCandidates.length > 0) {
      timestampMismatches.push({
        expected: expectedItem,
        candidates: identityCandidates.map(({ actual }) => actual),
      });
      continue;
    }

    missing.push(expectedItem);
  }

  duplicateCollisions.push(...findDuplicateQueueKeys(queue, by));

  const status =
    missing.length === 0 && timestampMismatches.length === 0 && duplicateCollisions.length === 0
      ? "ok"
      : "mismatch";

  return {
    status,
    by,
    toleranceMinutes,
    expectedCount: expected.length,
    matchedCount: matches.length,
    missing,
    matches,
    timestampMismatches,
    duplicateCollisions,
    queueCount: queue.length,
    message:
      status === "ok"
        ? `Matched ${matches.length}/${expected.length} expected scheduled items.`
        : `Matched ${matches.length}/${expected.length}; ${missing.length} missing, ${timestampMismatches.length} timestamp mismatches, ${duplicateCollisions.length} duplicate collisions.`,
  };
}

function parseExpectedScheduleItem(
  item: unknown,
  index: number,
  sourceName: string,
): ExpectedScheduleItem {
  if (!isRecord(item)) {
    throw new Error(`${sourceName} item ${index + 1} must be an object.`);
  }

  const scheduledAt = stringField(item, "scheduledAt", "scheduled_at", "scheduleAt", "at");
  if (!scheduledAt) {
    throw new Error(`${sourceName} item ${index + 1} is missing scheduledAt.`);
  }
  if (Number.isNaN(Date.parse(scheduledAt))) {
    throw new Error(`${sourceName} item ${index + 1} has an invalid scheduledAt timestamp.`);
  }

  const draftId = stringField(item, "draftId", "draft_id");
  const title = stringField(item, "title", "subject");
  const sourceFile = stringField(item, "sourceFile", "source_file", "file");

  if (!title && !draftId) {
    throw new Error(`${sourceName} item ${index + 1} needs title or draftId for reconciliation.`);
  }

  return { title, draftId, sourceFile, scheduledAt };
}

function identityMatches(
  expected: ExpectedScheduleItem,
  actual: ScheduledQueueItem,
  by: ScheduleReconcileKey[],
): boolean {
  const hasIdentityKey = by.includes("title") || by.includes("draft-id");
  if (!hasIdentityKey) return true;

  if (by.includes("title")) {
    const expectedTitle = normalizeTitle(expected.title);
    const actualTitle = normalizeTitle(actual.title);
    if (!expectedTitle || !actualTitle || expectedTitle !== actualTitle) return false;
  }

  if (by.includes("draft-id")) {
    if (
      !expected.draftId ||
      (expected.draftId !== actual.draftId && expected.draftId !== actual.postId)
    ) {
      return false;
    }
  }

  return true;
}

function timeMatches(
  expectedTimestamp: string,
  actualTimestamp: string | null | undefined,
  toleranceMinutes: number,
): boolean {
  if (!actualTimestamp) return false;
  const expectedTime = Date.parse(expectedTimestamp);
  const actualTime = Date.parse(actualTimestamp);
  if (Number.isNaN(expectedTime) || Number.isNaN(actualTime)) return false;
  return Math.abs(expectedTime - actualTime) <= toleranceMinutes * 60_000;
}

function findDuplicateQueueKeys(
  queue: ScheduledQueueItem[],
  by: ScheduleReconcileKey[],
): ScheduleDuplicateCollision[] {
  const seen = new Map<string, ScheduledQueueItem[]>();
  for (const item of queue) {
    const key = queueKey(item, by);
    if (!key) continue;
    const existing = seen.get(key) ?? [];
    existing.push(item);
    seen.set(key, existing);
  }

  return [...seen.values()]
    .filter((items) => items.length > 1)
    .map((candidates) => ({
      expected: {
        title: candidates[0]?.title,
        draftId: candidates[0]?.draftId ?? candidates[0]?.postId,
        scheduledAt: candidates[0]?.scheduledAt ?? "",
      },
      candidates,
      reason: "duplicate-queue-key",
    }));
}

function queueKey(item: ScheduledQueueItem, by: ScheduleReconcileKey[]): string | null {
  const parts: string[] = [];
  if (by.includes("title")) {
    const title = normalizeTitle(item.title);
    if (!title) return null;
    parts.push(`title:${title}`);
  }
  if (by.includes("draft-id")) {
    const id = item.draftId ?? item.postId;
    if (!id) return null;
    parts.push(`id:${id}`);
  }
  if (by.includes("time")) {
    if (!item.scheduledAt) return null;
    const timestamp = Date.parse(item.scheduledAt);
    if (Number.isNaN(timestamp)) return null;
    parts.push(`time:${new Date(timestamp).toISOString()}`);
  }
  return parts.length > 0 ? parts.join("|") : null;
}

function normalizeTitle(value: string | undefined): string {
  return value?.trim().replace(/\s+/g, " ").toLocaleLowerCase() ?? "";
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
