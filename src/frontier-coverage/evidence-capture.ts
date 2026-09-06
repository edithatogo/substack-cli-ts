import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import type { CoverageCapability, CoverageMatrix, CoverageStatus } from "./schema.js";

export interface CaptureEndpoint {
  method: string;
  url: string;
  status?: number | undefined;
  requestHeaders?: Record<string, unknown> | undefined;
  responseHeaders?: Record<string, unknown> | undefined;
  requestBody?: unknown;
  responseBody?: unknown;
}

export interface CaptureEvidenceFixture {
  schemaVersion: 1;
  capabilityId: string;
  capturedAt: string;
  source: "browser" | "api" | "manual";
  surface: string;
  endpoints: CaptureEndpoint[];
  notes?: string[] | undefined;
  lastVerifiedAt?: string | undefined;
}

export interface MinimizedCaptureFixture {
  schemaVersion: 1;
  capabilityId: string;
  capturedAt: string;
  source: CaptureEvidenceFixture["source"];
  surface: string;
  endpoints: Array<{
    method: string;
    url: string;
    status?: number | undefined;
    requestHeaders?: Record<string, unknown> | undefined;
    responseHeaders?: Record<string, unknown> | undefined;
    requestBody?: unknown;
    responseBody?: unknown;
  }>;
  notes?: string[] | undefined;
  evidenceHash: string;
  lastVerifiedAt: string;
}

export interface CaptureValidationIssue {
  code: string;
  message: string;
  endpointIndex?: number | undefined;
}

export interface CaptureValidationReport {
  operation: "coverage.capture.validate";
  status: "ready" | "blocked";
  issueCount: number;
  capabilityId?: string | undefined;
  evidenceHash?: string | undefined;
  lastVerifiedAt?: string | undefined;
  minimized?: MinimizedCaptureFixture | undefined;
  issues: CaptureValidationIssue[];
}

export interface EndpointInventoryEntry {
  capabilityId: string;
  surface: string;
  source: CaptureEvidenceFixture["source"];
  method: string;
  host: string;
  path: string;
  status?: number | undefined;
  evidenceHash: string;
  lastVerifiedAt: string;
}

export interface EndpointInventoryReport {
  operation: "coverage.endpoint.inventory";
  status: "ready" | "blocked";
  generatedAt: string;
  endpointCount: number;
  entries: EndpointInventoryEntry[];
}

export interface EndpointDiffReport {
  operation: "coverage.endpoint.diff";
  status: "ready" | "blocked";
  added: EndpointInventoryEntry[];
  removed: EndpointInventoryEntry[];
  changed: Array<{
    key: string;
    before: EndpointInventoryEntry;
    after: EndpointInventoryEntry;
    changes: string[];
  }>;
}

export interface GraduationCheckReport {
  operation: "coverage.capture.graduation";
  status: "ready" | "blocked";
  checkedAt: string;
  blockers: Array<{
    capabilityId: string;
    status: CoverageStatus;
    missing: string[];
  }>;
}

export interface CaptureKitReport {
  operation: "coverage.capture.kit";
  status: "ready" | "blocked";
  generatedAt: string;
  capabilityId: string;
  capability?: {
    name: string;
    domain: CoverageCapability["domain"];
    status: CoverageStatus;
    safetyClass: CoverageCapability["safetyClass"];
    primaryPath: CoverageCapability["primaryPath"];
    fallbackPath?: CoverageCapability["fallbackPath"] | undefined;
    manualPath?: CoverageCapability["manualPath"] | undefined;
    nextAction: string;
    decisionRecord?: CoverageCapability["decisionRecord"] | undefined;
  };
  fixtureTemplate?: CaptureEvidenceFixture | undefined;
  requiredEvidence: string[];
  redactionChecklist: string[];
  validationCommands: string[];
  manualRunbook: string[];
  promotionBlockers: string[];
  message: string;
}

const VALID_SOURCES = new Set(["browser", "api", "manual"]);
const BLOCKED_STATUSES = new Set(["probe-only", "planning-only", "manual-admin"]);
const RETAINED_HEADERS = new Set(["accept", "content-type", "x-substack-version"]);

const SENSITIVE_KEY_PATTERN =
  /cookie|authorization|password|token|secret|session|csrf|xsrf|stripe|card|payment|tax|payout|subscriber|customer|email|name|user[_-]?id|publication[_-]?id|account[_-]?id|id$/i;
const EMAIL_PATTERN = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const LONG_TOKEN_PATTERN = /\b(?:Bearer|Basic)\s+[A-Za-z0-9._~+/=-]+|\b[A-Za-z0-9_-]{24,}\b/g;
const UUID_PATTERN = /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi;
const PRIVATE_NAME_PATTERN = /\b[A-Z][a-z]+ [A-Z][a-z]+\b/g;
const PRIVATE_NAME_KEYS = new Set(["first_name", "last_name", "full_name", "display_name", "name"]);
const BODY_PREVIEW_LIMIT = 2_000;
const REDACTED = "[REDACTED]";

export async function loadCaptureEvidenceFixture(path: string): Promise<CaptureEvidenceFixture> {
  return parseCaptureEvidenceFixture(JSON.parse(await readFile(path, "utf8")));
}

export function parseCaptureEvidenceFixture(value: unknown): CaptureEvidenceFixture {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Capture evidence fixture must be an object.");
  }
  const record = value as Record<string, unknown>;
  if (record.schemaVersion !== 1) throw new Error("Capture fixture schemaVersion must be 1.");
  if (typeof record.capabilityId !== "string" || record.capabilityId.length === 0) {
    throw new Error("Capture fixture requires capabilityId.");
  }
  if (typeof record.capturedAt !== "string" || Number.isNaN(Date.parse(record.capturedAt))) {
    throw new Error("Capture fixture requires valid capturedAt.");
  }
  if (!VALID_SOURCES.has(String(record.source))) {
    throw new Error("Capture fixture source must be browser, api, or manual.");
  }
  if (typeof record.surface !== "string" || record.surface.length === 0) {
    throw new Error("Capture fixture requires surface.");
  }
  if (!Array.isArray(record.endpoints)) throw new Error("Capture fixture requires endpoints.");
  return {
    schemaVersion: 1,
    capabilityId: record.capabilityId,
    capturedAt: record.capturedAt,
    source: record.source as CaptureEvidenceFixture["source"],
    surface: record.surface,
    endpoints: record.endpoints.map(parseCaptureEndpoint),
    notes: Array.isArray(record.notes)
      ? record.notes.filter((note): note is string => typeof note === "string")
      : undefined,
    lastVerifiedAt:
      typeof record.lastVerifiedAt === "string" && !Number.isNaN(Date.parse(record.lastVerifiedAt))
        ? record.lastVerifiedAt
        : undefined,
  };
}

export function buildCaptureValidationReport(
  fixture: CaptureEvidenceFixture,
  options: { verifiedAt?: Date | undefined } = {},
): CaptureValidationReport {
  const minimized = minimizeCaptureFixture(fixture, options);
  const issues = validateMinimizedFixture(minimized);
  return {
    operation: "coverage.capture.validate",
    status: issues.length === 0 ? "ready" : "blocked",
    issueCount: issues.length,
    capabilityId: minimized.capabilityId,
    evidenceHash: minimized.evidenceHash,
    lastVerifiedAt: minimized.lastVerifiedAt,
    minimized: issues.length === 0 ? minimized : undefined,
    issues,
  };
}

export function minimizeCaptureFixture(
  fixture: CaptureEvidenceFixture,
  options: { verifiedAt?: Date | undefined } = {},
): MinimizedCaptureFixture {
  const withoutHash = {
    schemaVersion: 1 as const,
    capabilityId: fixture.capabilityId,
    capturedAt: fixture.capturedAt,
    source: fixture.source,
    surface: redactFreeText(fixture.surface),
    endpoints: fixture.endpoints.map((endpoint) => minimizeEndpoint(endpoint)),
    notes: fixture.notes?.map(redactFreeText),
    lastVerifiedAt: (options.verifiedAt ?? new Date()).toISOString(),
  };
  return {
    ...withoutHash,
    evidenceHash: stableHash(withoutHash),
  };
}

export function buildEndpointInventoryReport(
  fixtures: CaptureEvidenceFixture[],
  options: { generatedAt?: Date | undefined; verifiedAt?: Date | undefined } = {},
): EndpointInventoryReport {
  const reports = fixtures.map((fixture) =>
    buildCaptureValidationReport(fixture, {
      verifiedAt: options.verifiedAt ?? options.generatedAt,
    }),
  );
  const entries = reports.flatMap((report) =>
    report.minimized
      ? report.minimized.endpoints.map((endpoint) => inventoryEntry(report.minimized!, endpoint))
      : [],
  );
  entries.sort((a, b) => inventoryKey(a).localeCompare(inventoryKey(b)));
  return {
    operation: "coverage.endpoint.inventory",
    status: reports.every((report) => report.status === "ready") ? "ready" : "blocked",
    generatedAt: (options.generatedAt ?? new Date()).toISOString(),
    endpointCount: entries.length,
    entries,
  };
}

export function renderEndpointInventory(report: EndpointInventoryReport): string {
  const lines = [
    "# Endpoint Capture Inventory",
    "",
    `Status: ${report.status}`,
    `Generated: ${report.generatedAt}`,
    `Endpoints: ${report.endpointCount}`,
    "",
    "| Capability | Method | Host | Path | Status | Last verified | Evidence hash |",
    "| --- | --- | --- | --- | --- | --- | --- |",
  ];
  for (const entry of report.entries) {
    lines.push(
      `| ${entry.capabilityId} | ${entry.method} | ${entry.host} | ${entry.path} | ${entry.status ?? "n/a"} | ${entry.lastVerifiedAt} | ${entry.evidenceHash} |`,
    );
  }
  return `${lines.join("\n")}\n`;
}

export function buildEndpointDiffReport(
  before: EndpointInventoryReport,
  after: EndpointInventoryReport,
): EndpointDiffReport {
  const beforeMap = new Map(before.entries.map((entry) => [inventoryKey(entry), entry]));
  const afterMap = new Map(after.entries.map((entry) => [inventoryKey(entry), entry]));
  const added = after.entries.filter((entry) => !beforeMap.has(inventoryKey(entry)));
  const removed = before.entries.filter((entry) => !afterMap.has(inventoryKey(entry)));
  const changed = after.entries.flatMap((entry) => {
    const key = inventoryKey(entry);
    const previous = beforeMap.get(key);
    if (!previous) return [];
    const changes = [
      previous.status !== entry.status ? "status" : "",
      previous.evidenceHash !== entry.evidenceHash ? "evidenceHash" : "",
      previous.lastVerifiedAt !== entry.lastVerifiedAt ? "lastVerifiedAt" : "",
    ].filter(Boolean);
    return changes.length ? [{ key, before: previous, after: entry, changes }] : [];
  });
  return {
    operation: "coverage.endpoint.diff",
    status: added.length || removed.length || changed.length ? "blocked" : "ready",
    added,
    removed,
    changed,
  };
}

export function buildGraduationCheckReport(
  matrix: CoverageMatrix,
  inventory: EndpointInventoryReport,
  options: { checkedAt?: Date | undefined } = {},
): GraduationCheckReport {
  const inventoryCapabilities = new Set(inventory.entries.map((entry) => entry.capabilityId));
  const blockers = matrix.capabilities
    .filter((capability) => BLOCKED_STATUSES.has(capability.status))
    .map((capability) => {
      const missing = missingGraduationEvidence(capability, inventoryCapabilities);
      return { capabilityId: capability.id, status: capability.status, missing };
    })
    .filter((entry) => entry.missing.length > 0);
  return {
    operation: "coverage.capture.graduation",
    status: blockers.length === 0 && inventory.status === "ready" ? "ready" : "blocked",
    checkedAt: (options.checkedAt ?? new Date()).toISOString(),
    blockers,
  };
}

export function buildCaptureKitReport(
  matrix: CoverageMatrix,
  capabilityId: string,
  options: {
    generatedAt?: Date | undefined;
    fixtureDir?: string | undefined;
    inventoryFile?: string | undefined;
  } = {},
): CaptureKitReport {
  const capability = matrix.capabilities.find((candidate) => candidate.id === capabilityId);
  const generatedAt = (options.generatedAt ?? new Date()).toISOString();
  if (!capability) {
    return {
      operation: "coverage.capture.kit",
      status: "blocked",
      generatedAt,
      capabilityId,
      requiredEvidence: [],
      redactionChecklist: [],
      validationCommands: [],
      manualRunbook: [],
      promotionBlockers: [`Capability ${capabilityId} was not found in the coverage matrix.`],
      message: "Capability ID was not found.",
    };
  }

  const fixturePath = `${options.fixtureDir ?? "fixtures/captures"}/${capability.id}.json`;
  const inventoryFile = options.inventoryFile ?? "fixtures/captures/endpoint-inventory.json";
  const fixtureTemplate = buildFixtureTemplate(capability, generatedAt);
  const requiredEvidence = [
    `Create a redacted endpoint capture fixture at ${fixturePath}.`,
    "Add or verify an endpoint-capture evidence entry in the coverage matrix.",
    "Add or verify a manual-check evidence entry for owner-approved recovery.",
    "Keep the active decision record until promotion review is complete.",
  ];
  const validationCommands = [
    `node dist/cli.js coverage capture-validate --fixture ${fixturePath}`,
    `node dist/cli.js coverage capture-inventory --fixture ${fixturePath} --out ${inventoryFile}`,
    `node dist/cli.js coverage capture-graduation --inventory ${inventoryFile}`,
    "npm run scan:secrets",
  ];

  return {
    operation: "coverage.capture.kit",
    status: "ready",
    generatedAt,
    capabilityId: capability.id,
    capability: {
      name: capability.name,
      domain: capability.domain,
      status: capability.status,
      safetyClass: capability.safetyClass,
      primaryPath: capability.primaryPath,
      fallbackPath: capability.fallbackPath,
      manualPath: capability.manualPath,
      nextAction: capability.nextAction,
      decisionRecord: capability.decisionRecord,
    },
    fixtureTemplate,
    requiredEvidence,
    redactionChecklist: [
      "Remove cookies, Authorization headers, CSRF/XSRF values, session IDs, and bearer/basic tokens.",
      "Remove account IDs, publication IDs, draft/post IDs, subscriber/customer IDs, and private path IDs.",
      "Remove names, emails, subscriber records, payment, tax, payout, card, Stripe, and billing data.",
      "Keep only deterministic request/response shape fields needed for contract tests.",
      "Run capture-validate and scan:secrets before committing any fixture.",
    ],
    validationCommands,
    manualRunbook: [
      "Use a test publication or owner-approved dashboard session only.",
      "Perform the Substack dashboard workflow manually while recording only network shape.",
      "Confirm the workflow has a manual rollback or recovery path before proposing automation.",
      "If redaction cannot be proven safe, keep the capability probe-only, planning-only, or unsupported.",
    ],
    promotionBlockers: missingGraduationEvidence(capability, new Set<string>()).concat(
      "owner-approved redacted fixture review",
    ),
    message: "Capture kit generated. It does not perform live Substack actions.",
  };
}

function parseCaptureEndpoint(value: unknown, index: number): CaptureEndpoint {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`Capture endpoint ${index} must be an object.`);
  }
  const record = value as Record<string, unknown>;
  if (typeof record.method !== "string" || record.method.length === 0) {
    throw new Error(`Capture endpoint ${index} requires method.`);
  }
  if (typeof record.url !== "string" || record.url.length === 0) {
    throw new Error(`Capture endpoint ${index} requires url.`);
  }
  return {
    method: record.method,
    url: record.url,
    status: typeof record.status === "number" ? record.status : undefined,
    requestHeaders: asRecord(record.requestHeaders),
    responseHeaders: asRecord(record.responseHeaders),
    requestBody: record.requestBody,
    responseBody: record.responseBody,
  };
}

function buildFixtureTemplate(
  capability: CoverageCapability,
  capturedAt: string,
): CaptureEvidenceFixture {
  return {
    schemaVersion: 1,
    capabilityId: capability.id,
    capturedAt,
    source: capability.primaryPath === "api" ? "api" : "browser",
    surface: capability.name,
    endpoints: [
      {
        method: "GET",
        url: "https://example.substack.com/api/v1/replace-with-redacted-endpoint",
        status: 200,
        requestHeaders: { accept: "application/json" },
        responseHeaders: { "content-type": "application/json" },
        responseBody: {
          shape: "replace with minimized contract shape only",
        },
      },
    ],
    notes: [
      "Template only. Replace endpoint URL and body shape with redacted capture evidence before validation.",
    ],
  };
}

function minimizeEndpoint(endpoint: CaptureEndpoint): MinimizedCaptureFixture["endpoints"][number] {
  return {
    method: endpoint.method.toUpperCase(),
    url: redactUrlForCapture(endpoint.url),
    status: endpoint.status,
    requestHeaders: minimizeHeaders(endpoint.requestHeaders),
    responseHeaders: minimizeHeaders(endpoint.responseHeaders),
    requestBody: minimizeBody(endpoint.requestBody),
    responseBody: minimizeBody(endpoint.responseBody),
  };
}

function minimizeHeaders(
  headers: Record<string, unknown> | undefined,
): Record<string, unknown> | undefined {
  if (!headers) return undefined;
  const kept: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(headers)) {
    const normalized = key.toLowerCase();
    if (RETAINED_HEADERS.has(normalized)) {
      kept[normalized] = redactValueForKey(normalized, value);
    } else if (SENSITIVE_KEY_PATTERN.test(key)) {
      kept[normalized] = REDACTED;
    }
  }
  return Object.keys(kept).length ? kept : undefined;
}

function minimizeBody(value: unknown): unknown {
  if (value === undefined || value === null) return undefined;
  const redacted = redactCaptureValue(value);
  const serialized = stableStringify(redacted);
  if (serialized === "undefined") return undefined;
  if (serialized.length <= BODY_PREVIEW_LIMIT) return redacted;
  return {
    preview: `${serialized.slice(0, BODY_PREVIEW_LIMIT)}...`,
    truncated: true,
  };
}

function redactCaptureValue(value: unknown, key = ""): unknown {
  if (value === null || value === undefined) return value;
  if (typeof value === "string") return redactValueForKey(key, value);
  if (typeof value === "number" || typeof value === "boolean") {
    return SENSITIVE_KEY_PATTERN.test(key) ? REDACTED : value;
  }
  if (Array.isArray(value)) return value.slice(0, 5).map((item) => redactCaptureValue(item, key));
  if (typeof value === "object") {
    const output: Record<string, unknown> = {};
    for (const [childKey, childValue] of Object.entries(value as Record<string, unknown>)) {
      output[childKey] = redactValueForKey(childKey, childValue);
    }
    return output;
  }
  return value;
}

function redactValueForKey(key: string, value: unknown): unknown {
  if (SENSITIVE_KEY_PATTERN.test(key) || PRIVATE_NAME_KEYS.has(key.toLowerCase())) {
    return REDACTED;
  }
  if (typeof value === "string") return redactScalar(value);
  if (Array.isArray(value)) return value.slice(0, 5).map((item) => redactCaptureValue(item, key));
  if (value && typeof value === "object") return redactCaptureValue(value, key);
  return value;
}

function redactScalar(value: string): string {
  return value
    .replace(EMAIL_PATTERN, REDACTED)
    .replace(UUID_PATTERN, REDACTED)
    .replace(LONG_TOKEN_PATTERN, REDACTED);
}

function redactFreeText(value: string): string {
  return redactScalar(value).replace(PRIVATE_NAME_PATTERN, REDACTED);
}

function redactUrlForCapture(value: string): string {
  try {
    const url = new URL(value);
    for (const key of [...url.searchParams.keys()]) {
      url.searchParams.set(
        key,
        testPattern(SENSITIVE_KEY_PATTERN, key)
          ? REDACTED
          : redactScalar(url.searchParams.get(key) ?? ""),
      );
    }
    url.pathname = url.pathname
      .split("/")
      .map((part) => (looksPrivatePathPart(part) ? REDACTED : redactScalar(part)))
      .join("/");
    return `${url.origin}${url.pathname}${url.search}`;
  } catch {
    return redactScalar(value);
  }
}

function looksPrivatePathPart(value: string): boolean {
  return (
    /^\d{4,}$/.test(value) || /^[0-9a-f]{12,}$/i.test(value) || testPattern(EMAIL_PATTERN, value)
  );
}

function validateMinimizedFixture(fixture: MinimizedCaptureFixture): CaptureValidationIssue[] {
  const issues: CaptureValidationIssue[] = [];
  fixture.endpoints.forEach((endpoint, index) => {
    if (containsSensitiveValue(endpoint)) {
      issues.push({
        code: "sensitive-value",
        message:
          "Endpoint capture still contains a cookie, token, ID, email, private name, payment, or subscriber value.",
        endpointIndex: index,
      });
    }
    if (endpoint.requestBody === undefined && endpoint.responseBody === undefined) {
      issues.push({
        code: "empty-evidence",
        message: "Endpoint capture must retain a minimized request or response shape.",
        endpointIndex: index,
      });
    }
  });
  return issues;
}

function containsSensitiveValue(value: unknown): boolean {
  const serialized = stableStringify(value);
  return (
    testPattern(EMAIL_PATTERN, serialized) ||
    testPattern(UUID_PATTERN, serialized) ||
    testPattern(LONG_TOKEN_PATTERN, serialized)
  );
}

function testPattern(pattern: RegExp, value: string): boolean {
  pattern.lastIndex = 0;
  return pattern.test(value);
}

function inventoryEntry(
  fixture: MinimizedCaptureFixture,
  endpoint: MinimizedCaptureFixture["endpoints"][number],
): EndpointInventoryEntry {
  const url = new URL(endpoint.url);
  return {
    capabilityId: fixture.capabilityId,
    surface: fixture.surface,
    source: fixture.source,
    method: endpoint.method,
    host: url.host,
    path: url.pathname,
    status: endpoint.status,
    evidenceHash: fixture.evidenceHash,
    lastVerifiedAt: fixture.lastVerifiedAt,
  };
}

function inventoryKey(entry: EndpointInventoryEntry): string {
  return `${entry.capabilityId} ${entry.method} ${entry.host}${entry.path}`;
}

function missingGraduationEvidence(
  capability: CoverageCapability,
  inventoryCapabilities: Set<string>,
): string[] {
  const missing: string[] = [];
  if (!inventoryCapabilities.has(capability.id)) {
    missing.push("redacted endpoint capture fixture");
  }
  if (!capability.evidence.some((evidence) => evidence.kind === "manual-check")) {
    missing.push("manual validation or recovery evidence");
  }
  if (!capability.evidence.some((evidence) => evidence.kind === "endpoint-capture")) {
    missing.push("endpoint-capture evidence link");
  }
  if (!capability.decisionRecord) missing.push("active decision record");
  return missing;
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

function stableHash(value: unknown): string {
  return createHash("sha256").update(stableStringify(value)).digest("hex");
}

function stableStringify(value: unknown): string {
  return JSON.stringify(sortForStableStringify(value)) ?? "undefined";
}

function sortForStableStringify(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortForStableStringify);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, child]) => [key, sortForStableStringify(child)]),
  );
}
