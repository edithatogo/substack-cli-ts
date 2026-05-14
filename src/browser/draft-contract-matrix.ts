import { readFile, writeFile } from "node:fs/promises";
import { z } from "zod";
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

export interface DraftContractMatrixFixtureOptions {
  outFile: string;
}

export interface DraftContractMatrixComparison {
  equal: boolean;
  expected: DraftContractMatrixReport;
  actual: DraftContractMatrixReport;
  differences: string[];
}

type ConfidenceRank = Record<DraftContractMatrixRow["confidence"], number>;

const CONFIDENCE_RANK: ConfidenceRank = {
  low: 0,
  medium: 1,
  high: 2,
};

const DraftContractMatrixRowSchema = z.object({
  operation: z.union([z.literal("create"), z.literal("update"), z.literal("fetch")]),
  method: z.union([z.literal("GET"), z.literal("POST"), z.literal("PUT"), z.literal("PATCH")]),
  endpoint: z.string().min(1),
  confidence: z.union([z.literal("low"), z.literal("medium"), z.literal("high")]),
  occurrences: z.number().int().nonnegative(),
  sourceFiles: z.array(z.string()),
  evidence: z.array(z.string()),
  requestBodyKeys: z.array(z.string()),
  responseKeys: z.array(z.string()),
});

const DraftContractMatrixReportSchema = z.object({
  status: z.union([z.literal("inferred"), z.literal("insufficient-data")]),
  captureCount: z.number().int().nonnegative(),
  sourceFiles: z.array(z.string()),
  rowCount: z.number().int().nonnegative(),
  rows: z.array(DraftContractMatrixRowSchema),
  note: z.string().min(1),
});

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
      existing.confidence = strongerConfidence(existing.confidence, candidate.confidence);
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

    const confidenceDelta = CONFIDENCE_RANK[right.confidence] - CONFIDENCE_RANK[left.confidence];
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

export async function writeDraftContractMatrixFixture(
  inputs: DraftContractMatrixInput[],
  options: DraftContractMatrixFixtureOptions,
): Promise<DraftContractMatrixReport> {
  const report = buildDraftContractMatrix(inputs);
  await writeFile(options.outFile, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  return report;
}

export async function reviewDraftContractMatrixArtifact(
  filePath: string,
): Promise<DraftContractMatrixReport> {
  const raw = await readFile(filePath, "utf8");
  const json = JSON.parse(raw) as unknown;
  return DraftContractMatrixReportSchema.parse(json);
}

export async function compareDraftContractMatrixArtifacts(
  expectedFile: string,
  actualFile: string,
): Promise<DraftContractMatrixComparison> {
  const [expected, actual] = await Promise.all([
    reviewDraftContractMatrixArtifact(expectedFile),
    reviewDraftContractMatrixArtifact(actualFile),
  ]);

  const differences = diffDraftContractMatrixReports(expected, actual);

  return {
    equal: differences.length === 0,
    expected,
    actual,
    differences,
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

function diffDraftContractMatrixReports(
  expected: DraftContractMatrixReport,
  actual: DraftContractMatrixReport,
): string[] {
  const differences: string[] = [];

  compareField(differences, "status", expected.status, actual.status);
  compareField(differences, "captureCount", expected.captureCount, actual.captureCount);
  compareField(differences, "sourceFiles", expected.sourceFiles, actual.sourceFiles);
  compareField(differences, "rowCount", expected.rowCount, actual.rowCount);
  compareField(differences, "rows", expected.rows, actual.rows);
  compareField(differences, "note", expected.note, actual.note);

  return differences;
}

function compareField(
  differences: string[],
  name: string,
  expected: unknown,
  actual: unknown,
): void {
  if (stableStringify(expected) !== stableStringify(actual)) {
    differences.push(`${name}: ${stableValue(expected)} != ${stableValue(actual)}`);
  }
}

function stableStringify(value: unknown): string {
  const serialized = stringifyMaybe(value);
  return serialized === undefined ? "undefined" : serialized;
}

function stringifyMaybe(value: unknown): string | undefined {
  if (value === undefined) {
    return undefined;
  }

  return JSON.stringify(sortValue(value));
}

function sortValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortValue);
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, child]) => [key, sortValue(child)]),
    );
  }

  return value;
}

function stableValue(value: unknown): string {
  return stableStringify(value);
}
