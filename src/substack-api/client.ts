import type { ApiAuthMaterial } from "./auth.js";

export type ApiReadStatus =
  | "ok"
  | "unauthenticated"
  | "forbidden"
  | "not-found"
  | "schema-drift"
  | "network-error";

export interface ApiFailure {
  status: Exclude<ApiReadStatus, "ok">;
  endpoint: string;
  message: string;
}

export type FetchLike = (
  input: string,
  init?: {
    headers?: Record<string, string>;
  },
) => Promise<Pick<Response, "status" | "text">>;

export function apiHeaders(material: ApiAuthMaterial): Record<string, string> {
  const publicationUrl = new URL(material.publicationUrl);

  return {
    accept: "application/json",
    cookie: material.cookieHeader,
    referer: material.publicationUrl,
    origin: publicationUrl.origin,
    "user-agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome Safari/537.36",
  };
}

export async function requestJson(
  fetchImpl: FetchLike,
  url: string,
  headers: Record<string, string>,
): Promise<{ status: number; body: unknown }> {
  try {
    const response = await fetchImpl(url, { headers });
    const text = await response.text();

    try {
      return { status: response.status, body: JSON.parse(text) as unknown };
    } catch {
      return { status: response.status, body: null };
    }
  } catch {
    return { status: 0, body: null };
  }
}

export function classifyFailure(status: number, endpoint: string): ApiFailure {
  if (status === 401) {
    return {
      status: "unauthenticated",
      endpoint,
      message: "Substack rejected the session as unauthenticated.",
    };
  }

  if (status === 403) {
    return {
      status: "forbidden",
      endpoint,
      message: "Substack rejected the session with a forbidden response.",
    };
  }

  if (status === 404) {
    return {
      status: "not-found",
      endpoint,
      message: "The expected read-only endpoint was not found.",
    };
  }

  if (status === 0) {
    return {
      status: "network-error",
      endpoint,
      message:
        "The read-only request failed before receiving a response from Substack.",
    };
  }

  return {
    status: "schema-drift",
    endpoint,
    message: `Unexpected response status: ${status}.`,
  };
}
