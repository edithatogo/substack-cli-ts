import type { ApiAuthMaterial } from "./auth.js";
import { type FetchLike, apiHeaders, classifyFailure, requestWrite } from "./client.js";

export type SubscriberImportStatus = "ok" | "failed";

export interface SubscriberImportResult {
  status: SubscriberImportStatus;
  imported?: number | undefined;
  total?: number | undefined;
  errors?: string[] | undefined;
  message: string;
}

/**
 * Attempt to import subscribers from CSV data through known API endpoints.
 * Substack likely only supports CSV import through the web dashboard,
 * not via a programmatic API. This probe attempts known endpoints
 * and gracefully reports not-found.
 */
export async function importSubscribers(
  publicationUrl: string,
  csvData: string,
  material: ApiAuthMaterial,
  fetchFn: FetchLike,
): Promise<SubscriberImportResult> {
  const headers = apiHeaders(material);
  const endpoints = [
    "/api/v1/publication/subscribers/import",
    "/api/v1/publication/subscribers/import/csv",
    "/api/v1/import/subscribers",
  ];

  for (const path of endpoints) {
    const url = new URL(path, publicationUrl).toString();
    const response = await requestWrite(fetchFn, url, "POST", headers, {
      csv: csvData,
    });
    if (response.status === 200) {
      const body = response.body as Record<string, unknown> | undefined;
      const imported =
        typeof body?.imported === "number"
          ? body.imported
          : typeof body?.count === "number"
            ? body.count
            : undefined;
      const total = typeof body?.total === "number" ? body.total : undefined;
      const rawErrors = body?.errors;
      const errors: string[] = Array.isArray(rawErrors)
        ? rawErrors.filter((e): e is string => typeof e === "string")
        : [];

      return {
        status: "ok",
        imported,
        total,
        errors: errors.length > 0 ? errors : undefined,
        message: `Subscribers imported.${imported !== undefined ? ` Count: ${imported}` : ""}${total !== undefined ? ` / ${total}` : ""}`,
      };
    }
    if (response.status === 404) {
      continue;
    }
    const failure = classifyFailure(response.status, url);
    return {
      status: "failed",
      message: failure.message,
    };
  }

  return {
    status: "failed",
    message:
      "No subscriber CSV import endpoint found. CSV import is likely dashboard-only via the Substack web UI.",
  };
}
