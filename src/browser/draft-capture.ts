import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { draftCaptureDir } from "../config/paths.js";
import { redactUrl } from "../util/redact.js";
import type { Page } from "playwright-core";
import { z } from "zod";

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

export interface DraftCaptureReview {
  capturedAt: string;
  publicationUrl: string;
  pageUrl: string;
  requestCount: number;
  responseCount: number;
  requestEndpoints: Array<{
    method: string;
    url: string;
    bodyKind: DraftRequestCapture["bodyKind"];
    bodyLength: number;
    bodyKeys: string[];
  }>;
  responseEndpoints: Array<{
    status: number;
    url: string;
    bodyKind: DraftResponseCapture["bodyKind"];
    bodyLength: number;
    topLevelKeys: string[];
    id?: string | number | undefined;
    slug?: string | undefined;
    draftUrl?: string | undefined;
  }>;
  note: string;
}

export interface DraftCaptureComparison {
  equal: boolean;
  expected: DraftCaptureReview;
  actual: DraftCaptureReview;
  differences: string[];
}

const DraftRequestSchema = z.object({
  url: z.string().min(1),
  method: z.string().min(1),
  bodyKind: z.union([z.literal("json"), z.literal("text"), z.literal("empty")]),
  bodyLength: z.number().int().nonnegative(),
  bodyKeys: z.array(z.string()).optional(),
});

const DraftResponseSchema = z.object({
  url: z.string().min(1),
  status: z.number().int().nonnegative(),
  bodyKind: z.union([z.literal("json"), z.literal("text"), z.literal("empty")]),
  bodyLength: z.number().int().nonnegative(),
  topLevelKeys: z.array(z.string()).optional(),
  id: z.union([z.string(), z.number()]).optional(),
  slug: z.string().optional(),
  draftUrl: z.string().optional(),
});

const DraftCaptureArtifactSchema = z.object({
  capturedAt: z.string().datetime(),
  publicationUrl: z.string().url(),
  pageUrl: z.string().min(1),
  requests: z.array(DraftRequestSchema),
  responses: z.array(DraftResponseSchema),
});

const DraftCaptureReviewRequestSchema = DraftRequestSchema.extend({
  bodyKeys: z.array(z.string()),
});

const DraftCaptureReviewResponseSchema = DraftResponseSchema.extend({
  topLevelKeys: z.array(z.string()),
});

const DraftCaptureReviewSchema = z.object({
  capturedAt: z.string().datetime(),
  publicationUrl: z.string().url(),
  pageUrl: z.string().min(1),
  requestCount: z.number().int().nonnegative(),
  responseCount: z.number().int().nonnegative(),
  requestEndpoints: z.array(DraftCaptureReviewRequestSchema),
  responseEndpoints: z.array(DraftCaptureReviewResponseSchema),
  note: z.string().min(1),
});

const DRAFT_ENDPOINT = /\/api\/v1\/(?:drafts|posts)(?:\/|$)/i;

export async function observeDraftTraffic(
  page: Page,
  options: DraftCaptureOptions,
): Promise<DraftCaptureSummary> {
  await mkdir(draftCaptureDir(), { recursive: true });

  const capturedAt = new Date().toISOString();
  const requests: DraftRequestCapture[] = [];
  const responses: DraftResponseCapture[] = [];

  const onRequest = (request: { url(): string; method(): string; postData(): string | null }) => {
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

  await writeFile(artifactFile, `${JSON.stringify(artifact, null, 2)}\n`, "utf8");

  return {
    status:
      artifact.requests.length > 0 || artifact.responses.length > 0 ? "captured" : "timed-out",
    artifactFile,
    publicationUrl: options.publicationUrl,
    pageUrl: page.url(),
    requestCount: artifact.requests.length,
    responseCount: artifact.responses.length,
    matchedCount: artifact.requests.length + artifact.responses.length,
    note: "Use the open browser window to create and save a draft; the capture file is written to local ignored state.",
  };
}

export async function reviewDraftCaptureArtifact(
  artifactFile: string,
): Promise<DraftCaptureReview> {
  return loadDraftCaptureReview(artifactFile);
}

export async function compareDraftCaptureArtifacts(
  expectedFile: string,
  actualFile: string,
): Promise<DraftCaptureComparison> {
  const [expected, actual] = await Promise.all([
    reviewDraftCaptureArtifact(expectedFile),
    reviewDraftCaptureArtifact(actualFile),
  ]);

  const expectedComparable = comparableReview(expected);
  const actualComparable = comparableReview(actual);
  const differences = diffComparableReview(expectedComparable, actualComparable);

  return {
    equal: differences.length === 0,
    expected,
    actual,
    differences,
  };
}

export async function writeDraftCaptureFixture(
  inputFile: string,
  outputFile: string,
): Promise<DraftCaptureReview> {
  const review = await loadDraftCaptureReview(inputFile);
  await mkdir(dirname(outputFile), { recursive: true });
  await writeFile(outputFile, `${JSON.stringify(review, null, 2)}\n`, "utf8");
  return review;
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

async function loadDraftCaptureReview(artifactFile: string): Promise<DraftCaptureReview> {
  const raw = await readFile(artifactFile, "utf8");
  const json = JSON.parse(raw) as unknown;

  if (isDraftCaptureReview(json)) {
    return DraftCaptureReviewSchema.parse(json);
  }

  const artifact = DraftCaptureArtifactSchema.parse(json);

  return {
    capturedAt: artifact.capturedAt,
    publicationUrl: artifact.publicationUrl,
    pageUrl: artifact.pageUrl,
    requestCount: artifact.requests.length,
    responseCount: artifact.responses.length,
    requestEndpoints: artifact.requests.map((request) => ({
      method: request.method,
      url: request.url,
      bodyKind: request.bodyKind,
      bodyLength: request.bodyLength,
      bodyKeys: request.bodyKeys ?? [],
    })),
    responseEndpoints: artifact.responses.map((response) => ({
      status: response.status,
      url: response.url,
      bodyKind: response.bodyKind,
      bodyLength: response.bodyLength,
      topLevelKeys: response.topLevelKeys ?? [],
      id: response.id,
      slug: response.slug,
      draftUrl: response.draftUrl,
    })),
    note: "Use this summary to identify the draft create/update/fetch shape from a manually captured browser session.",
  } satisfies DraftCaptureReview;
}

function comparableReview(review: DraftCaptureReview): unknown {
  return {
    publicationUrl: review.publicationUrl,
    pageUrl: review.pageUrl,
    requestCount: review.requestCount,
    responseCount: review.responseCount,
    requestEndpoints: review.requestEndpoints,
    responseEndpoints: review.responseEndpoints,
  };
}

function diffComparableReview(expected: unknown, actual: unknown): string[] {
  const expectedJson = stableStringify(expected);
  const actualJson = stableStringify(actual);

  if (expectedJson === actualJson) {
    return [];
  }

  return ["Draft capture shape differs between expected and actual artifacts."];
}

function isDraftCaptureReview(value: unknown): value is DraftCaptureReview {
  return (
    isRecord(value) &&
    "requestEndpoints" in value &&
    "responseEndpoints" in value &&
    "requestCount" in value &&
    "responseCount" in value
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stableStringify(value: unknown): string {
  return JSON.stringify(sortValue(value));
}

function sortValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortValue);
  }

  if (typeof value === "object" && value !== null) {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, nested]) => [key, sortValue(nested)]),
    );
  }

  return value;
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

function pickValue(record: Record<string, unknown>, keys: string[]): string | number | undefined {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" || typeof value === "number") {
      return value;
    }
  }

  return undefined;
}

function pickString(record: Record<string, unknown>, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.length > 0) {
      return value;
    }
  }

  return undefined;
}
