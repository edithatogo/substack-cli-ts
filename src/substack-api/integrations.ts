import type { ApiAuthMaterial } from "./auth.js";
import {
  type FetchLike,
  apiHeaders,
  classifyFailure,
  requestJson,
  requestWrite,
} from "./client.js";

export type IntegrationReadStatus =
  | "ok"
  | "unauthenticated"
  | "forbidden"
  | "not-found"
  | "schema-drift"
  | "network-error";

export interface IntegrationEntry {
  id: string;
  name: string;
  type: string;
  status: string;
  configuredAt: string | null;
  description: string | null;
}

export interface IntegrationListResult {
  status: IntegrationReadStatus;
  integrations?: IntegrationEntry[] | undefined;
  message: string;
}

export interface CrossPostResult {
  status: "ok" | "failed";
  postId: number;
  platform: string;
  message: string;
}

export interface ImportResult {
  status: "ok" | "failed";
  importId?: string | undefined;
  message: string;
}

export interface ApiTokenEntry {
  id: string;
  name: string;
  tokenPreview: string;
  scopes: string[];
  createdAt: string | null;
  lastUsedAt: string | null;
}

export interface ApiTokenListResult {
  status: IntegrationReadStatus;
  tokens?: ApiTokenEntry[] | undefined;
  message: string;
}

export async function fetchIntegrations(
  publicationUrl: string,
  material: ApiAuthMaterial,
  fetchFn: FetchLike,
): Promise<IntegrationListResult> {
  const headers = apiHeaders(material);
  const endpoints = [
    "/api/v1/publication/integrations",
    "/api/v1/integrations",
    "/api/v1/publication/settings/integrations",
  ];

  for (const path of endpoints) {
    const url = new URL(path, publicationUrl).toString();
    const response = await requestJson(fetchFn, url, headers);
    if (response.status === 200) {
      const body = response.body;
      const integrations = parseIntegrations(body);
      if (integrations) {
        return {
          status: "ok",
          integrations,
          message: `Integrations retrieved from ${path}.`,
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
    message: "No integrations endpoint found. Integration management may be dashboard-only.",
  };
}

export async function crossPost(
  publicationUrl: string,
  postId: number,
  platform: string,
  material: ApiAuthMaterial,
  fetchFn: FetchLike,
): Promise<CrossPostResult> {
  const headers = apiHeaders(material);
  const endpoints = [
    `/api/v1/posts/${postId}/crosspost`,
    `/api/v1/post/${postId}/crosspost`,
    `/api/v1/publication/posts/${postId}/crosspost`,
  ];

  for (const path of endpoints) {
    const url = new URL(path, publicationUrl).toString();
    const response = await requestWrite(fetchFn, url, "POST", headers, {
      platform,
    });
    if (response.status === 200) {
      return {
        status: "ok",
        postId,
        platform,
        message: `Cross-post to ${platform} initiated for post ${postId}.`,
      };
    }
    if (response.status === 404) {
      continue;
    }
    const failure = classifyFailure(response.status, url);
    return {
      status: "failed",
      postId,
      platform,
      message: failure.message,
    };
  }

  return {
    status: "failed",
    postId,
    platform,
    message: `No cross-post endpoint found for platform "${platform}". Cross-posting may be dashboard-only.`,
  };
}

export async function importFromWordPress(
  publicationUrl: string,
  filePath: string,
  material: ApiAuthMaterial,
  fetchFn: FetchLike,
): Promise<ImportResult> {
  const headers = apiHeaders(material);
  const endpoints = ["/api/v1/import/wordpress", "/api/v1/publication/import/wordpress"];

  for (const path of endpoints) {
    const url = new URL(path, publicationUrl).toString();
    const response = await requestWrite(fetchFn, url, "POST", headers, {
      file: filePath,
    });
    if (response.status === 200) {
      const bodyRecord = response.body as Record<string, unknown> | undefined;
      const importId =
        typeof bodyRecord?.import_id === "string"
          ? bodyRecord.import_id
          : typeof bodyRecord?.id === "string"
            ? bodyRecord.id
            : undefined;
      return {
        status: "ok",
        importId,
        message: `WordPress import initiated${importId ? ` (ID: ${importId})` : ""}.`,
      };
    }
    if (response.status === 404) {
      continue;
    }
    const failure = classifyFailure(response.status, url);
    return { status: "failed", message: failure.message };
  }

  return {
    status: "failed",
    message: "No WordPress import endpoint found. WordPress import may be dashboard-only.",
  };
}

export async function importFromRss(
  publicationUrl: string,
  rssUrl: string,
  material: ApiAuthMaterial,
  fetchFn: FetchLike,
): Promise<ImportResult> {
  const headers = apiHeaders(material);
  const endpoints = ["/api/v1/import/rss", "/api/v1/publication/import/rss"];

  for (const path of endpoints) {
    const url = new URL(path, publicationUrl).toString();
    const response = await requestWrite(fetchFn, url, "POST", headers, {
      url: rssUrl,
    });
    if (response.status === 200) {
      const bodyRecord = response.body as Record<string, unknown> | undefined;
      const importId =
        typeof bodyRecord?.import_id === "string"
          ? bodyRecord.import_id
          : typeof bodyRecord?.id === "string"
            ? bodyRecord.id
            : undefined;
      return {
        status: "ok",
        importId,
        message: `RSS import initiated${importId ? ` (ID: ${importId})` : ""}.`,
      };
    }
    if (response.status === 404) {
      continue;
    }
    const failure = classifyFailure(response.status, url);
    return { status: "failed", message: failure.message };
  }

  return {
    status: "failed",
    message: "No RSS import endpoint found. RSS import may be dashboard-only.",
  };
}

export async function fetchApiTokens(
  publicationUrl: string,
  material: ApiAuthMaterial,
  fetchFn: FetchLike,
): Promise<ApiTokenListResult> {
  const headers = apiHeaders(material);
  const endpoints = [
    "/api/v1/publication/tokens",
    "/api/v1/tokens",
    "/api/v1/publication/api_tokens",
  ];

  for (const path of endpoints) {
    const url = new URL(path, publicationUrl).toString();
    const response = await requestJson(fetchFn, url, headers);
    if (response.status === 200) {
      const body = response.body;
      const tokens = parseApiTokens(body);
      if (tokens) {
        return {
          status: "ok",
          tokens,
          message: `API tokens retrieved from ${path}.`,
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
    message: "No API tokens endpoint found. Token management may be dashboard-only.",
  };
}

function parseIntegrations(body: unknown): IntegrationEntry[] | null {
  const items = Array.isArray(body)
    ? body
    : body &&
        typeof body === "object" &&
        Array.isArray((body as Record<string, unknown>).integrations)
      ? ((body as Record<string, unknown>).integrations as unknown[])
      : body && typeof body === "object" && Array.isArray((body as Record<string, unknown>).data)
        ? ((body as Record<string, unknown>).data as unknown[])
        : null;

  if (!items) return null;

  const integrations: IntegrationEntry[] = [];
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
          : typeof record.type === "string"
            ? record.type
            : "Unknown";
    const type = typeof record.type === "string" ? record.type : "unknown";
    const status =
      typeof record.status === "string"
        ? record.status
        : typeof record.connected === "boolean"
          ? record.connected
            ? "connected"
            : "disconnected"
          : "unknown";
    const configuredAt =
      typeof record.configured_at === "string"
        ? record.configured_at
        : typeof record.created_at === "string"
          ? record.created_at
          : null;
    const description = typeof record.description === "string" ? record.description : null;

    integrations.push({ id, name, type, status, configuredAt, description });
  }

  return integrations.length > 0 ? integrations : null;
}

function parseApiTokens(body: unknown): ApiTokenEntry[] | null {
  const items = Array.isArray(body)
    ? body
    : body && typeof body === "object" && Array.isArray((body as Record<string, unknown>).tokens)
      ? ((body as Record<string, unknown>).tokens as unknown[])
      : body && typeof body === "object" && Array.isArray((body as Record<string, unknown>).data)
        ? ((body as Record<string, unknown>).data as unknown[])
        : null;

  if (!items) return null;

  const tokens: ApiTokenEntry[] = [];
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
        : typeof record.label === "string"
          ? record.label
          : "Token";
    const tokenValue =
      typeof record.token === "string"
        ? record.token
        : typeof record.value === "string"
          ? record.value
          : typeof record.key === "string"
            ? record.key
            : "";
    const tokenPreview =
      tokenValue.length > 8 ? `${tokenValue.slice(0, 4)}...${tokenValue.slice(-4)}` : "****";
    const scopes = Array.isArray(record.scopes)
      ? record.scopes.filter((s): s is string => typeof s === "string")
      : [];
    const createdAt =
      typeof record.created_at === "string"
        ? record.created_at
        : typeof record.createdAt === "string"
          ? record.createdAt
          : null;
    const lastUsedAt =
      typeof record.last_used_at === "string"
        ? record.last_used_at
        : typeof record.lastUsedAt === "string"
          ? record.lastUsedAt
          : null;

    tokens.push({ id, name, tokenPreview, scopes, createdAt, lastUsedAt });
  }

  return tokens.length > 0 ? tokens : null;
}
