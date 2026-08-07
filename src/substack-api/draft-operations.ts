import { createHash } from "node:crypto";
import type { ApiAuthMaterial } from "./auth.js";
import { apiHeaders, requestDelete, requestWrite } from "./client.js";
import type { FetchLike } from "./client.js";

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
  operation: DraftLifecycleOperation;
  draftId: string;
  draftUrl: string;
  publicationUrl: string;
  endpointTemplate: string;
  endpoint: string;
  method: DraftMutationMethod;
  sourceProbe: DraftMutationProbeCandidate;
}

export interface DraftMutationExecutionPlanInput {
  operation: DraftLifecycleOperation;
  publicationUrl: string;
  draftId: string;
  probeReport: DraftMutationProbeReport;
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

type DraftMutationEndpoint = {
  operation: DraftLifecycleOperation;
  endpointTemplate: string;
  priority: number;
  method: DraftMutationMethod;
};

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

export function buildDraftMutationApprovalToken(
  publicationUrl: string,
  draftId: string,
  generatedAt: string,
  probeSignalSeed: string,
): string {
  const normalized = normalizePublicationUrl(publicationUrl);
  const payload = `${normalized}|${draftId}|${generatedAt}|${probeSignalSeed}`;
  return createHash("sha256").update(payload).digest("hex");
}

export function makeDraftMutationProbeSignalSeed(probes: DraftMutationProbeCandidate[]): string {
  return probes
    .map((probe) => `${probe.endpointTemplate}:${probe.signal}`)
    .sort()
    .join("|");
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
  const signalSeed = makeDraftMutationProbeSignalSeed(probes);
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
    approvalToken: buildDraftMutationApprovalToken(material.publicationUrl, draftId, generatedAt, signalSeed),
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

  const template = templatePlan.find(
    (entry) => entry.endpointTemplate === sourceProbe.endpointTemplate,
  );
  if (!template) {
    return null;
  }

  return {
    operation: input.operation,
    draftId: input.draftId,
    publicationUrl: input.publicationUrl,
    draftUrl: new URL(`/publish/post/${encodeURIComponent(input.draftId)}`, input.publicationUrl)
      .toString(),
    endpointTemplate: template.endpointTemplate,
    endpoint: makeEndpoint(input.publicationUrl, input.draftId, template.endpointTemplate),
    method: template.method,
    sourceProbe,
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

  return buildWriteMutationResult(
    plan,
    response.status,
    response.body,
    response.retryAttempts,
  );
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

function makeDraftMutationReportId(publicationUrl: string, draftId: string, generatedAt: string): string {
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
