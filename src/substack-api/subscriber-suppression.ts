import type { ApiAuthMaterial } from "./auth.js";
import {
  apiHeaders,
  classifyFailure,
  type FetchLike,
  requestJson,
  requestWrite,
} from "./client.js";

export type SuppressionReadStatus =
  | "ok"
  | "unauthenticated"
  | "forbidden"
  | "not-found"
  | "schema-drift"
  | "network-error";

export interface SuppressionEntry {
  email: string;
  reason: string;
  suppressedAt: string | null;
}

export interface SuppressionListResult {
  status: SuppressionReadStatus;
  entries?: SuppressionEntry[] | undefined;
  message: string;
}

export interface SuppressResult {
  status: "ok" | "failed";
  email: string;
  message: string;
}

/**
 * List suppression entries (bounces, unsubscribes, spam complaints)
 * through known API endpoints.
 */
export async function fetchSuppressionList(
  publicationUrl: string,
  material: ApiAuthMaterial,
  fetchFn: FetchLike,
): Promise<SuppressionListResult> {
  const headers = apiHeaders(material);
  const endpoints = [
    "/api/v1/publication/suppressions",
    "/api/v1/publication/suppression_list",
    "/api/v1/publication/bounces",
    "/api/v1/suppressions",
    "/api/v1/publication/email_suppressions",
  ];

  for (const path of endpoints) {
    const url = new URL(path, publicationUrl).toString();
    const response = await requestJson(fetchFn, url, headers);
    if (response.status === 200) {
      const entries = parseSuppressions(response.body);
      if (entries) {
        return {
          status: "ok",
          entries,
          message: `Suppression list retrieved from ${path}.`,
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
    message: "No suppression list endpoint found. Suppression management may be dashboard-only.",
  };
}

/**
 * Add an email to the suppression list through known API endpoints.
 */
export async function suppressEmail(
  publicationUrl: string,
  email: string,
  material: ApiAuthMaterial,
  fetchFn: FetchLike,
): Promise<SuppressResult> {
  const headers = apiHeaders(material);
  const endpoints = [
    "/api/v1/publication/suppressions",
    "/api/v1/publication/suppression_list",
    "/api/v1/publication/bounces",
    "/api/v1/suppressions",
  ];

  for (const path of endpoints) {
    const url = new URL(path, publicationUrl).toString();
    const response = await requestWrite(fetchFn, url, "POST", headers, {
      email,
    });
    if (response.status === 200 || response.status === 201) {
      return {
        status: "ok",
        email,
        message: `Email ${email} added to suppression list via ${path}.`,
      };
    }
    if (response.status === 404) {
      continue;
    }
    const failure = classifyFailure(response.status, url);
    return {
      status: "failed",
      email,
      message: failure.message,
    };
  }

  return {
    status: "failed",
    email,
    message: "No suppression add endpoint found. Suppression management may be dashboard-only.",
  };
}

function parseSuppressions(body: unknown): SuppressionEntry[] | null {
  const items = Array.isArray(body)
    ? body
    : body &&
        typeof body === "object" &&
        Array.isArray((body as Record<string, unknown>).suppressions)
      ? ((body as Record<string, unknown>).suppressions as unknown[])
      : body && typeof body === "object" && Array.isArray((body as Record<string, unknown>).data)
        ? ((body as Record<string, unknown>).data as unknown[])
        : null;

  if (!items) return null;

  const entries: SuppressionEntry[] = [];
  for (const item of items) {
    const record = item as Record<string, unknown>;
    const email =
      typeof record.email === "string"
        ? record.email
        : typeof record.address === "string"
          ? record.address
          : "";
    const reason =
      typeof record.reason === "string"
        ? record.reason
        : typeof record.type === "string"
          ? record.type
          : typeof record.status === "string"
            ? record.status
            : "unknown";
    const suppressedAt =
      typeof record.suppressed_at === "string"
        ? record.suppressed_at
        : typeof record.created_at === "string"
          ? record.created_at
          : typeof record.date === "string"
            ? record.date
            : null;

    if (email) {
      entries.push({ email, reason, suppressedAt });
    }
  }

  return entries.length > 0 ? entries : null;
}
