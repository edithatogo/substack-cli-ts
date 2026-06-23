import type { ApiAuthMaterial } from "./auth.js";
import { type FetchLike, apiHeaders, classifyFailure, requestJson } from "./client.js";

export type GiftReadStatus =
  | "ok"
  | "unauthenticated"
  | "forbidden"
  | "not-found"
  | "schema-drift"
  | "network-error";

export interface GiftSubscription {
  id: string;
  gifterName: string;
  gifterEmail: string;
  recipientEmail: string;
  tier: string;
  status: string;
  createdAt: string | null;
  expiresAt: string | null;
  isActive: boolean;
}

export interface GiftListResult {
  status: GiftReadStatus;
  gifts?: GiftSubscription[] | undefined;
  message: string;
}

/**
 * List gift subscriptions through known API endpoints.
 * Gift subscriptions are likely dashboard-only, but this probe
 * attempts known paths and gracefully reports not-found.
 */
export async function fetchGiftSubscriptions(
  publicationUrl: string,
  material: ApiAuthMaterial,
  fetchFn: FetchLike,
): Promise<GiftListResult> {
  const headers = apiHeaders(material);
  const endpoints = [
    "/api/v1/publication/gifts",
    "/api/v1/publication/gift_subscriptions",
    "/api/v1/gifts",
    "/api/v1/publication/subscribers/gifts",
  ];

  for (const path of endpoints) {
    const url = new URL(path, publicationUrl).toString();
    const response = await requestJson(fetchFn, url, headers);
    if (response.status === 200) {
      const gifts = parseGifts(response.body);
      if (gifts) {
        return {
          status: "ok",
          gifts,
          message: `Gift subscriptions retrieved from ${path}.`,
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
      "No gift subscriptions endpoint found. Gift subscription management may be dashboard-only.",
  };
}

function parseGifts(body: unknown): GiftSubscription[] | null {
  const items = Array.isArray(body)
    ? body
    : body && typeof body === "object" && Array.isArray((body as Record<string, unknown>).gifts)
      ? ((body as Record<string, unknown>).gifts as unknown[])
      : body && typeof body === "object" && Array.isArray((body as Record<string, unknown>).data)
        ? ((body as Record<string, unknown>).data as unknown[])
        : null;

  if (!items) return null;

  const gifts: GiftSubscription[] = [];
  for (const item of items) {
    const record = item as Record<string, unknown>;
    const id =
      typeof record.id === "string"
        ? record.id
        : typeof record.id === "number"
          ? String(record.id)
          : "";
    const gifterName =
      typeof record.gifter_name === "string"
        ? record.gifter_name
        : typeof record.gifterName === "string"
          ? record.gifterName
          : typeof record.from_name === "string"
            ? record.from_name
            : "";
    const gifterEmail =
      typeof record.gifter_email === "string"
        ? record.gifter_email
        : typeof record.gifterEmail === "string"
          ? record.gifterEmail
          : typeof record.from_email === "string"
            ? record.from_email
            : "";
    const recipientEmail =
      typeof record.recipient_email === "string"
        ? record.recipient_email
        : typeof record.recipientEmail === "string"
          ? record.recipientEmail
          : typeof record.to_email === "string"
            ? record.to_email
            : "";
    const tier =
      typeof record.tier === "string"
        ? record.tier
        : typeof record.type === "string"
          ? record.type
          : "unknown";
    const status = typeof record.status === "string" ? record.status : "unknown";
    const createdAt =
      typeof record.created_at === "string"
        ? record.created_at
        : typeof record.createdAt === "string"
          ? record.createdAt
          : null;
    const expiresAt =
      typeof record.expires_at === "string"
        ? record.expires_at
        : typeof record.expiresAt === "string"
          ? record.expiresAt
          : typeof record.expiration_date === "string"
            ? record.expiration_date
            : null;
    const isActive =
      typeof record.is_active === "boolean"
        ? record.is_active
        : typeof record.active === "boolean"
          ? record.active
          : status === "active";

    if (id || recipientEmail) {
      gifts.push({
        id,
        gifterName,
        gifterEmail,
        recipientEmail,
        tier,
        status,
        createdAt,
        expiresAt,
        isActive,
      });
    }
  }

  return gifts;
}
