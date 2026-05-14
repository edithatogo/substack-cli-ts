import { readFile } from "node:fs/promises";
import type { ApiAuthMaterial } from "./auth.js";
import { RateLimiter } from "./rate-limit.js";
import type { RetryOptions } from "./retry.js";
import { withRetry } from "./retry.js";

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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type FetchInit = Record<string, any>;

export type FetchLike = (
  input: string,
  init?: FetchInit,
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

export function wrapFetch(
  fetchImpl: FetchLike,
  limiter: RateLimiter,
  retryOptions?: RetryOptions,
): FetchLike {
  return async (input, init) =>
    withRetry(async () => {
      await limiter.acquire();
      const response = await fetchImpl(input, init);
      if (response.status === 429 || response.status >= 500) {
        throw new Error(`HTTP ${response.status}`);
      }
      return response;
    }, retryOptions);
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
      message: "The read-only request failed before receiving a response from Substack.",
    };
  }

  return {
    status: "schema-drift",
    endpoint,
    message: `Unexpected response status: ${status}.`,
  };
}

export interface WriteResponse {
  status: number;
  body: unknown;
  draftId?: number | undefined;
  draftUrl?: string | undefined;
}

export async function requestDelete(
  fetchImpl: FetchLike,
  url: string,
  headers: Record<string, string>,
): Promise<{ status: number; body: unknown }> {
  try {
    const response = await fetchImpl(url, {
      method: "DELETE",
      headers,
    });
    const text = await response.text();
    try {
      return { status: response.status, body: JSON.parse(text) };
    } catch {
      return { status: response.status, body: null };
    }
  } catch {
    return { status: 0, body: null };
  }
}

export async function requestWrite(
  fetchImpl: FetchLike,
  url: string,
  method: "POST" | "PUT",
  headers: Record<string, string>,
  body: Record<string, unknown>,
): Promise<WriteResponse> {
  try {
    const response = await fetchImpl(url, {
      method,
      headers: { ...headers, "content-type": "application/json" },
      body: JSON.stringify(body),
    });

    const text = await response.text();
    let parsed: unknown;

    try {
      parsed = JSON.parse(text);
    } catch {
      return { status: response.status, body: null };
    }

    const record = parsed as Record<string, unknown> | undefined;
    const draftId =
      typeof record?.id === "number"
        ? record.id
        : typeof record?.id === "string"
          ? Number(record.id)
          : undefined;
    const draftUrl =
      typeof record?.draft_url === "string"
        ? record.draft_url
        : typeof record?.url === "string"
          ? record.url
          : undefined;

    return { status: response.status, body: parsed, draftId, draftUrl };
  } catch {
    return { status: 0, body: null };
  }
}

export interface UploadImageResult {
  status: "ok" | "failed";
  url?: string | undefined;
  error?: string | undefined;
}

function extractUploadUrl(
  parsed: Record<string, unknown>,
  preferredField?: string,
): string | undefined {
  if (preferredField) {
    const value = parsed[preferredField];
    if (typeof value === "string" && value.length > 0) {
      return value;
    }
  }

  return typeof parsed.url === "string"
    ? parsed.url
    : typeof parsed.data === "string"
      ? parsed.data
      : typeof parsed.image_url === "string"
        ? parsed.image_url
        : undefined;
}

function mimeTypeForExt(ext: string): string {
  if (ext.endsWith(".png")) return "image/png";
  if (ext.endsWith(".jpg") || ext.endsWith(".jpeg")) return "image/jpeg";
  if (ext.endsWith(".gif")) return "image/gif";
  if (ext.endsWith(".webp")) return "image/webp";
  if (ext.endsWith(".svg")) return "image/svg+xml";
  return "application/octet-stream";
}

export async function uploadImage(
  fetchImpl: FetchLike,
  uploadUrl: string,
  imagePath: string,
  headers: Record<string, string>,
  responseUrlField?: string,
): Promise<UploadImageResult> {
  try {
    const buffer = await readFile(imagePath);
    const ext = imagePath.split(/[/\\]/).pop() ?? "image.png";
    const mimeType = mimeTypeForExt(ext);
    const base64 = buffer.toString("base64");
    const dataUrl = `data:${mimeType};base64,${base64}`;

    const response = await fetchImpl(uploadUrl, {
      method: "POST",
      headers: {
        ...headers,
        "content-type": "application/json",
      },
      body: JSON.stringify({ image: dataUrl }),
    });

    const text = await response.text();

    if (response.status >= 400) {
      return {
        status: "failed",
        error: `Upload failed with HTTP ${response.status}: ${text.substring(0, 200)}`,
      };
    }

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(text) as Record<string, unknown>;
    } catch {
      return { status: "failed", error: "Upload response was not JSON." };
    }

    const url = extractUploadUrl(parsed, responseUrlField);

    if (!url) {
      return {
        status: "failed",
        error: `No URL found in upload response: ${text.substring(0, 200)}`,
      };
    }

    return { status: "ok", url };
  } catch (err) {
    return {
      status: "failed",
      error: `Upload error: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}
