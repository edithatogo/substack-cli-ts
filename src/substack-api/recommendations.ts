import type { ApiAuthMaterial } from "./auth.js";
import { apiHeaders, classifyFailure, type FetchLike, requestJson } from "./client.js";
import { isRecord } from "./parse-utils.js";

export type RecommendationReadStatus =
  | "ok"
  | "unauthenticated"
  | "forbidden"
  | "not-found"
  | "schema-drift"
  | "network-error";

export interface RecommendedPublication {
  id: string;
  name: string;
  subdomain: string;
  description: string | null;
  logoUrl: string | null;
  subscribers: number | null;
}

export interface RecommendationListResult {
  status: RecommendationReadStatus;
  recommended?: RecommendedPublication[] | undefined;
  recommending?: RecommendedPublication[] | undefined;
  message: string;
}

export interface RecommendationStatusResult {
  status: RecommendationReadStatus;
  publicationUrl: string;
  isRecommended: boolean | null;
  isRecommending: boolean | null;
  mutual: boolean | null;
  message: string;
}

export interface RecommendationWriteResult {
  status: RecommendationReadStatus;
  publicationUrl: string;
  message: string;
}

/**
 * Fetch the list of recommended and recommending publications.
 * Uses probe-based discovery across known endpoint patterns.
 */
export async function fetchRecommendationList(
  publicationUrl: string,
  material: ApiAuthMaterial,
  fetchFn: FetchLike,
): Promise<RecommendationListResult> {
  const headers = apiHeaders(material);

  // Try list endpoints for recommendations
  const listEndpoints: Array<{
    path: string;
    field: "recommended" | "recommending";
  }> = [
    { path: "/api/v1/publication/recommendations", field: "recommended" },
    { path: "/api/v1/publication/recommended", field: "recommended" },
    { path: "/api/v1/publication/recommending", field: "recommending" },
  ];

  let recommended: RecommendedPublication[] | undefined;
  let recommending: RecommendedPublication[] | undefined;

  for (const ep of listEndpoints) {
    const url = new URL(ep.path, publicationUrl).toString();
    const response = await requestJson(fetchFn, url, headers);
    if (response.status === 200) {
      const parsed = parseRecommendationList(response.body);
      if (parsed) {
        if (ep.field === "recommended") {
          recommended = parsed;
        } else {
          recommending = parsed;
        }
      }
    } else if (response.status !== 404) {
      const failure = classifyFailure(response.status, url);
      return { status: failure.status, message: failure.message };
    }
  }

  const anyFound = recommended !== undefined || recommending !== undefined;

  if (anyFound) {
    return {
      status: "ok",
      recommended,
      recommending,
      message: "Recommendation list retrieved.",
    };
  }

  return {
    status: "not-found",
    message: "No recommendation list endpoints found. Recommendations may be dashboard-only.",
  };
}

/**
 * Check recommendation status for a specific publication.
 * Probes known status-check endpoints.
 */
export async function fetchRecommendationStatus(
  publicationUrl: string,
  targetPublicationUrl: string,
  material: ApiAuthMaterial,
  fetchFn: FetchLike,
): Promise<RecommendationStatusResult> {
  const headers = apiHeaders(material);
  const encodedTarget = encodeURIComponent(targetPublicationUrl);

  const endpoints = [
    `/api/v1/publication/recommendation/status?url=${encodedTarget}`,
    `/api/v1/publication/recommendations/status?url=${encodedTarget}`,
    `/api/v1/recommendation/status?url=${encodedTarget}`,
  ];

  for (const path of endpoints) {
    const url = new URL(path, publicationUrl).toString();
    const response = await requestJson(fetchFn, url, headers);
    if (response.status === 200) {
      const body = response.body as Record<string, unknown> | undefined;
      if (body) {
        const isRecommended =
          typeof body.is_recommended === "boolean"
            ? body.is_recommended
            : typeof body.recommended === "boolean"
              ? body.recommended
              : null;
        const isRecommending =
          typeof body.is_recommending === "boolean"
            ? body.is_recommending
            : typeof body.is_following === "boolean"
              ? body.is_following
              : null;
        const mutual =
          typeof body.mutual === "boolean"
            ? body.mutual
            : typeof body.is_mutual === "boolean"
              ? body.is_mutual
              : null;

        return {
          status: "ok",
          publicationUrl: targetPublicationUrl,
          isRecommended,
          isRecommending,
          mutual,
          message: `Recommendation status retrieved for ${targetPublicationUrl}.`,
        };
      }
    }
    if (response.status !== 404) {
      const failure = classifyFailure(response.status, url);
      return {
        status: failure.status,
        publicationUrl: targetPublicationUrl,
        isRecommended: null,
        isRecommending: null,
        mutual: null,
        message: failure.message,
      };
    }
  }

  return {
    status: "not-found",
    publicationUrl: targetPublicationUrl,
    isRecommended: null,
    isRecommending: null,
    mutual: null,
    message: "No recommendation status endpoint found. This data may be dashboard-only.",
  };
}

/**
 * Recommend another publication.
 * Probes known recommend endpoints with POST.
 */
export async function addRecommendation(
  publicationUrl: string,
  targetPublicationUrl: string,
  material: ApiAuthMaterial,
  fetchFn: FetchLike,
): Promise<RecommendationWriteResult> {
  const headers = apiHeaders(material);
  const endpoints = [
    "/api/v1/publication/recommendations",
    "/api/v1/publication/recommend",
    "/api/v1/recommendations",
  ];

  const body: Record<string, unknown> = { url: targetPublicationUrl };

  // Try publication slug/id as well
  const targetPath = new URL(targetPublicationUrl).pathname.replace(/^\/+/, "").replace(/\/+$/, "");
  if (targetPath) {
    body.publication_slug = targetPath;
  }

  for (const path of endpoints) {
    const url = new URL(path, publicationUrl).toString();
    try {
      const writeResponse = await fetchFn(url, {
        method: "POST",
        headers: { ...headers, "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      if (writeResponse.status === 200 || writeResponse.status === 201) {
        return {
          status: "ok",
          publicationUrl: targetPublicationUrl,
          message: `Recommendation added for ${targetPublicationUrl}.`,
        };
      }
      if (writeResponse.status !== 404) {
        return {
          status: classifyFailure(writeResponse.status, url).status,
          publicationUrl: targetPublicationUrl,
          message: `POST to ${path} returned HTTP ${writeResponse.status}.`,
        };
      }
    } catch {
      // continue to next endpoint
    }
  }

  return {
    status: "not-found",
    publicationUrl: targetPublicationUrl,
    message:
      "No recommendation add endpoint found. Recommendation management may be dashboard-only.",
  };
}

/**
 * Remove a recommendation for another publication.
 * Probes known unrecommend endpoints with DELETE.
 */
export async function removeRecommendation(
  publicationUrl: string,
  targetPublicationUrl: string,
  material: ApiAuthMaterial,
  fetchFn: FetchLike,
): Promise<RecommendationWriteResult> {
  const headers = apiHeaders(material);
  const encodedTarget = encodeURIComponent(targetPublicationUrl);

  const endpoints = [
    `/api/v1/publication/recommendations/${encodedTarget}`,
    `/api/v1/publication/recommend/${encodedTarget}`,
    `/api/v1/recommendations/${encodedTarget}`,
  ];

  for (const path of endpoints) {
    const url = new URL(path, publicationUrl).toString();
    try {
      const response = await fetchFn(url, {
        method: "DELETE",
        headers,
      });
      if (response.status === 200 || response.status === 204) {
        return {
          status: "ok",
          publicationUrl: targetPublicationUrl,
          message: `Recommendation removed for ${targetPublicationUrl}.`,
        };
      }
      if (response.status !== 404) {
        return {
          status: classifyFailure(response.status, url).status,
          publicationUrl: targetPublicationUrl,
          message: `DELETE to ${path} returned HTTP ${response.status}.`,
        };
      }
    } catch {
      // continue to next endpoint
    }
  }

  return {
    status: "not-found",
    publicationUrl: targetPublicationUrl,
    message:
      "No recommendation remove endpoint found. Recommendation management may be dashboard-only.",
  };
}

function parseRecommendationList(body: unknown): RecommendedPublication[] | null {
  const items = Array.isArray(body)
    ? body
    : body &&
        typeof body === "object" &&
        Array.isArray((body as Record<string, unknown>).recommendations)
      ? ((body as Record<string, unknown>).recommendations as unknown[])
      : body &&
          typeof body === "object" &&
          Array.isArray((body as Record<string, unknown>).publications)
        ? ((body as Record<string, unknown>).publications as unknown[])
        : null;

  if (!items) return null;
  if (items.length === 0) return [];

  const publications: RecommendedPublication[] = [];
  for (const item of items) {
    if (!isRecord(item)) continue;
    const record = item;
    const id =
      typeof record.id === "string"
        ? record.id
        : typeof record.id === "number"
          ? String(record.id)
          : "";

    const name =
      typeof record.name === "string"
        ? record.name
        : typeof record.publication_name === "string"
          ? record.publication_name
          : typeof record.title === "string"
            ? record.title
            : "Unknown";

    const subdomain =
      typeof record.subdomain === "string"
        ? record.subdomain
        : typeof record.custom_domain === "string" && record.custom_domain
          ? record.custom_domain
          : typeof record.slug === "string"
            ? record.slug
            : "";

    if (id || name !== "Unknown") {
      publications.push({
        id,
        name,
        subdomain,
        description: typeof record.description === "string" ? record.description : null,
        logoUrl:
          typeof record.logo_url === "string"
            ? record.logo_url
            : typeof record.logoUrl === "string"
              ? record.logoUrl
              : typeof record.photo_url === "string"
                ? record.photo_url
                : null,
        subscribers:
          typeof record.subscribers === "number"
            ? record.subscribers
            : typeof record.subscriber_count === "number"
              ? record.subscriber_count
              : null,
      });
    }
  }

  return publications.length > 0 ? publications : null;
}
