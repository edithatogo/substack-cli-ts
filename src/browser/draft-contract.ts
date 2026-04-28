import type { DraftCaptureReview } from "./draft-capture.js";

export type DraftContractConfidence = "low" | "medium" | "high";

export interface DraftContractCandidate {
  operation: "create" | "update" | "fetch";
  method: "GET" | "POST" | "PUT" | "PATCH";
  endpoint: string;
  confidence: DraftContractConfidence;
  evidence: string[];
  requestBodyKeys: string[];
  responseKeys: string[];
}

export interface DraftContractReport {
  status: "inferred" | "insufficient-data";
  captureSummary: {
    publicationUrl: string;
    pageUrl: string;
    requestCount: number;
    responseCount: number;
  };
  candidates: DraftContractCandidate[];
  note: string;
}

export function inferDraftContract(
  review: DraftCaptureReview,
): DraftContractReport {
  const candidates = review.requestEndpoints.flatMap((request) =>
    inferCandidatesFromRequest(request, review.responseEndpoints),
  );

  const deduped = dedupeCandidates(candidates);

  return {
    status: deduped.length > 0 ? "inferred" : "insufficient-data",
    captureSummary: {
      publicationUrl: review.publicationUrl,
      pageUrl: review.pageUrl,
      requestCount: review.requestCount,
      responseCount: review.responseCount,
    },
    candidates: deduped,
    note: "This report infers likely draft endpoints from a redacted local capture. It does not confirm the live contract.",
  };
}

function inferCandidatesFromRequest(
  request: DraftCaptureReview["requestEndpoints"][number],
  responses: DraftCaptureReview["responseEndpoints"],
): DraftContractCandidate[] {
  const candidates: DraftContractCandidate[] = [];
  const lowerUrl = request.url.toLowerCase();
  const lowerKeys = request.bodyKeys.map((key) => key.toLowerCase());
  const responseKeys = responses.flatMap((response) => response.topLevelKeys);
  const responseHints = responses
    .map((response) => response.draftUrl ?? response.slug ?? response.id)
    .filter(Boolean);

  if (lowerUrl.includes("/api/v1/drafts")) {
    if (request.method === "POST") {
      candidates.push({
        operation: "create",
        method: "POST",
        endpoint: "/api/v1/drafts",
        confidence: hasDraftishKeys(lowerKeys) ? "high" : "medium",
        evidence: [
          "Request targets the drafts collection.",
          `Observed request body keys: ${request.bodyKeys.join(", ") || "none"}.`,
          `Observed response hints: ${responseHints.join(", ") || "none"}.`,
        ],
        requestBodyKeys: [...request.bodyKeys],
        responseKeys: [...new Set(responseKeys)].sort(),
      });
    }

    if (request.method === "PUT" || request.method === "PATCH") {
      candidates.push({
        operation: "update",
        method: request.method,
        endpoint: "/api/v1/drafts/{id}",
        confidence: request.bodyKeys.length > 0 ? "high" : "medium",
        evidence: [
          "Request targets a draft-specific endpoint.",
          `Observed request body keys: ${request.bodyKeys.join(", ") || "none"}.`,
        ],
        requestBodyKeys: [...request.bodyKeys],
        responseKeys: [...new Set(responseKeys)].sort(),
      });
    }

    if (request.method === "GET") {
      candidates.push({
        operation: "fetch",
        method: "GET",
        endpoint: "/api/v1/drafts/{id}",
        confidence: "medium",
        evidence: ["Observed a GET request under the drafts API path."],
        requestBodyKeys: [...request.bodyKeys],
        responseKeys: [...new Set(responseKeys)].sort(),
      });
    }
  }

  if (lowerUrl.includes("/api/v1/posts") && request.method === "GET") {
    candidates.push({
      operation: "fetch",
      method: "GET",
      endpoint: "/api/v1/posts/{id}",
      confidence: "medium",
      evidence: ["Observed a posts API request in the draft capture."],
      requestBodyKeys: [...request.bodyKeys],
      responseKeys: [...new Set(responseKeys)].sort(),
    });
  }

  return candidates;
}

function hasDraftishKeys(keys: string[]): boolean {
  return keys.some((key) =>
    ["title", "body", "content", "draft", "metadata", "slug"].includes(key),
  );
}

function dedupeCandidates(
  candidates: DraftContractCandidate[],
): DraftContractCandidate[] {
  const seen = new Set<string>();

  return candidates.filter((candidate) => {
    const key = `${candidate.operation}:${candidate.method}:${candidate.endpoint}:${candidate.confidence}`;
    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}
