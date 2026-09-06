import { FRONTIER_COVERAGE_MATRIX } from "./matrix.js";
import type { CoverageCapability, CoverageMatrix } from "./schema.js";

const DIAGNOSTIC_STATUSES = new Set<CoverageCapability["status"]>([
  "probe-only",
  "planning-only",
  "manual-admin",
  "unsupported",
]);

const BLOCKING_OFFICIAL_DOC_STATUSES = new Set<
  FrontierDriftReport["officialDocs"][number]["status"]
>(["missing-snapshot", "stale", "changed", "unavailable"]);

export interface DriftEvidenceSnapshot {
  ref: string;
  checkedAt: string;
  status: "ok" | "changed" | "unavailable";
  note?: string | undefined;
}

export interface FrontierDriftReport {
  operation: "coverage.drift";
  status: "ready" | "blocked";
  generatedAt: string;
  staleAfterDays: number;
  summary: {
    officialDocCount: number;
    freshOfficialDocCount: number;
    blockedOfficialDocCount: number;
    endpointDiagnosticCount: number;
    missingDecisionRecordCount: number;
  };
  officialDocs: Array<{
    capabilityId: string;
    capability: string;
    ref: string;
    checkedAt?: string | undefined;
    status: "missing-snapshot" | "fresh" | "stale" | "changed" | "unavailable";
    note?: string | undefined;
  }>;
  endpointCaptureDiagnostics: Array<{
    capabilityId: string;
    capability: string;
    decisionRecordId: string;
    status: CoverageCapability["status"];
    diagnostic: string;
  }>;
}

export function buildFrontierDriftReport(
  options: {
    matrix?: CoverageMatrix | undefined;
    snapshots?: DriftEvidenceSnapshot[] | undefined;
    now?: Date | undefined;
    staleAfterDays?: number | undefined;
  } = {},
): FrontierDriftReport {
  const matrix = options.matrix ?? FRONTIER_COVERAGE_MATRIX;
  const snapshotList = options.snapshots ?? [];
  assertUniqueSnapshotRefs(snapshotList);
  const snapshots = new Map(snapshotList.map((snapshot) => [snapshot.ref, snapshot]));
  const now = options.now ?? new Date();
  const staleAfterDays = options.staleAfterDays ?? 90;

  const officialDocs = matrix.capabilities.flatMap((capability) =>
    capability.evidence
      .filter((evidence) => evidence.kind === "official-doc")
      .map((evidence) => {
        const snapshot = snapshots.get(evidence.ref);
        if (!snapshot) {
          return {
            capabilityId: capability.id,
            capability: capability.name,
            ref: evidence.ref,
            status: "missing-snapshot" as const,
          };
        }
        const ageDays = daysBetween(new Date(snapshot.checkedAt), now);
        return {
          capabilityId: capability.id,
          capability: capability.name,
          ref: evidence.ref,
          checkedAt: snapshot.checkedAt,
          status:
            snapshot.status === "changed" || snapshot.status === "unavailable"
              ? snapshot.status
              : ageDays > staleAfterDays
                ? ("stale" as const)
                : ("fresh" as const),
          note: snapshot.note,
        };
      }),
  );

  const endpointCaptureDiagnostics = matrix.capabilities
    .filter((capability) => DIAGNOSTIC_STATUSES.has(capability.status))
    .map((capability) => ({
      capabilityId: capability.id,
      capability: capability.name,
      decisionRecordId: capability.decisionRecord?.id ?? "missing-decision-record",
      status: capability.status,
      diagnostic: capability.decisionRecord
        ? "Capture or manual/admin decision remains active before status upgrade."
        : "Missing decision record for non-implemented coverage state.",
    }));

  const blocked =
    officialDocs.some((doc) => BLOCKING_OFFICIAL_DOC_STATUSES.has(doc.status)) ||
    endpointCaptureDiagnostics.some(
      (diagnostic) => diagnostic.decisionRecordId === "missing-decision-record",
    );

  const blockedOfficialDocs = officialDocs.filter((doc) =>
    BLOCKING_OFFICIAL_DOC_STATUSES.has(doc.status),
  );
  const missingDecisionRecordCount = endpointCaptureDiagnostics.filter(
    (diagnostic) => diagnostic.decisionRecordId === "missing-decision-record",
  ).length;

  return {
    operation: "coverage.drift",
    status: blocked ? "blocked" : "ready",
    generatedAt: now.toISOString(),
    staleAfterDays,
    summary: {
      officialDocCount: officialDocs.length,
      freshOfficialDocCount: officialDocs.length - blockedOfficialDocs.length,
      blockedOfficialDocCount: blockedOfficialDocs.length,
      endpointDiagnosticCount: endpointCaptureDiagnostics.length,
      missingDecisionRecordCount,
    },
    officialDocs,
    endpointCaptureDiagnostics,
  };
}

export function renderFrontierDriftIssueBody(report: FrontierDriftReport): string {
  const blockedDocs = report.officialDocs.filter((doc) =>
    BLOCKING_OFFICIAL_DOC_STATUSES.has(doc.status),
  );
  const missingDecisionRecords = report.endpointCaptureDiagnostics.filter(
    (diagnostic) => diagnostic.decisionRecordId === "missing-decision-record",
  );
  const activeDiagnostics = report.endpointCaptureDiagnostics.filter(
    (diagnostic) => diagnostic.decisionRecordId !== "missing-decision-record",
  );

  return [
    "# Frontier Coverage Drift",
    "",
    `Generated: ${report.generatedAt}`,
    `Status: ${report.status}`,
    `Official docs: ${report.summary.freshOfficialDocCount}/${report.summary.officialDocCount} fresh`,
    `Blocked official docs: ${report.summary.blockedOfficialDocCount}`,
    `Endpoint diagnostics: ${report.summary.endpointDiagnosticCount}`,
    `Missing decision records: ${report.summary.missingDecisionRecordCount}`,
    "",
    "## Required Follow-Up",
    "",
    ...renderIssueList(
      blockedDocs.map(
        (doc) =>
          `${doc.status}: ${doc.capability} (${doc.capabilityId}) - ${doc.ref}${
            doc.checkedAt ? ` checked ${doc.checkedAt}` : ""
          }${doc.note ? ` - ${doc.note}` : ""}`,
      ),
      "No official-doc drift is blocking the roadmap.",
    ),
    "",
    "## Missing Decision Records",
    "",
    ...renderIssueList(
      missingDecisionRecords.map(
        (diagnostic) =>
          `${diagnostic.capability} (${diagnostic.capabilityId}) is ${diagnostic.status}: ${diagnostic.diagnostic}`,
      ),
      "Every non-implemented surface has a decision record.",
    ),
    "",
    "## Active Safe-Boundary Diagnostics",
    "",
    ...renderIssueList(
      activeDiagnostics.map(
        (diagnostic) =>
          `${diagnostic.capability} (${diagnostic.capabilityId}) remains ${diagnostic.status}: ${diagnostic.diagnostic}`,
      ),
      "No planning/probe/manual/unsupported diagnostics are active.",
    ),
    "",
    "## Operator Commands",
    "",
    "- `npm run frontier:drift`",
    "- Refresh `fixtures/frontier-drift-snapshots.json` after reviewing official Substack support pages.",
    "- Update the relevant decision record before upgrading any planning/probe/manual surface.",
    "",
  ].join("\n");
}

export function parseDriftEvidenceSnapshots(value: unknown): DriftEvidenceSnapshot[] {
  if (!Array.isArray(value)) {
    throw new Error("Drift evidence snapshots must be an array.");
  }
  const snapshots = value.map((snapshot, index) => {
    if (!snapshot || typeof snapshot !== "object") {
      throw new Error(`Drift evidence snapshot ${index} must be an object.`);
    }
    const record = snapshot as Record<string, unknown>;
    if (typeof record.ref !== "string" || record.ref.length === 0) {
      throw new Error(`Drift evidence snapshot ${index} is missing ref.`);
    }
    if (typeof record.checkedAt !== "string" || Number.isNaN(Date.parse(record.checkedAt))) {
      throw new Error(`Drift evidence snapshot ${index} has invalid checkedAt.`);
    }
    if (!["ok", "changed", "unavailable"].includes(String(record.status))) {
      throw new Error(`Drift evidence snapshot ${index} has invalid status.`);
    }
    return {
      ref: record.ref,
      checkedAt: record.checkedAt,
      status: record.status as DriftEvidenceSnapshot["status"],
      note: typeof record.note === "string" ? record.note : undefined,
    };
  });
  assertUniqueSnapshotRefs(snapshots);
  return snapshots;
}

function assertUniqueSnapshotRefs(snapshots: DriftEvidenceSnapshot[]): void {
  const seenRefs = new Set<string>();
  for (const [index, snapshot] of snapshots.entries()) {
    if (seenRefs.has(snapshot.ref)) {
      throw new Error(`Drift evidence snapshot ${index} has duplicate ref: ${snapshot.ref}`);
    }
    seenRefs.add(snapshot.ref);
  }
}

function daysBetween(from: Date, to: Date): number {
  return Math.floor((to.getTime() - from.getTime()) / 86_400_000);
}

function renderIssueList(items: string[], emptyMessage: string): string[] {
  if (items.length === 0) return [`- ${emptyMessage}`];
  return items.map((item) => `- ${item}`);
}
