import type { DraftCaptureReview } from "./draft-capture.js";
import { inferDraftContract } from "./draft-contract.js";

export interface DraftContractMatrixInput {
  sourceFile: string;
  review: DraftCaptureReview;
}

export interface DraftContractMatrixRow {
  operation: "create" | "update" | "fetch";
  method: "GET" | "POST" | "PUT" | "PATCH";
  endpoint: string;
  confidence: "low" | "medium" | "high";
  occurrences: number;
  sourceFiles: string[];
  evidence: string[];
  requestBodyKeys: string[];
  responseKeys: string[];
}

export interface DraftContractMatrixReport {
  status: "inferred" | "insufficient-data";
  captureCount: number;
  sourceFiles: string[];
  rowCount: number;
  rows: DraftContractMatrixRow[];
  note: string;
}

type ConfidenceRank = Record<DraftContractMatrixRow["confidence"], number>;

const CONFIDENCE_RANK: ConfidenceRank = {
  low: 0,
  medium: 1,
  high: 2,
};

export function buildDraftContractMatrix(
  inputs: DraftContractMatrixInput[],
): DraftContractMatrixReport {
  const rows = new Map<string, DraftContractMatrixRow>();
  const sourceFiles: string[] = [];

  for (const input of inputs) {
    sourceFiles.push(input.sourceFile);
    const report = inferDraftContract(input.review);

    for (const candidate of report.candidates) {
      const key = `${candidate.operation}:${candidate.method}:${candidate.endpoint}`;
      const existing = rows.get(key);

      if (existing === undefined) {
        rows.set(key, {
          operation: candidate.operation,
          method: candidate.method,
          endpoint: candidate.endpoint,
          confidence: candidate.confidence,
          occurrences: 1,
          sourceFiles: [input.sourceFile],
          evidence: [...candidate.evidence],
          requestBodyKeys: [...candidate.requestBodyKeys],
          responseKeys: [...candidate.responseKeys],
        });
        continue;
      }

      existing.occurrences += 1;
      existing.confidence = strongerConfidence(
        existing.confidence,
        candidate.confidence,
      );
      if (!existing.sourceFiles.includes(input.sourceFile)) {
        existing.sourceFiles.push(input.sourceFile);
      }
      mergeUnique(existing.evidence, candidate.evidence);
      mergeUnique(existing.requestBodyKeys, candidate.requestBodyKeys);
      mergeUnique(existing.responseKeys, candidate.responseKeys);
    }
  }

  const orderedRows = [...rows.values()].sort((left, right) => {
    if (right.occurrences !== left.occurrences) {
      return right.occurrences - left.occurrences;
    }

    const confidenceDelta =
      CONFIDENCE_RANK[right.confidence] - CONFIDENCE_RANK[left.confidence];
    if (confidenceDelta !== 0) {
      return confidenceDelta;
    }

    return left.endpoint.localeCompare(right.endpoint);
  });

  return {
    status: orderedRows.length > 0 ? "inferred" : "insufficient-data",
    captureCount: inputs.length,
    sourceFiles,
    rowCount: orderedRows.length,
    rows: orderedRows,
    note: "This matrix merges multiple redacted capture reviews. It highlights recurring candidates, but it does not confirm the live contract.",
  };
}

function strongerConfidence(
  current: DraftContractMatrixRow["confidence"],
  next: DraftContractMatrixRow["confidence"],
): DraftContractMatrixRow["confidence"] {
  return CONFIDENCE_RANK[next] > CONFIDENCE_RANK[current] ? next : current;
}

function mergeUnique(target: string[], source: string[]): void {
  for (const value of source) {
    if (!target.includes(value)) {
      target.push(value);
    }
  }
}
