import { FRONTIER_LAUNCH_CHECKLIST, renderLaunchChecklist } from "./launch-checklist.js";
import { FRONTIER_COVERAGE_MATRIX } from "./matrix.js";
import { renderCoverageRoadmap } from "./roadmap.js";
import { buildSafeSurfaceListOutput, type SafeSurfaceListOutput } from "./safe-surfaces.js";

export function buildCoverageMatrixResource(): Record<string, unknown> {
  return {
    schemaVersion: FRONTIER_COVERAGE_MATRIX.schemaVersion,
    capabilities: FRONTIER_COVERAGE_MATRIX.capabilities,
  };
}

export function buildCoverageRoadmapResource(): string {
  return renderCoverageRoadmap();
}

export function buildLaunchChecklistResource(): string {
  return renderLaunchChecklist();
}

export function buildDecisionRecordsResource(): Record<string, unknown> {
  return {
    decisions: FRONTIER_COVERAGE_MATRIX.capabilities
      .filter((capability) => capability.decisionRecord)
      .map((capability) => ({
        capabilityId: capability.id,
        capability: capability.name,
        domain: capability.domain,
        status: capability.status,
        decisionRecord: capability.decisionRecord,
        nextAction: capability.nextAction,
      })),
    launchSurfaces: FRONTIER_LAUNCH_CHECKLIST.map((item) => ({
      surface: item.surface,
      title: item.title,
      ownerGate: item.ownerGate,
      rollback: item.rollback,
    })),
  };
}

export function buildSafeSurfacesResource(): SafeSurfaceListOutput {
  return buildSafeSurfaceListOutput();
}
