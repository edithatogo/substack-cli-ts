import type { ApiAuthMaterial } from "./auth.js";
import { type FetchLike, apiHeaders, classifyFailure } from "./client.js";

export type SubscriberExportReadStatus =
  | "ok"
  | "unauthenticated"
  | "forbidden"
  | "not-found"
  | "schema-drift"
  | "network-error";

export interface SubscriberExportResult {
  status: SubscriberExportReadStatus;
  csvData?: string | undefined;
  format?: string | undefined;
  message: string;
}

export interface SubscriberExportOptions {
  status?: string | undefined;
  tier?: string | undefined;
  format?: string | undefined;
}

/**
 * Attempt to export subscribers as CSV through known API endpoints.
 * Substack may not expose this via a JSON API — the dashboard CSV export
 * button likely triggers a browser file download, not a programmatic endpoint.
 */
export async function fetchSubscriberExport(
  publicationUrl: string,
  material: ApiAuthMaterial,
  fetchFn: FetchLike,
  options?: SubscriberExportOptions,
): Promise<SubscriberExportResult> {
  const headers = apiHeaders(material);
  const format = options?.format ?? "csv";
  const endpoints = [
    "/api/v1/publication/subscribers/export",
    "/api/v1/publication/subscribers/export/csv",
    "/api/v1/publication/subscribers.csv",
    `/api/v1/publication/subscribers/export?format=${format}`,
  ];

  for (const path of endpoints) {
    const url = new URL(path, publicationUrl).toString();
    let response: Awaited<ReturnType<FetchLike>>;
    try {
      response = await fetchFn(url, { headers });
    } catch {
      return {
        status: "network-error",
        message: `Network error while probing subscriber export endpoint ${path}.`,
      };
    }
    if (response.status === 200) {
      const text = await response.text();
      let csvData = text;
      try {
        const body = JSON.parse(text) as unknown;
        if (
          body &&
          typeof body === "object" &&
          typeof (body as Record<string, unknown>).data === "string"
        ) {
          csvData = (body as Record<string, unknown>).data as string;
        }
      } catch {
        // Plain CSV responses are expected from export endpoints.
      }
      if (csvData) {
        return {
          status: "ok",
          csvData,
          format,
          message: `Subscribers exported in ${format} format from ${path}.`,
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
      "No subscriber CSV export endpoint found. CSV export is likely dashboard-only via the Substack web UI.",
  };
}
