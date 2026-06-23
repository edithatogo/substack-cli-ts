import type { ApiAuthMaterial } from "./auth.js";
import {
  apiHeaders,
  classifyFailure,
  type FetchLike,
  requestJson,
  requestWrite,
} from "./client.js";
import { createSubstackClient } from "./substack-adapter.js";

// ── Types ────────────────────────────────────────────────────────────────

export type CommentReadStatus =
  | "ok"
  | "unauthenticated"
  | "forbidden"
  | "not-found"
  | "schema-drift"
  | "network-error";

export type CommentWriteStatus =
  | "ok"
  | "unauthenticated"
  | "forbidden"
  | "not-found"
  | "schema-drift"
  | "network-error";

export interface CommentAuthor {
  id: number;
  name: string;
  handle: string;
  avatarUrl: string;
}

export interface CommentEntry {
  id: number;
  body: string;
  author: CommentAuthor | null;
  isAdmin: boolean;
  isPinned: boolean;
  isDeleted: boolean;
  status: string;
  parentId: number | null;
  childCount: number;
  createdAt: string | null;
  likesCount: number;
}

export interface CommentListResult {
  status: CommentReadStatus;
  comments?: CommentEntry[] | undefined;
  hasMore?: boolean | undefined;
  nextCursor?: string | undefined;
  totalCount?: number | undefined;
  message: string;
}

export interface CommentActionResult {
  status: CommentWriteStatus;
  commentId: number;
  action: string;
  message: string;
}

export interface CommentReplyResult {
  status: CommentWriteStatus;
  replyId?: number | undefined;
  message: string;
}

export interface CommentSettings {
  commentingEnabled: boolean;
  mustBePaidSubscriber: boolean;
  mustBeSubscriber: boolean;
  holdForReview: boolean;
  autoApproveRepeatedCommenters: boolean;
}

export interface CommentSettingsResult {
  status: CommentReadStatus;
  settings?: CommentSettings | undefined;
  message: string;
}

export interface CommentSettingsUpdate {
  commentingEnabled?: boolean | undefined;
  mustBePaidSubscriber?: boolean | undefined;
  mustBeSubscriber?: boolean | undefined;
  holdForReview?: boolean | undefined;
  autoApproveRepeatedCommenters?: boolean | undefined;
}

export interface CommentSettingsWriteResult {
  status: CommentWriteStatus;
  settings?: CommentSettings | undefined;
  message: string;
}

export interface CommenterActionResult {
  status: CommentWriteStatus;
  userId: number;
  action: string;
  message: string;
}

// ── Fetch Comments ───────────────────────────────────────────────────────

/**
 * Fetch comments for a post from GET /api/v1/post/{postId}/comments.
 * Supports optional status filtering (e.g. "held") and pagination via cursor.
 */
export async function fetchCommentsForPost(
  publicationUrl: string,
  postId: number,
  material: ApiAuthMaterial,
  fetchFn: FetchLike,
  options?: {
    limit?: number | undefined;
    status?: string | undefined;
    cursor?: string | undefined;
  },
): Promise<CommentListResult> {
  const headers = apiHeaders(material);
  const url = new URL(`/api/v1/post/${postId}/comments`, publicationUrl);
  if (options?.limit !== undefined) {
    url.searchParams.set("limit", String(options.limit));
  }
  if (options?.status !== undefined) {
    url.searchParams.set("status", options.status);
  }
  if (options?.cursor !== undefined) {
    url.searchParams.set("cursor", options.cursor);
  }

  const endpoint = url.toString();
  const response = await requestJson(fetchFn, endpoint, headers);

  if (response.status !== 200) {
    const failure = classifyFailure(response.status, endpoint);
    return { status: failure.status, message: failure.message };
  }

  const body = response.body;
  const comments = parseCommentList(body);
  if (!comments) {
    return {
      status: "schema-drift",
      message: "The comments response did not match the expected shape.",
    };
  }

  const rawBody = body as Record<string, unknown> | undefined;
  const hasMore = typeof rawBody?.has_more === "boolean" ? rawBody.has_more : undefined;
  const nextCursor = typeof rawBody?.next_cursor === "string" ? rawBody.next_cursor : undefined;
  const totalCount =
    typeof rawBody?.total_count === "number"
      ? rawBody.total_count
      : typeof rawBody?.count === "number"
        ? rawBody.count
        : undefined;

  return {
    status: "ok",
    comments,
    hasMore,
    nextCursor,
    totalCount,
    message: `Found ${comments.length} comments.`,
  };
}

// ── Moderate Comment ─────────────────────────────────────────────────────

/**
 * Moderate a comment via POST /api/v1/comments/{id}/{action}.
 * Supported actions: "approve", "delete", "pin", "unpin".
 */
export async function moderateComment(
  publicationUrl: string,
  commentId: number,
  action: "approve" | "delete" | "pin" | "unpin",
  material: ApiAuthMaterial,
  fetchFn: FetchLike,
): Promise<CommentActionResult> {
  const headers = apiHeaders(material);
  const endpoint = new URL(`/api/v1/comments/${commentId}/${action}`, publicationUrl).toString();

  const response = await requestWrite(fetchFn, endpoint, "POST", headers, {});
  if (response.status === 200) {
    return {
      status: "ok",
      commentId,
      action,
      message: `Comment ${commentId} ${action}d successfully.`,
    };
  }
  if (response.status === 404) {
    return {
      status: "not-found",
      commentId,
      action,
      message: `Comment ${commentId} not found.`,
    };
  }
  const failure = classifyFailure(response.status, endpoint);
  return {
    status: failure.status,
    commentId,
    action,
    message: failure.message,
  };
}

// ── Reply To Comment ─────────────────────────────────────────────────────

/**
 * Reply to a comment via POST /api/v1/comments/{id}/reply.
 */
export async function replyToComment(
  publicationUrl: string,
  commentId: number,
  body: string,
  material: ApiAuthMaterial,
  fetchFn: FetchLike,
): Promise<CommentReplyResult> {
  const headers = apiHeaders(material);
  const endpoint = new URL(`/api/v1/comments/${commentId}/reply`, publicationUrl).toString();

  const response = await requestWrite(fetchFn, endpoint, "POST", headers, {
    body,
  });
  if (response.status === 200) {
    const record = response.body as Record<string, unknown> | undefined;
    const replyId =
      typeof record?.id === "number"
        ? record.id
        : typeof record?.id === "string"
          ? Number(record.id)
          : undefined;
    return {
      status: "ok",
      replyId,
      message: `Reply to comment ${commentId} posted successfully.`,
    };
  }
  if (response.status === 404) {
    return {
      status: "not-found",
      message: `Comment ${commentId} not found.`,
    };
  }
  const failure = classifyFailure(response.status, endpoint);
  return { status: failure.status, message: failure.message };
}

// ── Commenter Management ─────────────────────────────────────────────────

/**
 * Mute a commenter.
 * Uses probe patterns since the exact endpoint is not confirmed.
 */
export async function muteCommenter(
  publicationUrl: string,
  userId: number,
  material: ApiAuthMaterial,
  fetchFn: FetchLike,
): Promise<CommenterActionResult> {
  const headers = apiHeaders(material);
  const endpoints = [
    `/api/v1/publication/users/${userId}/mute`,
    `/api/v1/comments/user/${userId}/mute`,
    `/api/v1/users/${userId}/mute`,
  ];

  for (const path of endpoints) {
    const url = new URL(path, publicationUrl).toString();
    const response = await requestWrite(fetchFn, url, "POST", headers, {});
    if (response.status === 200) {
      return {
        status: "ok",
        userId,
        action: "mute",
        message: `User ${userId} muted successfully.`,
      };
    }
    if (response.status === 404) {
      continue;
    }
    const failure = classifyFailure(response.status, url);
    return {
      status: failure.status,
      userId,
      action: "mute",
      message: failure.message,
    };
  }

  return {
    status: "not-found",
    userId,
    action: "mute",
    message: "No mute endpoint found. Commenter management may be dashboard-only.",
  };
}

/**
 * Ban a commenter.
 * Uses probe patterns since the exact endpoint is not confirmed.
 */
export async function banCommenter(
  publicationUrl: string,
  userId: number,
  material: ApiAuthMaterial,
  fetchFn: FetchLike,
): Promise<CommenterActionResult> {
  const headers = apiHeaders(material);
  const endpoints = [
    `/api/v1/publication/users/${userId}/ban`,
    `/api/v1/comments/user/${userId}/ban`,
    `/api/v1/users/${userId}/ban`,
  ];

  for (const path of endpoints) {
    const url = new URL(path, publicationUrl).toString();
    const response = await requestWrite(fetchFn, url, "POST", headers, {});
    if (response.status === 200) {
      return {
        status: "ok",
        userId,
        action: "ban",
        message: `User ${userId} banned successfully.`,
      };
    }
    if (response.status === 404) {
      continue;
    }
    const failure = classifyFailure(response.status, url);
    return {
      status: failure.status,
      userId,
      action: "ban",
      message: failure.message,
    };
  }

  return {
    status: "not-found",
    userId,
    action: "ban",
    message: "No ban endpoint found. Commenter management may be dashboard-only.",
  };
}

// ── Get a Single Comment via vendored substack-api ───────────────────────

// ── Parsers ──────────────────────────────────────────────────────────────

function parseCommentList(body: unknown): CommentEntry[] | null {
  let items: unknown[] | null = null;

  if (Array.isArray(body)) {
    items = body;
  } else if (
    body &&
    typeof body === "object" &&
    Array.isArray((body as Record<string, unknown>).comments)
  ) {
    items = (body as Record<string, unknown>).comments as unknown[];
  } else if (
    body &&
    typeof body === "object" &&
    Array.isArray((body as Record<string, unknown>).data)
  ) {
    items = (body as Record<string, unknown>).data as unknown[];
  }

  if (!items) return null;

  const comments: CommentEntry[] = [];
  for (const item of items) {
    const record = item as Record<string, unknown>;
    const id =
      typeof record.id === "number"
        ? record.id
        : typeof record.id === "string"
          ? Number(record.id)
          : 0;
    if (!id) continue;

    const body = typeof record.body === "string" ? record.body : "";
    const isAdmin =
      typeof record.author_is_admin === "boolean"
        ? record.author_is_admin
        : typeof record.is_admin === "boolean"
          ? record.is_admin
          : false;
    const isPinned =
      typeof record.is_pinned === "boolean"
        ? record.is_pinned
        : typeof record.pinned === "boolean"
          ? record.pinned
          : false;
    const isDeleted =
      typeof record.is_deleted === "boolean"
        ? record.is_deleted
        : typeof record.deleted === "boolean"
          ? record.deleted
          : false;
    const status =
      typeof record.status === "string"
        ? record.status
        : typeof record.approval_status === "string"
          ? record.approval_status
          : "approved";
    const parentId =
      typeof record.parent_id === "number"
        ? record.parent_id
        : typeof record.parentId === "number"
          ? record.parentId
          : null;
    const childCount =
      typeof record.child_count === "number"
        ? record.child_count
        : typeof record.reply_count === "number"
          ? record.reply_count
          : 0;
    const createdAt =
      typeof record.created_at === "string"
        ? record.created_at
        : typeof record.createdAt === "string"
          ? record.createdAt
          : typeof record.date === "string"
            ? record.date
            : null;
    const likesCount =
      typeof record.likes_count === "number"
        ? record.likes_count
        : typeof record.likesCount === "number"
          ? record.likesCount
          : typeof record.reaction_count === "number"
            ? record.reaction_count
            : 0;

    let author: CommentAuthor | null = null;
    const authorRecord = record.author as Record<string, unknown> | undefined;
    if (authorRecord && typeof authorRecord === "object") {
      const authorId =
        typeof authorRecord.id === "number"
          ? authorRecord.id
          : typeof authorRecord.id === "string"
            ? Number(authorRecord.id)
            : 0;
      if (authorId) {
        author = {
          id: authorId,
          name:
            typeof authorRecord.name === "string"
              ? authorRecord.name
              : typeof authorRecord.display_name === "string"
                ? authorRecord.display_name
                : "",
          handle:
            typeof authorRecord.handle === "string"
              ? authorRecord.handle
              : typeof authorRecord.username === "string"
                ? authorRecord.username
                : "",
          avatarUrl:
            typeof authorRecord.photo_url === "string"
              ? authorRecord.photo_url
              : typeof authorRecord.avatar_url === "string"
                ? authorRecord.avatar_url
                : typeof authorRecord.avatarUrl === "string"
                  ? authorRecord.avatarUrl
                  : "",
        };
      }
    }

    // Also support flat author fields
    if (!author && typeof record.author_name === "string") {
      author = {
        id:
          typeof record.author_id === "number"
            ? record.author_id
            : typeof record.user_id === "number"
              ? record.user_id
              : 0,
        name: record.author_name as string,
        handle: typeof record.author_handle === "string" ? (record.author_handle as string) : "",
        avatarUrl:
          typeof record.author_photo_url === "string" ? (record.author_photo_url as string) : "",
      };
    }

    comments.push({
      id,
      body,
      author: author && author.id ? author : null,
      isAdmin,
      isPinned,
      isDeleted,
      status,
      parentId,
      childCount,
      createdAt,
      likesCount,
    });
  }

  return comments.length > 0 ? comments : null;
}

export interface CommentDetail {
  id: number;
  body: string;
  isAdmin: boolean;
}

/**
 * Fetch a single comment by ID using the vendored substack-api client.
 */
export async function getCommentById(
  material: ApiAuthMaterial,
  commentId: number,
): Promise<CommentDetail> {
  const client = createSubstackClient(material);
  const comment = await client.commentForId(commentId);
  return {
    id: comment.id,
    body: comment.body,
    isAdmin: comment.isAdmin ?? false,
  };
}

function parseCommentSettings(body: Record<string, unknown>): CommentSettings | null {
  const commentingEnabled =
    typeof body.commenting_enabled === "boolean"
      ? body.commenting_enabled
      : typeof body.comments_enabled === "boolean"
        ? body.comments_enabled
        : typeof body.disable_comments === "boolean"
          ? !body.disable_comments
          : true;
  const mustBePaidSubscriber =
    typeof body.must_be_paid_subscriber === "boolean"
      ? body.must_be_paid_subscriber
      : typeof body.paid_only === "boolean"
        ? body.paid_only
        : false;
  const mustBeSubscriber =
    typeof body.must_be_subscriber === "boolean"
      ? body.must_be_subscriber
      : typeof body.subscriber_only === "boolean"
        ? body.subscriber_only
        : false;
  const holdForReview =
    typeof body.hold_for_review === "boolean"
      ? body.hold_for_review
      : typeof body.hold_all === "boolean"
        ? body.hold_all
        : !!(typeof body.moderation === "string" && body.moderation === "hold");
  const autoApproveRepeatedCommenters =
    typeof body.auto_approve_repeated_commenters === "boolean"
      ? body.auto_approve_repeated_commenters
      : typeof body.auto_approve === "boolean"
        ? body.auto_approve
        : false;

  return {
    commentingEnabled,
    mustBePaidSubscriber,
    mustBeSubscriber,
    holdForReview,
    autoApproveRepeatedCommenters,
  };
}

export async function fetchCommentSettings(
  publicationUrl: string,
  postId: number,
  material: ApiAuthMaterial,
  fetchFn: FetchLike,
): Promise<CommentSettingsResult> {
  const headers = apiHeaders(material);
  const endpoints = [
    `/api/v1/post/${postId}/comment_settings`,
    `/api/v1/posts/${postId}/settings`,
    `/api/v1/drafts/${postId}/comments`,
  ];

  for (const path of endpoints) {
    const url = new URL(path, publicationUrl).toString();
    const response = await requestJson(fetchFn, url, headers);
    if (response.status === 200) {
      const body = response.body as Record<string, unknown> | undefined;
      if (body) {
        const settings = parseCommentSettings(body);
        if (settings) {
          return {
            status: "ok",
            settings,
            message: `Comment settings retrieved from ${path}.`,
          };
        }
      }
    }
    if (response.status !== 404) {
      const failure = classifyFailure(response.status, url);
      return { status: failure.status, message: failure.message };
    }
  }

  return {
    status: "not-found",
    message: "No comment settings endpoint found. Comment settings may be dashboard-only.",
  };
}

export async function updateCommentSettings(
  publicationUrl: string,
  postId: number,
  updates: CommentSettingsUpdate,
  material: ApiAuthMaterial,
  fetchFn: FetchLike,
): Promise<CommentSettingsWriteResult> {
  const headers = apiHeaders(material);
  const body = mapCommentSettingsUpdate(updates);
  const endpoints = [
    `/api/v1/post/${postId}/comment_settings`,
    `/api/v1/posts/${postId}/settings`,
    `/api/v1/drafts/${postId}/comments`,
  ];

  for (const path of endpoints) {
    const url = new URL(path, publicationUrl).toString();
    const response = await requestWrite(fetchFn, url, "PUT", headers, body);
    if (response.status === 200 || response.status === 204) {
      const record = response.body as Record<string, unknown> | undefined;
      return {
        status: "ok",
        settings: record ? (parseCommentSettings(record) ?? undefined) : undefined,
        message: `Comment settings updated via ${path}.`,
      };
    }
    if (response.status !== 404) {
      const failure = classifyFailure(response.status, url);
      return { status: failure.status, message: failure.message };
    }
  }

  return {
    status: "not-found",
    message: "No writable comment settings endpoint found. Comment settings may be dashboard-only.",
  };
}

function mapCommentSettingsUpdate(updates: CommentSettingsUpdate): Record<string, unknown> {
  const body: Record<string, unknown> = {};
  if (updates.commentingEnabled !== undefined) {
    body.commenting_enabled = updates.commentingEnabled;
  }
  if (updates.mustBePaidSubscriber !== undefined) {
    body.must_be_paid_subscriber = updates.mustBePaidSubscriber;
  }
  if (updates.mustBeSubscriber !== undefined) {
    body.must_be_subscriber = updates.mustBeSubscriber;
  }
  if (updates.holdForReview !== undefined) {
    body.hold_for_review = updates.holdForReview;
  }
  if (updates.autoApproveRepeatedCommenters !== undefined) {
    body.auto_approve_repeated_commenters = updates.autoApproveRepeatedCommenters;
  }
  return body;
}
