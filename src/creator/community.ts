import type { ApiAuthMaterial } from "../substack-api/auth.js";
import {
  apiHeaders,
  classifyFailure,
  type FetchLike,
  requestJson,
} from "../substack-api/client.js";
import type { CommentListEntry, CommentListResult } from "../substack-api/comment-list.js";

export interface CommunityInspectResult {
  status: "ok" | "not-found" | "unauthenticated" | "forbidden" | "schema-drift" | "network-error";
  surface: "recommendations" | "boost";
  endpoint?: string | undefined;
  body?: unknown;
  message: string;
}

export interface CommentTriageReport {
  status: CommentListResult["status"];
  postId: number;
  total: number;
  needsReply: CommentListEntry[];
  possibleTestimonials: CommentListEntry[];
  possibleModeration: CommentListEntry[];
  message: string;
}

export async function inspectCommunitySurface(
  publicationUrl: string,
  material: ApiAuthMaterial,
  fetchFn: FetchLike,
  surface: "recommendations" | "boost",
): Promise<CommunityInspectResult> {
  const endpoints =
    surface === "recommendations"
      ? ["/api/v1/publication/recommendations", "/api/v1/recommendations"]
      : ["/api/v1/publication/boost", "/api/v1/boost"];
  let headers: Record<string, string>;
  try {
    new URL(publicationUrl);
    headers = apiHeaders(material);
  } catch (error) {
    return {
      status: "network-error",
      surface,
      message: `Invalid publication URL for ${surface}: ${error instanceof Error ? error.message : String(error)}`,
    };
  }

  for (const path of endpoints) {
    try {
      const url = new URL(path, publicationUrl).toString();
      const response = await requestJson(fetchFn, url, headers);
      if (response.status === 200) {
        return {
          status: "ok",
          surface,
          endpoint: path,
          body: response.body,
          message: `${surface} surface retrieved from ${path}.`,
        };
      }
      if (response.status !== 404) {
        const failure = classifyFailure(response.status, url);
        return { status: failure.status, surface, endpoint: path, message: failure.message };
      }
    } catch (error) {
      return {
        status: "network-error",
        surface,
        endpoint: path,
        message: `Failed to inspect ${surface}: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  return {
    status: "not-found",
    surface,
    message: `${surface} appears to be dashboard-only for this session.`,
  };
}

export function buildCommentTriageReport(
  postId: number,
  result: CommentListResult,
): CommentTriageReport {
  const comments = result.comments ?? [];
  const needsReply = comments.filter((comment) => /\?|how|why|what|when|where/i.test(comment.body));
  const possibleTestimonials = comments.filter((comment) =>
    /\b(thanks|helpful|great|excellent|love|useful)\b/i.test(comment.body),
  );
  const possibleModeration = comments.filter(
    (comment) =>
      comment.status?.toLowerCase() === "pending" ||
      /\b(spam|scam|abuse|hate|offensive)\b/i.test(comment.body),
  );

  return {
    status: result.status,
    postId,
    total: comments.length,
    needsReply,
    possibleTestimonials,
    possibleModeration,
    message: result.status === "ok" ? `Triaged ${comments.length} comments.` : result.message,
  };
}
