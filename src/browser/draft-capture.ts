import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { draftCaptureDir } from "../config/paths.js";
import { redactUrl } from "../util/redact.js";
import type { Page } from "playwright-core";

export interface DraftCaptureOptions {
  timeoutMs: number;
  publicationUrl: string;
}

export interface DraftRequestCapture {
  url: string;
  method: string;
  bodyKind: "json" | "text" | "empty";
  bodyLength: number;
  bodyKeys?: string[] | undefined;
}

export interface DraftResponseCapture {
  url: string;
  status: number;
  bodyKind: "json" | "text" | "empty";
  bodyLength: number;
  topLevelKeys?: string[] | undefined;
  id?: string | number | undefined;
  slug?: string | undefined;
  draftUrl?: string | undefined;
}

export interface DraftCaptureArtifact {
  capturedAt: string;
  publicationUrl: string;
  pageUrl: string;
  requests: DraftRequestCapture[];
  responses: DraftResponseCapture[];
}

export interface DraftCaptureSummary {
  status: "captured" | "timed-out";
  artifactFile: string;
  publicationUrl: string;
  pageUrl: string;
  requestCount: number;
  responseCount: number;
  matchedCount: number;
  note: string;
}

const DRAFT_ENDPOINT = /\/api\/v1\/(?:drafts|posts)(?:\/|$)/i;

export async function observeDraftTraffic(
  page: Page,
  options: DraftCaptureOptions,
): Promise<DraftCaptureSummary> {
  await mkdir(draftCaptureDir(), { recursive: true });

  const capturedAt = new Date().toISOString();
  const requests: DraftRequestCapture[] = [];
  const responses: DraftResponseCapture[] = [];

  const onRequest = (request: {
    url(): string;
    method(): string;
    postData(): string | null;
  }) => {
    if (!DRAFT_ENDPOINT.test(request.url())) {
      return;
    }

    const body = request.postData() ?? "";
    requests.push({
      url: redactUrl(request.url()) ?? request.url(),
      method: request.method(),
      bodyKind: classifyBody(body),
      bodyLength: body.length,
      bodyKeys: summarizeBodyKeys(body),
    });
  };

  const onResponse = async (response: {
    url(): string;
    status(): number;
    text(): Promise<string>;
  }) => {
    if (!DRAFT_ENDPOINT.test(response.url())) {
      return;
    }

    const body = await response.text().catch(() => "");
    responses.push({
      url: redactUrl(response.url()) ?? response.url(),
      status: response.status(),
      bodyKind: classifyBody(body),
      bodyLength: body.length,
      topLevelKeys: summarizeBodyKeys(body),
      ...extractInterestingFields(body),
    });
  };

  page.on("request", onRequest);
  page.on("response", onResponse);

  try {
    await page.goto(options.publicationUrl, {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });
    await page.waitForTimeout(options.timeoutMs);
  } finally {
    page.off("request", onRequest);
    page.off("response", onResponse);
  }

  const artifact: DraftCaptureArtifact = {
    capturedAt,
    publicationUrl: options.publicationUrl,
    pageUrl: page.url(),
    requests,
    responses,
  };

  const artifactFile = join(
    draftCaptureDir(),
    `${capturedAt.replaceAll(":", "-")}-draft-capture.json`,
  );

  await writeFile(
    artifactFile,
    `${JSON.stringify(artifact, null, 2)}\n`,
    "utf8",
  );

  return {
    status:
      artifact.requests.length > 0 || artifact.responses.length > 0
        ? "captured"
        : "timed-out",
    artifactFile,
    publicationUrl: options.publicationUrl,
    pageUrl: page.url(),
    requestCount: artifact.requests.length,
    responseCount: artifact.responses.length,
    matchedCount: artifact.requests.length + artifact.responses.length,
    note: "Use the open browser window to create and save a draft; the capture file is written to local ignored state.",
  };
}

function classifyBody(body: string): "json" | "text" | "empty" {
  if (!body) {
    return "empty";
  }

  try {
    JSON.parse(body);
    return "json";
  } catch {
    return "text";
  }
}

function summarizeBodyKeys(body: string): string[] | undefined {
  if (!body) {
    return undefined;
  }

  try {
    const json = JSON.parse(body) as unknown;
    if (typeof json === "object" && json !== null && !Array.isArray(json)) {
      return Object.keys(json).sort();
    }
  } catch {
    return undefined;
  }

  return undefined;
}

function extractInterestingFields(
  body: string,
): Pick<DraftResponseCapture, "id" | "slug" | "draftUrl"> {
  try {
    const json = JSON.parse(body) as unknown;
    if (typeof json !== "object" || json === null || Array.isArray(json)) {
      return {};
    }

    const record = json as Record<string, unknown>;
    const id = pickValue(record, ["id", "draft_id", "draftId"]);
    const slug = pickString(record, ["slug"]);
    const draftUrl = pickString(record, ["url", "draft_url", "draftUrl"]);

    return {
      id: typeof id === "string" || typeof id === "number" ? id : undefined,
      slug,
      draftUrl,
    };
  } catch {
    return {};
  }
}

function pickValue(
  record: Record<string, unknown>,
  keys: string[],
): string | number | undefined {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" || typeof value === "number") {
      return value;
    }
  }

  return undefined;
}

function pickString(
  record: Record<string, unknown>,
  keys: string[],
): string | undefined {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.length > 0) {
      return value;
    }
  }

  return undefined;
}
