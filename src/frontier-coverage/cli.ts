import { readFile } from "node:fs/promises";
import {
  buildCaptureValidationReport,
  buildEndpointDiffReport,
  buildEndpointInventoryReport,
  buildGraduationCheckReport,
  loadCaptureEvidenceFixture,
  renderEndpointInventory,
  type EndpointInventoryReport,
} from "./evidence-capture.js";
import { FRONTIER_COVERAGE_MATRIX } from "./matrix.js";
import { renderCoverageRoadmap } from "./roadmap.js";
import {
  type CoverageCapability,
  type CoverageMatrix,
  type CoverageStatus,
  parseCoverageMatrix,
  summarizeCoverageMatrix,
  validateCoverageMatrix,
} from "./schema.js";

export interface CoverageValidationOutput {
  operation: "coverage.validate";
  status: "ready" | "blocked";
  issueCount: number;
  summary?: ReturnType<typeof summarizeCoverageMatrix> | undefined;
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
  message: string;
  decisions: Array<{
    capabilityId: string;
    capability: string;
    status: CoverageStatus;
    decisionRecord: NonNullable<CoverageCapability["decisionRecord"]>;
    nextAction: string;
  }>;
}

export interface CoverageInspectOutput {
  operation: "coverage.inspect";
  status: "ready" | "blocked";
  capabilityId: string;
  capability?: CoverageCapability | undefined;
  message: string;
}

export async function loadCoverageMatrix(path?: string | undefined): Promise<CoverageMatrix> {
  if (!path) return FRONTIER_COVERAGE_MATRIX;
  return parseCoverageMatrix(JSON.parse(await readFile(path, "utf8")));
}

export async function loadCoverageMatrixInput(path?: string | undefined): Promise<unknown> {
  if (!path) return FRONTIER_COVERAGE_MATRIX;
  return JSON.parse(await readFile(path, "utf8"));
}

export async function buildCaptureFixtureValidationOutput(path: string) {
  return buildCaptureValidationReport(await loadCaptureEvidenceFixture(path));
}

export async function buildEndpointInventoryOutput(paths: string[]) {
  const fixtures = await Promise.all(paths.map((path) => loadCaptureEvidenceFixture(path)));
  return buildEndpointInventoryReport(fixtures);
}

export function renderEndpointInventoryReport(
  report: EndpointInventoryReport,
  format: "json" | "markdown",
): string {
  if (format === "markdown") return renderEndpointInventory(report);
  return `${JSON.stringify(report, null, 2)}\n`;
}

export async function loadEndpointInventoryReport(path: string): Promise<EndpointInventoryReport> {
  const value = JSON.parse(await readFile(path, "utf8")) as EndpointInventoryReport;
  if (value.operation !== "coverage.endpoint.inventory" || !Array.isArray(value.entries)) {
    throw new Error("Endpoint inventory report must be produced by coverage capture-inventory.");
  }
  return value;
}

export async function buildEndpointDiffOutput(beforePath: string, afterPath: string) {
  const [before, after] = await Promise.all([
    loadEndpointInventoryReport(beforePath),
    loadEndpointInventoryReport(afterPath),
  ]);
  return buildEndpointDiffReport(before, after);
}

export async function buildCaptureGraduationOutput(
  matrixPath: string | undefined,
  inventoryPath: string,
) {
  const [matrix, inventory] = await Promise.all([
    loadCoverageMatrix(matrixPath),
    loadEndpointInventoryReport(inventoryPath),
  ]);
  return buildGraduationCheckReport(matrix, inventory);
}

export function buildCoverageValidationOutput(value: unknown): CoverageValidationOutput {
  const report = validateCoverageMatrix(value);
  return {
    operation: "coverage.validate",
    status: report.status,
    issueCount: report.issueCount,
    summary: report.status === "ready" ? summarizeCoverageMatrix(value) : undefined,
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
    status:
      validateCoverageMatrix(matrix).status === "blocked" || (Boolean(id) && decisions.length === 0)
        ? "blocked"
        : "ready",
    id,
    count: decisions.length,
    message:
      id && decisions.length === 0
        ? "Decision record ID was not found."
        : "Decision records returned.",
    decisions,
  };
}

export function buildCoverageInspectOutput(
  matrix: CoverageMatrix,
  capabilityId: string,
): CoverageInspectOutput {
  const capability = matrix.capabilities.find((candidate) => candidate.id === capabilityId);
  return {
    operation: "coverage.inspect",
    status: capability ? "ready" : "blocked",
    capabilityId,
    capability,
    message: capability ? "Capability found." : "Capability ID was not found.",
  };
}
