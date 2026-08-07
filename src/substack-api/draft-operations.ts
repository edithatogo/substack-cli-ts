import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import type { ApiAuthMaterial } from "./auth.js";
import { apiHeaders, requestDelete, requestWrite } from "./client.js";
import { draftMutationActionsFilePath } from "../config/paths.js";
import type { FetchLike } from "./client.js";

const DEFAULT_DRAFT_MUTATION_TTL_SECONDS = 30 * 60;
const DRAFT_MUTATION_ACTION_SCHEMA_VERSION = 1;
const MAX_STATE_VALUE_LENGTH = 128;

export type DraftLifecycleOperation = "unschedule" | "revise";

export type DraftMutationMethod = "POST" | "DELETE";

export type DraftMutationSignal =
  | "likely-route"
  | "method-mismatch"
  | "not-found"
  | "unauthorized"
  | "forbidden"
  | "network-error"
  | "unexpected";

export interface DraftMutationProbeCandidate {
  operation: DraftLifecycleOperation;
  endpointTemplate: string;
  endpoint: string;
  probeMethod: "GET";
  status: number;
  signal: DraftMutationSignal;
  evidence: string[];
}

export interface DraftMutationProbeReport {
  status: "probed";
  operation: "draft.mutation-probe";
  publicationUrl: string;
  draftId: string;
  endpointCount: number;
  reportId: string;
  generatedAt: string;
  approvalToken: string;
  probes: DraftMutationProbeCandidate[];
  supportsUnschedule: boolean;
  supportsRevise: boolean;
  message: string;
}

export interface DraftMutationExecutionPlan {
  planSchemaVersion: 1;
  operation: DraftLifecycleOperation;
  draftId: string;
  draftUrl: string;
  publicationUrl: string;
  endpointTemplate: string;
  endpoint: string;
  method: DraftMutationMethod;
  sourceProbe: DraftMutationProbeCandidate;
  actionId: string;
  planHash: string;
  actor: string;
  publicationId: number | null;
  draftUpdatedAt?: string | undefined;
  contentHash: string;
  beforeState: DraftMutationPlanState;
  afterState: DraftMutationPlanState;
  expiresAt: string;
  approvalToken: string;
  generatedAt: string;
}

export interface DraftMutationExecutionPlanInput {
  operation: DraftLifecycleOperation;
  publicationUrl: string;
  draftId: string;
  probeReport: DraftMutationProbeReport;
  actor: string;
  publicationId: number | null;
  beforeState?: DraftMutationPlanState | undefined;
  afterState?: DraftMutationPlanState | undefined;
  draftUpdatedAt?: string | undefined;
  ttlSeconds?: number | undefined;
}

export interface DraftMutationExecutionResult {
  status: "success" | "failed";
  operation: DraftLifecycleOperation;
  method: DraftMutationMethod;
  draftId: string;
  endpointTemplate: string;
  endpoint: string;
  publishedUrl?: string | undefined;
  message: string;
  statusCode: number;
  error?: string | undefined;
  retryAttempts?: number | undefined;
  sourceProbe?: DraftMutationProbeCandidate | undefined;
}

export interface DraftMutationActionReplayState {
  schemaVersion: 1;
  actions: Array<{
    actionId: string;
    planHash: string;
    consumedAt: string;
  }>;
}

export interface DraftMutationActionReplayResult {
  status: "ok" | "consumed" | "hash-mismatch";
  existingPlanHash?: string | undefined;
}

export interface DraftMutationPlanRecord {
  planSchemaVersion: 1;
  operation: DraftLifecycleOperation;
  draftId: string;
  publicationUrl: string;
  actor: string;
  actionId: string;
  planHash: string;
  approvalToken: string;
  expiresAt: string;
  generatedAt: string;
  beforeState: DraftMutationPlanState;
  afterState: DraftMutationPlanState;
}

type DraftMutationStateValue = string | number | boolean | null;
type DraftMutationPlanState = Record<string, DraftMutationStateValue>;

type DraftMutationEndpoint = {
  operation: DraftLifecycleOperation;
  endpointTemplate: string;
  priority: number;
  method: DraftMutationMethod;
};

export const DraftMutationReplayCheckOkStatus = "ok";

const DRAFT_OPERATION_PROBES: DraftMutationEndpoint[] = [
  {
    operation: "unschedule",
    endpointTemplate: "/api/v1/drafts/{draftId}/unpublish",
    priority: 0,
    method: "POST",
  },
  {
    operation: "unschedule",
    endpointTemplate: "/api/v1/posts/{draftId}/unpublish",
    priority: 1,
    method: "POST",
  },
  {
    operation: "unschedule",
    endpointTemplate: "/api/v1/drafts/{draftId}/schedule",
    priority: 2,
    method: "POST",
  },
  {
    operation: "revise",
    endpointTemplate: "/api/v1/posts/{draftId}/revise",
    priority: 0,
    method: "POST",
  },
  {
    operation: "revise",
    endpointTemplate: "/api/v1/drafts/{draftId}/revise",
    priority: 1,
    method: "POST",
  },
];

function makeEndpoint(publicationUrl: string, draftId: string, template: string): string {
  const safeDraftId = encodeURIComponent(draftId);
  return new URL(template.replaceAll("{draftId}", safeDraftId), publicationUrl).toString();
}

function classifyProbeStatus(status: number): DraftMutationSignal {
  if (status === 0) {
    return "network-error";
  }
  if (status === 401) {
    return "unauthorized";
  }
  if (status === 403) {
    return "forbidden";
  }
  if (status === 404) {
    return "not-found";
  }
  if (status === 405) {
    return "method-mismatch";
  }
  if (status >= 200 && status < 500) {
    return "likely-route";
  }
  return "unexpected";
}

export function buildDraftMutationActionId(
  publicationUrl: string,
  actor: string,
  operation: DraftLifecycleOperation,
  draftId: string,
  publicationId: number | null,
): string {
  const seed = `${normalizePublicationUrl(publicationUrl)}|${publicationId ?? "unknown"}|${actor}|${operation}|${draftId}`;
  return createHash("sha256").update(seed).digest("hex");
}

export function buildDraftMutationContentHash(
  draftId: string,
  actor: string,
  operation: DraftLifecycleOperation,
  beforeState: DraftMutationPlanState,
  afterState: DraftMutationPlanState,
  publicationId: number | null,
  draftUpdatedAt?: string | undefined,
): string {
  return createHash("sha256")
    .update(
      stableCanonicalize({
        draftId,
        actor,
        operation,
        publicationId,
        draftUpdatedAt,
        beforeState,
        afterState,
      }),
    )
    .digest("hex");
}

export function buildDraftMutationApprovalToken(
  planHash: string,
  actor: string,
  expiresAt: string,
): string {
  return createHash("sha256").update(`${planHash}|${actor}|${expiresAt}`).digest("hex");
}

export function makeDraftMutationProbeSignalSeed(probes: DraftMutationProbeCandidate[]): string {
  return probes
    .map((probe) => `${probe.endpointTemplate}:${probe.signal}`)
    .sort()
    .join("|");
}

export function buildDraftMutationPlanHash(plan: Omit<DraftMutationExecutionPlan, "approvalToken">): string {
  return createHash("sha256")
    .update(
      stableCanonicalize({
        planSchemaVersion: plan.planSchemaVersion,
        operation: plan.operation,
        draftId: plan.draftId,
        draftUrl: plan.draftUrl,
        publicationUrl: plan.publicationUrl,
        endpointTemplate: plan.endpointTemplate,
        endpoint: plan.endpoint,
        method: plan.method,
        sourceProbe: {
          endpointTemplate: plan.sourceProbe.endpointTemplate,
          status: plan.sourceProbe.status,
          signal: plan.sourceProbe.signal,
          evidence: plan.sourceProbe.evidence,
        },
        actionId: plan.actionId,
        actor: plan.actor,
        publicationId: plan.publicationId,
        draftUpdatedAt: plan.draftUpdatedAt,
        contentHash: plan.contentHash,
        beforeState: plan.beforeState,
        afterState: plan.afterState,
        expiresAt: plan.expiresAt,
        generatedAt: plan.generatedAt,
      }),
    )
    .digest("hex");
}

export function isDraftMutationPlanExpired(plan: DraftMutationExecutionPlan, now = new Date()): boolean {
  return Date.parse(plan.expiresAt) <= now.getTime();
}

export function hasMatchingDraftMutationBeforeState(
  expected: DraftMutationPlanState,
  observed: DraftMutationPlanState,
): boolean {
  return stableCanonicalize(expected) === stableCanonicalize(observed);
}

export function normalizeDraftMutationState(
  value: Record<string, unknown> | undefined,
): DraftMutationPlanState {
  if (!value) return {};

  return Object.fromEntries(
    Object.entries(value)
      .sort(([a], [b]) => a.localeCompare(b))
      .filter(([, rawValue]) => {
        return (
          rawValue === null ||
          typeof rawValue === "string" ||
          typeof rawValue === "number" ||
          typeof rawValue === "boolean"
        );
      })
      .map(([key, rawValue]) => {
        return [key, normalizeDraftMutationStateScalar(rawValue as DraftMutationStateValue)] as const;
      }),
  );
}

function normalizeDraftMutationStateScalar(
  value: DraftMutationStateValue,
): DraftMutationStateValue {
  if (typeof value === "string" && value.length > MAX_STATE_VALUE_LENGTH) {
    return value.slice(0, MAX_STATE_VALUE_LENGTH);
  }
  return value;
}

export async function verifyDraftMutationExecutionPlan(
  plan: DraftMutationExecutionPlan,
): Promise<boolean> {
  if (plan.planSchemaVersion !== DRAFT_MUTATION_ACTION_SCHEMA_VERSION) {
    return false;
  }
  if (typeof plan.actionId !== "string" || plan.actionId.length === 0) {
    return false;
  }
  if (typeof plan.planHash !== "string" || plan.planHash.length === 0) {
    return false;
  }
  if (typeof plan.approvalToken !== "string" || plan.approvalToken.length === 0) {
    return false;
  }

  const token = buildDraftMutationApprovalToken(plan.planHash, plan.actor, plan.expiresAt);
  if (token !== plan.approvalToken) {
    return false;
  }

  const expectedHash = buildDraftMutationPlanHash(plan);
  return expectedHash === plan.planHash;
}

export async function isDraftMutationPlanReplaySafe(
  plan: DraftMutationExecutionPlan,
  planReplayStatePath = draftMutationActionsFilePath(),
): Promise<DraftMutationActionReplayResult> {
  const state = await readDraftMutationReplayState(planReplayStatePath);
  const existing = state.actions.find((action) => action.actionId === plan.actionId);
  if (!existing) {
    return { status: "ok" };
  }

  if (existing.planHash !== plan.planHash) {
    return { status: "hash-mismatch", existingPlanHash: existing.planHash };
  }

  return { status: "consumed" };
}

export async function consumeDraftMutationActionPlan(
  plan: DraftMutationExecutionPlan,
  planReplayStatePath = draftMutationActionsFilePath(),
): Promise<DraftMutationActionReplayResult> {
  const check = await isDraftMutationPlanReplaySafe(plan, planReplayStatePath);
  if (check.status !== "ok") {
    return check;
  }

  const state = await readDraftMutationReplayState(planReplayStatePath);
  state.actions.push({
    actionId: plan.actionId,
    planHash: plan.planHash,
    consumedAt: new Date().toISOString(),
  });
  await writeDraftMutationReplayState(planReplayStatePath, state);
  return check;
}

async function readDraftMutationReplayState(
  path: string = draftMutationActionsFilePath(),
): Promise<DraftMutationActionReplayState> {
  try {
    const payload = JSON.parse(await readFile(path, "utf8"));
    if (isDraftMutationActionReplayState(payload)) return payload;
  } catch {
    // no persisted state yet
  }

  return {
    schemaVersion: DRAFT_MUTATION_ACTION_SCHEMA_VERSION,
    actions: [],
  };
}

function isDraftMutationActionReplayState(
  value: unknown,
): value is DraftMutationActionReplayState {
  if (!isRecord(value)) return false;
  if (value.schemaVersion !== DRAFT_MUTATION_ACTION_SCHEMA_VERSION) return false;
  if (!Array.isArray(value.actions)) return false;
  return value.actions.every((action) => {
    if (!isRecord(action)) return false;
    if (typeof action.actionId !== "string" || action.actionId.length === 0) return false;
    if (typeof action.planHash !== "string" || action.planHash.length === 0) return false;
    if (typeof action.consumedAt !== "string" || action.consumedAt.length === 0) return false;
    return true;
  });
}

async function writeDraftMutationReplayState(
  path: string,
  state: DraftMutationActionReplayState,
): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(state, null, 2)}\n`, "utf8");
}

export async function probeDraftMutationEndpoints(
  material: ApiAuthMaterial,
  fetchImpl: FetchLike,
  draftId: string,
): Promise<DraftMutationProbeReport> {
  const headers = apiHeaders(material);
  const probes = await Promise.all(
    DRAFT_OPERATION_PROBES.map(async (candidate) => {
      const endpoint = makeEndpoint(material.publicationUrl, draftId, candidate.endpointTemplate);
      let status = 0;
      try {
        const response = await fetchImpl(endpoint, { method: "GET", headers });
        status = response.status;
      } catch {
        status = 0;
      }

      const signal = classifyProbeStatus(status);
      return {
        operation: candidate.operation,
        endpointTemplate: candidate.endpointTemplate,
        endpoint,
        probeMethod: "GET" as const,
        status,
        signal,
        evidence: buildProbeEvidence(signal, candidate.endpointTemplate, status),
      };
    }),
  );

  const supportsUnschedule = probes.some(
    (probe) =>
      probe.operation === "unschedule" &&
      (probe.signal === "likely-route" || probe.signal === "method-mismatch"),
  );
  const supportsRevise = probes.some(
    (probe) =>
      probe.operation === "revise" &&
      (probe.signal === "likely-route" || probe.signal === "method-mismatch"),
  );

  const generatedAt = new Date().toISOString();
  const message =
    supportsUnschedule || supportsRevise
      ? "At least one mutation endpoint shape appears reachable under the current session."
      : "No draft mutation endpoint shapes were confirmed. Use capture-in-loop methods to gather first-party evidence before attempting writes.";

  return {
    status: "probed",
    operation: "draft.mutation-probe",
    publicationUrl: material.publicationUrl,
    draftId,
    endpointCount: probes.length,
    reportId: makeDraftMutationReportId(material.publicationUrl, draftId, generatedAt),
    generatedAt,
    approvalToken: "",
    probes,
    supportsUnschedule,
    supportsRevise,
    message,
  };
}

export function buildDraftMutationExecutionPlan(
  input: DraftMutationExecutionPlanInput,
): DraftMutationExecutionPlan | null {
  const templatePlan = DRAFT_OPERATION_PROBES.filter(
    (candidate) => candidate.operation === input.operation,
  );
  const candidates = pickCandidateProbes(input.operation, input.probeReport);
  const sourceProbe = candidates.find((candidate) =>
    templatePlan.some((template) => template.endpointTemplate === candidate.endpointTemplate),
  );
  if (!sourceProbe) {
    return null;
  }

  const template = templatePlan.find((entry) => entry.endpointTemplate === sourceProbe.endpointTemplate);
  if (!template) {
    return null;
  }

  const generatedAt = new Date().toISOString();
  const expiresAt = new Date(
    Date.parse(generatedAt) + (input.ttlSeconds ?? DEFAULT_DRAFT_MUTATION_TTL_SECONDS) * 1000,
  ).toISOString();
  const publicationId = input.publicationId ?? null;
  const beforeState = normalizeDraftMutationState(input.beforeState);
  const afterState = normalizeDraftMutationState(input.afterState);
  const actionId = buildDraftMutationActionId(
    input.publicationUrl,
    input.actor,
    input.operation,
    input.draftId,
    publicationId,
  );
  const contentHash = buildDraftMutationContentHash(
    input.draftId,
    input.actor,
    input.operation,
    beforeState,
    afterState,
    publicationId,
    input.draftUpdatedAt,
  );

  const draftUrl = new URL(
    `/publish/post/${encodeURIComponent(input.draftId)}`,
    input.publicationUrl,
  ).toString();
  const endpoint = makeEndpoint(input.publicationUrl, input.draftId, template.endpointTemplate);

  const planWithoutToken: Omit<DraftMutationExecutionPlan, "approvalToken"> = {
    planSchemaVersion: DRAFT_MUTATION_ACTION_SCHEMA_VERSION,
    operation: input.operation,
    draftId: input.draftId,
    draftUrl,
    publicationUrl: input.publicationUrl,
    endpointTemplate: template.endpointTemplate,
    endpoint,
    method: template.method,
    sourceProbe,
    actionId,
    planHash: "",
    actor: input.actor,
    publicationId,
    draftUpdatedAt: input.draftUpdatedAt,
    contentHash,
    beforeState,
    afterState,
    generatedAt,
    expiresAt,
  };

  const planHash = buildDraftMutationPlanHash(planWithoutToken);
  return {
    ...planWithoutToken,
    planHash,
    approvalToken: buildDraftMutationApprovalToken(planHash, input.actor, expiresAt),
  };
}

function pickCandidateProbes(
  operation: DraftLifecycleOperation,
  probeReport: DraftMutationProbeReport,
): DraftMutationProbeCandidate[] {
  const templatePriority = new Map(
    DRAFT_OPERATION_PROBES.filter((candidate) => candidate.operation === operation).map(
      (template) => [template.endpointTemplate, template.priority] as const,
    ),
  );

  return [...probeReport.probes]
    .filter(
      (probe) =>
        probe.operation === operation &&
        (probe.signal === "likely-route" || probe.signal === "method-mismatch"),
    )
    .sort((a: DraftMutationProbeCandidate, b: DraftMutationProbeCandidate) => {
      const priorityA = templatePriority.get(a.endpointTemplate) ?? Number.POSITIVE_INFINITY;
      const priorityB = templatePriority.get(b.endpointTemplate) ?? Number.POSITIVE_INFINITY;
      if (priorityA !== priorityB) {
        return priorityA - priorityB;
      }
      if (a.signal !== b.signal) {
        return a.signal === "likely-route" ? -1 : 1;
      }
      return a.endpointTemplate.localeCompare(b.endpointTemplate);
    });
}

export async function executeDraftMutation(
  plan: DraftMutationExecutionPlan,
  material: ApiAuthMaterial,
  fetchImpl: FetchLike,
): Promise<DraftMutationExecutionResult> {
  if (plan.method === "DELETE") {
    const response = await requestDelete(fetchImpl, plan.endpoint, apiHeaders(material));
    return buildDeleteMutationResult(plan, response.status, response.body);
  }

  const response = await requestWrite(fetchImpl, plan.endpoint, "POST", apiHeaders(material), {});
  return buildWriteMutationResult(plan, response.status, response.body, response.retryAttempts);
}

function buildWriteMutationResult(
  plan: DraftMutationExecutionPlan,
  statusCode: number,
  responseBody: unknown,
  retryAttempts: number | undefined,
): DraftMutationExecutionResult {
  if (statusCode === 0) {
    return {
      status: "failed",
      operation: plan.operation,
      method: plan.method,
      draftId: plan.draftId,
      endpointTemplate: plan.endpointTemplate,
      endpoint: plan.endpoint,
      statusCode,
      message: "Network error: failed to reach Substack while attempting draft mutation.",
      error: "Network error",
      retryAttempts,
      sourceProbe: plan.sourceProbe,
    };
  }

  if (statusCode >= 400) {
    return {
      status: "failed",
      operation: plan.operation,
      method: plan.method,
      draftId: plan.draftId,
      endpointTemplate: plan.endpointTemplate,
      endpoint: plan.endpoint,
      statusCode,
      message: `Substack returned HTTP ${statusCode}.`,
      error: `HTTP ${statusCode}`,
      retryAttempts,
      sourceProbe: plan.sourceProbe,
    };
  }

  const record = isRecord(responseBody) ? responseBody : {};
  const publishedUrl =
    typeof record.post_url === "string"
      ? record.post_url
      : typeof record.url === "string"
        ? record.url
        : undefined;

  return {
    status: "success",
    operation: plan.operation,
    method: plan.method,
    draftId: plan.draftId,
    endpointTemplate: plan.endpointTemplate,
    endpoint: plan.endpoint,
    publishedUrl,
    statusCode,
    message:
      plan.operation === "unschedule"
        ? `Unschedule mutation succeeded for draft ${plan.draftId}.`
        : `Revise mutation succeeded for draft ${plan.draftId}.`,
    retryAttempts,
    sourceProbe: plan.sourceProbe,
  };
}

function buildDeleteMutationResult(
  plan: DraftMutationExecutionPlan,
  statusCode: number,
  responseBody: unknown,
): DraftMutationExecutionResult {
  if (statusCode === 0) {
    return {
      status: "failed",
      operation: plan.operation,
      method: plan.method,
      draftId: plan.draftId,
      endpointTemplate: plan.endpointTemplate,
      endpoint: plan.endpoint,
      statusCode,
      message: "Network error: failed to reach Substack while attempting draft mutation.",
      error: "Network error",
      sourceProbe: plan.sourceProbe,
    };
  }

  if (statusCode >= 400) {
    return {
      status: "failed",
      operation: plan.operation,
      method: plan.method,
      draftId: plan.draftId,
      endpointTemplate: plan.endpointTemplate,
      endpoint: plan.endpoint,
      statusCode,
      message: `Substack returned HTTP ${statusCode}.`,
      error: `HTTP ${statusCode}`,
      sourceProbe: plan.sourceProbe,
    };
  }

  void responseBody;
  return {
    status: "success",
    operation: plan.operation,
    method: plan.method,
    draftId: plan.draftId,
    endpointTemplate: plan.endpointTemplate,
    endpoint: plan.endpoint,
    statusCode,
    message:
      plan.operation === "unschedule"
        ? `Unschedule mutation succeeded for draft ${plan.draftId}.`
        : `Revise mutation succeeded for draft ${plan.draftId}.`,
    sourceProbe: plan.sourceProbe,
  };
}

function buildProbeEvidence(
  signal: DraftMutationSignal,
  endpointTemplate: string,
  status: number,
): string[] {
  if (signal === "method-mismatch") {
    return [
      `${endpointTemplate} returned ${status}; route likely exists but does not accept GET probes.`,
      "Use a browser traffic capture or live integration tests before enabling writes.",
    ];
  }
  if (signal === "likely-route") {
    return [
      `${endpointTemplate} responded with ${status}; route is likely active and should be reviewed before mutation.`,
    ];
  }
  if (signal === "not-found") {
    return [`${endpointTemplate} returned 404; this path is unlikely for the current session.`];
  }
  if (signal === "unauthorized") {
    return [
      `${endpointTemplate} returned 401; validate auth before treating this as a route signal.`,
    ];
  }
  if (signal === "forbidden") {
    return [`${endpointTemplate} returned 403; account role likely blocked this endpoint path.`];
  }
  if (signal === "network-error") {
    return [
      `${endpointTemplate} could not be reached from local probe transport; retry with network access restored.`,
    ];
  }
  return [
    `${endpointTemplate} returned ${status}; classification is uncertain without route-level evidence.`,
  ];
}

function makeDraftMutationReportId(
  publicationUrl: string,
  draftId: string,
  generatedAt: string,
): string {
  return createHash("sha256")
    .update(`${normalizePublicationUrl(publicationUrl)}|${draftId}|${generatedAt}`)
    .digest("hex");
}

function normalizePublicationUrl(publicationUrl: string): string {
  const url = new URL(publicationUrl);
  url.pathname = "/";
  url.search = "";
  url.hash = "";
  return url.toString();
}

function stableCanonicalize(value: unknown): string {
  return JSON.stringify(sortForCanonical(value));
}

function sortForCanonical(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortForCanonical);
  }
  if (!isRecord(value)) return value;

  const output = Object.entries(value)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, fieldValue]) => [key, sortForCanonical(fieldValue)] as const);
  return Object.fromEntries(output);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
