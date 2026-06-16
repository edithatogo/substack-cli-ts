import { readFile } from "node:fs/promises";
import { FRONTIER_COVERAGE_MATRIX } from "./matrix.js";
import { renderCoverageRoadmap } from "./roadmap.js";
import {
  parseCoverageMatrix,
  summarizeCoverageMatrix,
  validateCoverageMatrix,
  type CoverageCapability,
  type CoverageMatrix,
  type CoverageStatus,
} from "./schema.js";

export interface CoverageValidationOutput {
  operation: "coverage.validate";
  status: "ready" | "blocked";
  issueCount: number;
  summary: ReturnType<typeof summarizeCoverageMatrix>;
  issues: ReturnType<typeof validateCoverageMatrix>["issues"];
}

export interface CoverageReportOutput {
  operation: "coverage.report";
  status: "ready" | "blocked";
  summary: ReturnType<typeof summarizeCoverageMatrix>;
  capabilities: CoverageCapability[];
}

export interface CoverageGapOutput {
  operation: "coverage.gaps";
  status: "ready" | "blocked";
  filter: {
    status?: CoverageStatus | undefined;
    domain?: CoverageCapability["domain"] | undefined;
  };
  count: number;
  gaps: CoverageCapability[];
}

export interface CoverageDecisionOutput {
  operation: "coverage.decisions";
  status: "ready" | "blocked";
  id?: string | undefined;
  count: number;
  decisions: Array<{
    capabilityId: string;
    capability: string;
    status: CoverageStatus;
    decisionRecord: NonNullable<CoverageCapability["decisionRecord"]>;
    nextAction: string;
  }>;
}

export async function loadCoverageMatrix(path?: string | undefined): Promise<CoverageMatrix> {
  if (!path) return FRONTIER_COVERAGE_MATRIX;
  return parseCoverageMatrix(JSON.parse(await readFile(path, "utf8")));
}

export function buildCoverageValidationOutput(matrix: CoverageMatrix): CoverageValidationOutput {
  const report = validateCoverageMatrix(matrix);
  return {
    operation: "coverage.validate",
    status: report.status,
    issueCount: report.issueCount,
    summary: summarizeCoverageMatrix(matrix),
    issues: report.issues,
  };
}

export function buildCoverageReportOutput(matrix: CoverageMatrix): CoverageReportOutput {
  const validation = validateCoverageMatrix(matrix);
  return {
    operation: "coverage.report",
    status: validation.status,
    summary: summarizeCoverageMatrix(matrix),
    capabilities: matrix.capabilities,
  };
}

export function renderCoverageReport(matrix: CoverageMatrix, format: "json" | "markdown"): string {
  if (format === "markdown") return renderCoverageRoadmap(matrix);
  return `${JSON.stringify(buildCoverageReportOutput(matrix), null, 2)}\n`;
}

export function buildCoverageGapOutput(
  matrix: CoverageMatrix,
  options: {
    status?: CoverageStatus | undefined;
    domain?: CoverageCapability["domain"] | undefined;
  } = {},
): CoverageGapOutput {
  const gaps = matrix.capabilities.filter((capability) => {
    const isGap =
      capability.status !== "implemented" ||
      capability.missingEvidence.length > 0 ||
      Boolean(capability.decisionRecord);
    return (
      isGap &&
      (!options.status || capability.status === options.status) &&
      (!options.domain || capability.domain === options.domain)
    );
  });
  return {
    operation: "coverage.gaps",
    status: validateCoverageMatrix(matrix).status,
    filter: options,
    count: gaps.length,
    gaps,
  };
}

export function buildCoverageDecisionOutput(
  matrix: CoverageMatrix,
  id?: string | undefined,
): CoverageDecisionOutput {
  const decisions = matrix.capabilities
    .filter((capability) => capability.decisionRecord)
    .filter((capability) => !id || capability.decisionRecord?.id === id)
    .map((capability) => ({
      capabilityId: capability.id,
      capability: capability.name,
      status: capability.status,
      decisionRecord: capability.decisionRecord as NonNullable<
        CoverageCapability["decisionRecord"]
      >,
      nextAction: capability.nextAction,
    }));
  return {
    operation: "coverage.decisions",
    status: validateCoverageMatrix(matrix).status,
    id,
    count: decisions.length,
    decisions,
  };
}
