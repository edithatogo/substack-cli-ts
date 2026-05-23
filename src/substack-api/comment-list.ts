import type { ApiAuthMaterial } from "./auth.js";
import {
  type FetchLike,
  apiHeaders,
  classifyFailure,
  requestJson,
  requestWrite,
} from "./client.js";

export interface CommentListEntry {
  id: number;
  body: string;
  authorName: string;
  authorHandle: string;
  publishedAt: string;
  status: string;
  postId?: number | undefined;
}

export type CommentListStatus =
  | "ok"
  | "unauthenticated"
  | "forbidden"
  | "not-found"
  | "schema-drift"
  | "network-error";

export interface CommentListResult {
  status: CommentListStatus;
  comments?: CommentListEntry[] | undefined;
  message: string;
}

export interface CommentModerationResult {
  status: "ok" | "failed";
  action: string;
  commentId: number;
  message: string;
}

function parseCommentRecord(record: Record<string, unknown>): CommentListEntry | null {
  const id =
    typeof record.id === "number"
      ? record.id
      : typeof record.id === "string"
        ? Number(record.id)
        : Number.NaN;

  if (Number.isNaN(id)) {
    return null;
  }

  const body = typeof record.body === "string" ? record.body : "";
  const authorRecord = record.author as Record<string, unknown>;
  const authorName =
    typeof record.author_name === "string"
      ? record.author_name
      : typeof authorRecord.name === "string"
        ? authorRecord.name
        : typeof record.name === "string"
          ? record.name
          : "";
  const authorHandle =
    typeof record.author_handle === "string"
      ? record.author_handle
      : typeof authorRecord.handle === "string"
        ? authorRecord.handle
        : "";
  const publishedAt =
    typeof record.published_at === "string"
      ? record.published_at
      : typeof record.date === "string"
        ? record.date
        : "";
  const status = typeof record.status === "string" ? record.status : "";
  const postId =
    typeof record.post_id === "number"
      ? record.post_id
      : typeof record.post_id === "string"
        ? Number(record.post_id)
        : undefined;

  return { id, body, authorName, authorHandle, publishedAt, status, postId };
}

export async function fetchCommentsForPost(
  publicationUrl: string,
  postId: number,
  material: ApiAuthMaterial,
  fetchFn: FetchLike,
  options?: { limit?: number | undefined },
): Promise<CommentListResult> {
  const headers = apiHeaders(material);
  const url = new URL(`/api/v1/post/${postId}/comments`, publicationUrl).toString();

  const response = await requestJson(fetchFn, url, headers);

  if (response.status !== 200) {
    const failure = classifyFailure(response.status, url);
    return {
      status: failure.status,
      message: failure.message,
    };
  }

  const body = response.body;
  if (!Array.isArray(body)) {
    return {
      status: "schema-drift",
      message: "Comments response was not an array.",
    };
  }

  const comments: CommentListEntry[] = [];
  for (const item of body) {
    const record = item as Record<string, unknown>;
    const parsed = parseCommentRecord(record);
    if (parsed) {
      comments.push(parsed);
    }
  }

  if (options?.limit !== undefined && options.limit > 0) {
    comments.splice(options.limit);
  }

  return {
    status: "ok",
    comments,
    message: `Found ${comments.length} comments.`,
  };
}

export async function moderateComment(
  publicationUrl: string,
  commentId: number,
  action: "approve" | "delete" | "pin",
  material: ApiAuthMaterial,
  fetchFn: FetchLike,
): Promise<CommentModerationResult> {
  const headers = apiHeaders(material);
  const url = new URL(`/api/v1/comments/${commentId}/${action}`, publicationUrl).toString();

  const response = await requestWrite(fetchFn, url, "POST", headers, {});

  if (response.status === 0) {
    return {
      status: "failed",
      action,
      commentId,
      message: "The request failed before receiving a response from Substack.",
    };
  }

  if (response.status >= 400) {
    const failure = classifyFailure(response.status, url);
    return {
      status: "failed",
      action,
      commentId,
      message: failure.message,
    };
  }

  return {
    status: "ok",
    action,
    commentId,
    message: `Comment ${action} succeeded.`,
  };
}

export async function replyToComment(
  publicationUrl: string,
  commentId: number,
  body: string,
  material: ApiAuthMaterial,
  fetchFn: FetchLike,
): Promise<CommentModerationResult> {
  const headers = apiHeaders(material);
  const url = new URL(`/api/v1/comments/${commentId}/reply`, publicationUrl).toString();

  const response = await requestWrite(fetchFn, url, "POST", headers, { body });

  if (response.status === 0) {
    return {
      status: "failed",
      action: "reply",
      commentId,
      message: "The request failed before receiving a response from Substack.",
    };
  }

  if (response.status >= 400) {
    const failure = classifyFailure(response.status, url);
    return {
      status: "failed",
      action: "reply",
      commentId,
      message: failure.message,
    };
  }

  return {
    status: "ok",
    action: "reply",
    commentId,
    message: "Reply posted successfully.",
  };
}
