import { z } from "zod";
import type { ApiAuthMaterial } from "./auth.js";
import {
  apiHeaders,
  classifyFailure,
  type FetchLike,
  requestJson,
} from "./client.js";

export interface SubscriberListEntry {
  email: string;
  type: string;
  source: string;
}

export type SubscriberListStatus =
  | "ok"
  | "unauthenticated"
  | "forbidden"
  | "not-found"
  | "schema-drift"
  | "network-error";

export interface SubscriberListResult {
  status: SubscriberListStatus;
  entries?: SubscriberListEntry[] | undefined;
  hasMore?: boolean | undefined;
  nextOffset?: number | undefined;
  message: string;
}

const SubscriberEntrySchema = z.object({
  email: z.string(),
  type: z.string(),
  source: z.string(),
});

const SubscriberListBodySchema = z.array(SubscriberEntrySchema);

export async function fetchSubscriberList(
  publicationUrl: string,
  material: ApiAuthMaterial,
  fetchFn: FetchLike,
  options?: { limit?: number | undefined; offset?: number | undefined },
): Promise<SubscriberListResult> {
  const headers = apiHeaders(material);
  const url = new URL("/api/v1/publication/subscribers", publicationUrl);
  if (options?.limit !== undefined) {
    url.searchParams.set("limit", String(options.limit));
  }
  if (options?.offset !== undefined) {
    url.searchParams.set("offset", String(options.offset));
  }
  const endpoint = url.toString();

  const response = await requestJson(fetchFn, endpoint, headers);

  if (response.status !== 200) {
    const failure = classifyFailure(response.status, endpoint);
    return {
      status: failure.status,
      message: failure.message,
    };
  }

  const parsed = SubscriberListBodySchema.safeParse(response.body);
  if (!parsed.success) {
    return {
      status: "schema-drift",
      message: "The subscribers response did not match the expected schema.",
    };
  }

  const entries: SubscriberListEntry[] = parsed.data.map((item) => ({
    email: item.email,
    type: item.type,
    source: item.source,
  }));

  const rawBody = response.body as Record<string, unknown> | undefined;
  const hasMore =
    typeof rawBody?.has_more === "boolean" ? rawBody.has_more : undefined;
  const nextOffset =
    typeof rawBody?.next_offset === "number"
      ? rawBody.next_offset
      : undefined;

  return {
    status: "ok",
    entries,
    hasMore,
    nextOffset,
    message: `Found ${entries.length} subscribers.`,
  };
}
