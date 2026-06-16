import { FRONTIER_COVERAGE_MATRIX } from "./matrix.js";
import {
  COVERAGE_DOMAINS,
  COVERAGE_STATUSES,
  type CapabilityDomain,
  type CoverageCapability,
  type CoverageMatrix,
  summarizeCoverageMatrix,
} from "./schema.js";

export const FRONTIER_COVERAGE_ROADMAP_PATH = "docs/frontier-coverage-roadmap.md";

const DOMAIN_LABELS: Record<CapabilityDomain, string> = {
  "post-editor": "Post/editor publishing",
  "native-media": "Native media",
  live: "Live workflows",
  "creator-os": "Creator OS",
  "notes-community": "Notes, community, and discovery",
  "subscribers-growth": "Subscribers and growth",
  "analytics-revenue": "Analytics and revenue",
  moderation: "Moderation",
  "publication-admin": "Publication/admin",
  "integrations-import-export": "Integrations/import/export",
  "distribution-agent": "Distribution and agent surfaces",
};

export function renderCoverageRoadmap(matrix: CoverageMatrix = FRONTIER_COVERAGE_MATRIX): string {
  const summary = summarizeCoverageMatrix(matrix);
  const lines: string[] = [
    "# Frontier Coverage Roadmap",
    "",
    "This generated roadmap is the human-readable view of the canonical Substack feature coverage matrix. It tracks the current support state, evidence, alternative execution paths, safety class, decision records, and launch/admin dependencies for every major product surface.",
    "",
    "## Coverage Summary",
    "",
    "| Metric | Count |",
    "| --- | ---: |",
    `| Capabilities | ${summary.total} |`,
    `| Validation issues | ${summary.blockedCount} |`,
    "",
    "## Status Summary",
    "",
    "| Status | Count |",
    "| --- | ---: |",
    ...COVERAGE_STATUSES.map((status) => `| ${status} | ${summary.byStatus[status]} |`),
    "",
    "## Domain Coverage",
    "",
    "| Domain | Count |",
    "| --- | ---: |",
    ...COVERAGE_DOMAINS.map((domain) => `| ${DOMAIN_LABELS[domain]} | ${summary.byDomain[domain]} |`),
    "",
    "## Capability Matrix",
    "",
    "| Capability | Domain | Status | Primary | Fallback | Manual/Admin | Safety | Next action |",
    "| --- | --- | --- | --- | --- | --- | --- | --- |",
    ...matrix.capabilities.map(renderCapabilityRow),
    "",
    "## Decision Records",
    "",
    ...renderDecisionRecords(matrix.capabilities),
    "",
    "## Launch/Admin Gates",
    "",
    ...renderLaunchGates(matrix.capabilities),
    "",
    "## Maintenance Rules",
    "",
    "- Refresh official Substack support-page evidence before marking a frontier feature implemented.",
    "- Treat undocumented endpoints as capture-first until redacted fixtures and safety boundaries exist.",
    "- Keep MCP coverage read-only or planning-only unless the CLI already exposes an explicitly confirmed write path.",
    "- Do not mark probe-only, planning-only, or manual/admin rows as implemented without replacing the decision record with concrete evidence.",
    "",
  ];

  return `${lines.join("\n")}`;
}

function renderCapabilityRow(capability: CoverageCapability): string {
  return [
    capability.name,
    DOMAIN_LABELS[capability.domain],
    capability.status,
    capability.primaryPath ?? "n/a",
    capability.fallbackPath ?? "n/a",
    capability.manualPath ?? "manual-admin",
    capability.safetyClass,
    capability.nextAction,
  ]
    .map(escapeCell)
    .join(" | ")
    .replace(/^/, "| ")
    .replace(/$/, " |");
}

function renderDecisionRecords(capabilities: CoverageCapability[]): string[] {
  const records = capabilities.filter((capability) => capability.decisionRecord);
  if (records.length === 0) {
    return ["No decision records are currently required."];
  }

  return records.flatMap((capability) => [
    `### ${capability.decisionRecord?.id}`,
    "",
    `- Capability: ${capability.name}`,
    `- Status: ${capability.status}`,
    `- Reason: ${capability.decisionRecord?.reason}`,
    `- Next review: ${capability.decisionRecord?.nextReview ?? "before status upgrade"}`,
    "",
  ]);
}

function renderLaunchGates(capabilities: CoverageCapability[]): string[] {
  const gates = capabilities.filter((capability) => capability.ownerDependency);
  if (gates.length === 0) {
    return ["No external launch/admin gates are currently recorded."];
  }

  return [
    "| Capability | Gate | Next action |",
    "| --- | --- | --- |",
    ...gates.map(
      (capability) =>
        `| ${escapeCell(capability.name)} | ${escapeCell(capability.ownerDependency ?? "")} | ${escapeCell(capability.nextAction)} |`,
    ),
  ];
}

function escapeCell(value: string): string {
  return value.replaceAll("|", "\\|").replace(/\s+/g, " ").trim();
}
