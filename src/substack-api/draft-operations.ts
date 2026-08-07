import type { ApiAuthMaterial } from "./auth.js";
import { apiHeaders } from "./client.js";
import type { FetchLike } from "./client.js";

export type DraftLifecycleOperation = "unschedule" | "revise";

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
  probes: DraftMutationProbeCandidate[];
  supportsUnschedule: boolean;
  supportsRevise: boolean;
  message: string;
}

type DraftMutationEndpoint = {
  operation: DraftLifecycleOperation;
  endpointTemplate: string;
};

const DRAFT_OPERATION_PROBES: DraftMutationEndpoint[] = [
  { operation: "unschedule", endpointTemplate: "/api/v1/drafts/{draftId}/unpublish" },
  { operation: "unschedule", endpointTemplate: "/api/v1/drafts/{draftId}/schedule" },
  { operation: "unschedule", endpointTemplate: "/api/v1/posts/{draftId}/unpublish" },
  { operation: "revise", endpointTemplate: "/api/v1/posts/{draftId}/revise" },
  { operation: "revise", endpointTemplate: "/api/v1/drafts/{draftId}/revise" },
];

function makeEndpoint(material: ApiAuthMaterial, draftId: string, template: string): string {
  const safeDraftId = encodeURIComponent(draftId);
  return new URL(template.replaceAll("{draftId}", safeDraftId), material.publicationUrl).toString();
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

export async function probeDraftMutationEndpoints(
  material: ApiAuthMaterial,
  fetchImpl: FetchLike,
  draftId: string,
): Promise<DraftMutationProbeReport> {
  const headers = apiHeaders(material);
  const probes = await Promise.all(
    DRAFT_OPERATION_PROBES.map(async (candidate) => {
      const endpoint = makeEndpoint(material, draftId, candidate.endpointTemplate);
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
    probes,
    supportsUnschedule,
    supportsRevise,
    message,
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
