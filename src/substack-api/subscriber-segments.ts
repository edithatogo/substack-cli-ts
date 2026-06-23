import type { ApiAuthMaterial } from "./auth.js";
import { apiHeaders, classifyFailure, type FetchLike, requestJson } from "./client.js";

export type SegmentReadStatus =
  | "ok"
  | "unauthenticated"
  | "forbidden"
  | "not-found"
  | "schema-drift"
  | "network-error";

export interface SubscriberSegment {
  id: string;
  name: string;
  description: string | null;
  subscriberCount: number | null;
  createdAt: string | null;
  isDynamic: boolean;
}

export interface SubscriberSegmentListResult {
  status: SegmentReadStatus;
  segments?: SubscriberSegment[] | undefined;
  message: string;
}

/**
 * List subscriber segments/groups through known API endpoints.
 * Substack segments are likely dashboard-only filtered views,
 * not API-addressable resources. This probe attempts known paths
 * and gracefully reports not-found.
 */
export async function fetchSubscriberSegments(
  publicationUrl: string,
  material: ApiAuthMaterial,
  fetchFn: FetchLike,
): Promise<SubscriberSegmentListResult> {
  const headers = apiHeaders(material);
  const endpoints = [
    "/api/v1/publication/subscribers/segments",
    "/api/v1/publication/segments",
    "/api/v1/segments",
    "/api/v1/publication/subscriber_groups",
  ];

  for (const path of endpoints) {
    const url = new URL(path, publicationUrl).toString();
    const response = await requestJson(fetchFn, url, headers);
    if (response.status === 200) {
      const segments = parseSegments(response.body);
      if (segments) {
        return {
          status: "ok",
          segments,
          message: `Subscriber segments retrieved from ${path}.`,
        };
      }
    }
    if (response.status !== 404) {
      const failure = classifyFailure(response.status, url);
      return { status: failure.status, message: failure.message };
    }
  }

  return {
    status: "not-found",
    message:
      "No subscriber segments endpoint found. Segments/groups may be dashboard-only filtered views, not API-addressable resources.",
  };
}

function parseSegments(body: unknown): SubscriberSegment[] | null {
  const items = Array.isArray(body)
    ? body
    : body && typeof body === "object" && Array.isArray((body as Record<string, unknown>).segments)
      ? ((body as Record<string, unknown>).segments as unknown[])
      : body && typeof body === "object" && Array.isArray((body as Record<string, unknown>).groups)
        ? ((body as Record<string, unknown>).groups as unknown[])
        : body && typeof body === "object" && Array.isArray((body as Record<string, unknown>).data)
          ? ((body as Record<string, unknown>).data as unknown[])
          : null;

  if (!items) return null;

  const segments: SubscriberSegment[] = [];
  for (const item of items) {
    const record = item as Record<string, unknown>;
    const id =
      typeof record.id === "string"
        ? record.id
        : typeof record.id === "number"
          ? String(record.id)
          : "";
    const name =
      typeof record.name === "string"
        ? record.name
        : typeof record.title === "string"
          ? record.title
          : typeof record.label === "string"
            ? record.label
            : "";
    const description = typeof record.description === "string" ? record.description : null;
    const subscriberCount =
      typeof record.subscriber_count === "number"
        ? record.subscriber_count
        : typeof record.count === "number"
          ? record.count
          : typeof record.member_count === "number"
            ? record.member_count
            : null;
    const createdAt =
      typeof record.created_at === "string"
        ? record.created_at
        : typeof record.createdAt === "string"
          ? record.createdAt
          : null;
    const isDynamic =
      typeof record.is_dynamic === "boolean"
        ? record.is_dynamic
        : typeof record.dynamic === "boolean"
          ? record.dynamic
          : false;

    if (id || name) {
      segments.push({ id, name, description, subscriberCount, createdAt, isDynamic });
    }
  }

  return segments;
}
