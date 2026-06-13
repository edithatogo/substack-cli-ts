import type { ApiAuthMaterial } from "./auth.js";
import type { FetchLike } from "./client.js";
import { apiHeaders, requestWrite } from "./client.js";

export type NoteWriteOperation = "create" | "schedule";

export interface NoteScheduleFileItem {
  text?: string | undefined;
  textFile?: string | undefined;
  postUrl?: string | undefined;
  scheduledAt?: string | undefined;
  title?: string | undefined;
  status?: string | undefined;
}

export interface NoteBatchItem {
  text: string;
  postUrl: string;
  scheduledAt: string;
  title?: string | undefined;
  sourceFile?: string | undefined;
  status?: string | undefined;
}

export interface NoteContractIssue {
  code:
    | "empty-note"
    | "missing-post-url"
    | "post-url-not-mentioned"
    | "too-many-sentences"
    | "invalid-scheduled-at";
  message: string;
}

export interface NoteBatchPlan {
  status: "ready" | "blocked";
  selectorSourceFile: string;
  items: NoteBatchItem[];
  skipped: Array<{ item: NoteScheduleFileItem; reason: string }>;
  issues: Array<{ item: NoteBatchItem; issues: NoteContractIssue[] }>;
  message: string;
}

export interface NoteWritePlan {
  status: "planned";
  operation: NoteWriteOperation;
  method: "POST";
  endpoint: string;
  text: string;
  postUrl?: string | undefined;
  scheduledAt?: string | undefined;
  requestBody: Record<string, unknown>;
  message: string;
}

export interface NoteWriteResult {
  status: "created" | "scheduled" | "failed";
  operation: NoteWriteOperation;
  method: "POST";
  endpoint: string;
  noteId?: string | undefined;
  publishedAt?: string | undefined;
  scheduledAt?: string | undefined;
  message: string;
  error?: string | undefined;
  retryAttempts?: number | undefined;
}

export function parseNoteScheduleFileContent(
  content: string,
  sourceName = "notes schedule file",
): NoteScheduleFileItem[] {
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

  return rawItems.map((item, index) => parseNoteScheduleItem(item, index, sourceName));
}

export function buildNoteBatchPlan(input: {
  selectorSourceFile: string;
  items: NoteBatchItem[];
  limit?: number | undefined;
}): NoteBatchPlan {
  const skipped: NoteBatchPlan["skipped"] = [];
  const candidates = [];

  for (const item of input.items) {
    const normalizedStatus = item.status?.trim().toLowerCase();
    if (
      normalizedStatus === "scheduled" ||
      normalizedStatus === "published" ||
      normalizedStatus === "sent"
    ) {
      skipped.push({ item, reason: "already-scheduled-or-live" });
      continue;
    }
    candidates.push(item);
  }

  const limitedItems = input.limit === undefined ? candidates : candidates.slice(0, input.limit);
  const issues = limitedItems
    .map((item) => ({ item, issues: validateScheduledNoteContract(item) }))
    .filter((entry) => entry.issues.length > 0);
  const status = issues.length > 0 ? "blocked" : "ready";

  return {
    status,
    selectorSourceFile: input.selectorSourceFile,
    items: limitedItems,
    skipped,
    issues,
    message:
      status === "ready"
        ? `Prepared ${limitedItems.length} scheduled note${limitedItems.length === 1 ? "" : "s"}.`
        : `Blocked ${issues.length} scheduled note${issues.length === 1 ? "" : "s"} with contract issues.`,
  };
}

export function validateScheduledNoteContract(input: {
  text: string;
  postUrl?: string | undefined;
  scheduledAt?: string | undefined;
}): NoteContractIssue[] {
  const issues: NoteContractIssue[] = [];
  const text = input.text.trim();

  if (!text) {
    issues.push({ code: "empty-note", message: "Note text must not be empty." });
  }

  if (!input.postUrl) {
    issues.push({
      code: "missing-post-url",
      message: "Scheduled covering notes must include the matching post URL.",
    });
  } else if (!text.includes(input.postUrl)) {
    issues.push({
      code: "post-url-not-mentioned",
      message: "Scheduled covering notes must mention the matching post URL.",
    });
  }

  if (countSentences(text) > 3) {
    issues.push({
      code: "too-many-sentences",
      message: "Scheduled covering notes must be no more than three sentences.",
    });
  }

  if (!input.scheduledAt || Number.isNaN(Date.parse(input.scheduledAt))) {
    issues.push({
      code: "invalid-scheduled-at",
      message: "Scheduled covering notes need a valid scheduledAt timestamp.",
    });
  }

  return issues;
}

export function planNoteWrite(
  publicationUrl: string,
  operation: NoteWriteOperation,
  text: string,
  options: { scheduledAt?: string | undefined; postUrl?: string | undefined } = {},
): NoteWritePlan {
  const endpoint = new URL("/comment/feed/", publicationUrl).toString();
  const requestBody = buildNoteRequestBody(text);
  if (operation === "schedule") {
    requestBody.scheduled_at = options.scheduledAt;
  }

  return {
    status: "planned",
    operation,
    method: "POST",
    endpoint,
    text,
    postUrl: options.postUrl,
    scheduledAt: options.scheduledAt,
    requestBody,
    message:
      operation === "schedule"
        ? `Note schedule plan built locally for ${options.scheduledAt}. Use --yes to execute.`
        : "Note create plan built locally. Use --yes to execute.",
  };
}

export async function executeNoteWrite(
  plan: NoteWritePlan,
  material: ApiAuthMaterial,
  fetchImpl: FetchLike,
): Promise<NoteWriteResult> {
  const response = await requestWrite(
    fetchImpl,
    plan.endpoint,
    "POST",
    apiHeaders(material),
    plan.requestBody,
  );

  if (response.status >= 400 || response.status === 0) {
    return {
      status: "failed",
      operation: plan.operation,
      method: "POST",
      endpoint: plan.endpoint,
      scheduledAt: plan.scheduledAt,
      message:
        response.status === 0
          ? "Network error: failed to reach Substack."
          : `Substack returned HTTP ${response.status}.`,
      error: response.status === 0 ? "Network error" : `HTTP ${response.status}`,
      retryAttempts: response.retryAttempts,
    };
  }

  const body = isRecord(response.body) ? response.body : {};
  const noteId = valueAsString(body.id);
  const publishedAt = valueAsString(body.date) ?? valueAsString(body.published_at);

  return {
    status: plan.operation === "schedule" ? "scheduled" : "created",
    operation: plan.operation,
    method: "POST",
    endpoint: plan.endpoint,
    noteId,
    publishedAt,
    scheduledAt: plan.scheduledAt,
    message:
      plan.operation === "schedule"
        ? `Note scheduled for ${plan.scheduledAt}.`
        : `Note published${noteId ? ` (ID: ${noteId})` : ""}.`,
    retryAttempts: response.retryAttempts,
  };
}

function parseNoteScheduleItem(
  item: unknown,
  index: number,
  sourceName: string,
): NoteScheduleFileItem {
  if (!isRecord(item)) {
    throw new Error(`${sourceName} item ${index + 1} must be an object.`);
  }

  return {
    text: stringField(item, "text", "body", "note"),
    textFile: stringField(item, "textFile", "text_file", "file"),
    postUrl: stringField(item, "postUrl", "post_url", "url"),
    scheduledAt: stringField(item, "scheduledAt", "scheduled_at", "scheduleAt", "at"),
    title: stringField(item, "title", "postTitle", "post_title"),
    status: stringField(item, "status", "state"),
  };
}

function buildNoteRequestBody(text: string): Record<string, unknown> {
  return {
    bodyJson: {
      type: "doc",
      attrs: { schemaVersion: "v1" },
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text }],
        },
      ],
    },
    tabId: "for-you",
    surface: "feed",
    replyMinimumRole: "everyone",
  };
}

function countSentences(text: string): number {
  const matches = text.match(/[^.!?]+[.!?]+(?:\s|$)|[^.!?]+$/g);
  return matches?.filter((sentence) => sentence.trim().length > 0).length ?? 0;
}

function stringField(record: Record<string, unknown>, ...names: string[]): string | undefined {
  for (const name of names) {
    const value = record[name];
    if (typeof value === "string" && value.trim().length > 0) return value.trim();
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
  }
  return undefined;
}

function valueAsString(value: unknown): string | undefined {
  if (typeof value === "string" && value.length > 0) return value;
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
