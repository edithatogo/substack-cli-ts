import { FRONTIER_COVERAGE_MATRIX } from "./matrix.js";
import type { CoverageCapability, CoverageMatrix } from "./schema.js";

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
  const snapshots = new Map((options.snapshots ?? []).map((snapshot) => [snapshot.ref, snapshot]));
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
    .filter((capability) =>
      ["probe-only", "planning-only", "manual-admin", "unsupported"].includes(capability.status),
    )
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
    officialDocs.some((doc) =>
      ["missing-snapshot", "stale", "changed", "unavailable"].includes(doc.status),
    ) ||
    endpointCaptureDiagnostics.some(
      (diagnostic) => diagnostic.decisionRecordId === "missing-decision-record",
    );

  return {
    operation: "coverage.drift",
    status: blocked ? "blocked" : "ready",
    generatedAt: now.toISOString(),
    staleAfterDays,
    officialDocs,
    endpointCaptureDiagnostics,
  };
}

export function parseDriftEvidenceSnapshots(value: unknown): DriftEvidenceSnapshot[] {
  if (!Array.isArray(value)) {
    throw new Error("Drift evidence snapshots must be an array.");
  }
  return value.map((snapshot, index) => {
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
}

function daysBetween(from: Date, to: Date): number {
  return Math.floor((to.getTime() - from.getTime()) / 86_400_000);
}
