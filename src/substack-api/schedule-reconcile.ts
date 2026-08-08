export type ScheduleReconcileKey = "title" | "time" | "draft-id";

type ReconciledQueueStatus = "scheduled" | "published" | "draft" | "other";

export interface ExpectedScheduleItem {
  title?: string | undefined;
  draftId?: string | undefined;
  postId?: string | undefined;
  sourceFile?: string | undefined;
  scheduledAt: string;
  status?: "scheduled" | "published" | "draft" | undefined;
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

export interface ScheduleStatusMismatch {
  expected: ExpectedScheduleItem;
  actual: ScheduledQueueItem;
  expectedStatus: "scheduled" | "published" | "draft";
  actualStatus: ReconciledQueueStatus;
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
  statusMismatches: ScheduleStatusMismatch[];
  unexpected: ScheduledQueueItem[];
  queueCount: number;
  queueStateSummary: Record<ReconciledQueueStatus, number>;
  matchedScheduled: number;
  matchedPublished: number;
  matchedDraft: number;
  matchedOther: number;
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
  const statusMismatches: ScheduleStatusMismatch[] = [];
  const queueStateSummary: Record<ReconciledQueueStatus, number> = {
    scheduled: 0,
    published: 0,
    draft: 0,
    other: 0,
  };
  let matchedScheduled = 0;
  let matchedPublished = 0;
  let matchedDraft = 0;
  let matchedOther = 0;

  for (const item of queue) {
    queueStateSummary[normalizeQueueStatus(item.status)] += 1;
  }

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
      const actual = candidate.actual;
      usedQueueIndexes.add(candidate.index);
      const match: ScheduleMatch = { expected: expectedItem, actual };
      const actualStatus = normalizeQueueStatus(actual.status);
      matches.push(match);
      if (actualStatus === "scheduled") matchedScheduled += 1;
      else if (actualStatus === "published") matchedPublished += 1;
      else if (actualStatus === "draft") matchedDraft += 1;
      else matchedOther += 1;

      if (expectedItem.status && expectedItem.status !== actualStatus) {
        statusMismatches.push({
          expected: expectedItem,
          actual,
          expectedStatus: expectedItem.status,
          actualStatus,
        });
      }
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
  const unexpected = queue.filter((_, index) => !usedQueueIndexes.has(index));

  const status =
    missing.length === 0 &&
    timestampMismatches.length === 0 &&
    duplicateCollisions.length === 0 &&
    statusMismatches.length === 0 &&
    unexpected.length === 0
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
    statusMismatches,
    unexpected,
    queueCount: queue.length,
    queueStateSummary,
    matchedScheduled,
    matchedPublished,
    matchedDraft,
    matchedOther,
    message:
      status === "ok"
        ? `Matched ${matches.length}/${expected.length} expected scheduled items.`
        : `Matched ${matches.length}/${expected.length}; ${missing.length} missing, ${timestampMismatches.length} timestamp mismatches, ${statusMismatches.length} status mismatches, ${duplicateCollisions.length} duplicate collisions, ${unexpected.length} unexpected queue items.`,
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
  const postId = stringField(item, "postId", "post_id", "id");
  const title = stringField(item, "title", "subject");
  const sourceFile = stringField(item, "sourceFile", "source_file", "file");
  const status = parseExpectedStatus(item, index, sourceName);

  if (!title && !draftId && !postId) {
    throw new Error(
      `${sourceName} item ${index + 1} needs title, draftId, or postId for reconciliation.`,
    );
  }

  return { title, draftId, postId, sourceFile, scheduledAt, status };
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
    const expectedIds = [expected.draftId, expected.postId].filter(
      (value): value is string => typeof value === "string",
    );
    const actualIds = [actual.draftId, actual.postId].filter(
      (value): value is string => typeof value === "string",
    );

    if (expectedIds.length === 0 || actualIds.length === 0) {
      return false;
    }

    const expectedIdSet = new Set(expectedIds);
    const hasMatch = actualIds.some((id) => expectedIdSet.has(id));
    if (!hasMatch) return false;
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

function normalizeQueueStatus(status: string | undefined): ReconciledQueueStatus {
  if (!status) return "other";

  const normalized = status.trim().toLowerCase();
  if (["scheduled", "queue", "queued"].includes(normalized)) return "scheduled";
  if (["published", "publish", "live", "sent"].includes(normalized)) return "published";
  if (normalized.includes("draft")) return "draft";
  return "other";
}

function parseExpectedStatus(item: Record<string, unknown>, index: number, sourceName: string) {
  const raw = stringField(item, "status", "expectedStatus", "state");
  if (raw === undefined) return undefined;
  const normalized = normalizeExpectedStatus(raw);
  if (normalized === undefined) {
    throw new Error(`${sourceName} item ${index + 1} has unsupported status "${raw}".`);
  }
  return normalized;
}

function normalizeExpectedStatus(raw: string): "scheduled" | "published" | "draft" | undefined {
  const normalized = raw.trim().toLowerCase();
  if (["scheduled", "schedule", "queued", "queue"].includes(normalized)) return "scheduled";
  if (["published", "publish", "published_at", "live"].includes(normalized)) return "published";
  if (["draft", "unscheduled", "drafted"].includes(normalized)) return "draft";
  return undefined;
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
