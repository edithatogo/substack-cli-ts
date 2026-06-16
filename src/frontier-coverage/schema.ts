import { z } from "zod";

export const COVERAGE_DOMAINS = [
  "post-editor",
  "native-media",
  "live",
  "creator-os",
  "notes-community",
  "subscribers-growth",
  "analytics-revenue",
  "moderation",
  "publication-admin",
  "integrations-import-export",
  "distribution-agent",
] as const;

export const COVERAGE_STATUSES = [
  "implemented",
  "partial",
  "read-only",
  "probe-only",
  "planning-only",
  "manual-admin",
  "unsupported",
  "unknown",
] as const;

export const EXECUTION_PATHS = [
  "cli",
  "mcp-readonly",
  "mcp-planning",
  "api",
  "browser",
  "local-only",
  "manual-admin",
  "external-service",
] as const;

export const SAFETY_CLASSES = [
  "read-only",
  "planning-only",
  "write-with-confirmation",
  "destructive",
  "credential-sensitive",
  "external-gate",
  "unsupported",
] as const;

export const EVIDENCE_KINDS = [
  "source",
  "test",
  "doc",
  "fixture",
  "run-log",
  "live-validation",
  "official-doc",
  "endpoint-capture",
  "decision-record",
  "manual-check",
] as const;

export const CapabilityDomainSchema = z.enum(COVERAGE_DOMAINS);
export const CoverageStatusSchema = z.enum(COVERAGE_STATUSES);
export const ExecutionPathSchema = z.enum(EXECUTION_PATHS);
export const SafetyClassSchema = z.enum(SAFETY_CLASSES);
export const EvidenceKindSchema = z.enum(EVIDENCE_KINDS);

export const CoverageEvidenceSchema = z.object({
  kind: EvidenceKindSchema,
  label: z.string().min(1),
  ref: z.string().min(1),
});

export const CoverageDecisionRecordSchema = z.object({
  id: z.string().min(1),
  reason: z.string().min(1),
  nextReview: z.string().optional(),
  owner: z.string().optional(),
});

export const CoverageCapabilitySchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  domain: CapabilityDomainSchema,
  status: CoverageStatusSchema,
  paths: z.array(ExecutionPathSchema).min(1),
  primaryPath: ExecutionPathSchema.optional(),
  fallbackPath: ExecutionPathSchema.optional(),
  manualPath: ExecutionPathSchema.optional(),
  safetyClass: SafetyClassSchema,
  evidence: z.array(CoverageEvidenceSchema).default([]),
  decisionRecord: CoverageDecisionRecordSchema.optional(),
  missingEvidence: z.array(z.string().min(1)).default([]),
  nextAction: z.string().min(1),
  ownerDependency: z.string().optional(),
});

export const CoverageMatrixSchema = z.object({
  schemaVersion: z.literal(1),
  generatedAt: z.string().optional(),
  capabilities: z.array(CoverageCapabilitySchema).min(1),
});

export type CapabilityDomain = z.infer<typeof CapabilityDomainSchema>;
export type CoverageStatus = z.infer<typeof CoverageStatusSchema>;
export type ExecutionPath = z.infer<typeof ExecutionPathSchema>;
export type SafetyClass = z.infer<typeof SafetyClassSchema>;
export type EvidenceKind = z.infer<typeof EvidenceKindSchema>;
export type CoverageEvidence = z.infer<typeof CoverageEvidenceSchema>;
export type CoverageDecisionRecord = z.infer<typeof CoverageDecisionRecordSchema>;
export type CoverageCapability = z.infer<typeof CoverageCapabilitySchema>;
export type CoverageMatrix = z.infer<typeof CoverageMatrixSchema>;

export interface CoverageValidationIssue {
  capabilityId: string;
  code: string;
  message: string;
}

export interface CoverageValidationReport {
  status: "ready" | "blocked";
  issueCount: number;
  issues: CoverageValidationIssue[];
}

export interface CoverageSummary {
  total: number;
  byStatus: Record<CoverageStatus, number>;
  byDomain: Record<CapabilityDomain, number>;
  blockedCount: number;
}

const DECISION_REQUIRED_STATUSES = new Set<CoverageStatus>([
  "unsupported",
  "probe-only",
  "planning-only",
  "manual-admin",
]);

const FALLBACK_REQUIRED_STATUSES = new Set<CoverageStatus>([
  "implemented",
  "partial",
  "read-only",
  "probe-only",
  "planning-only",
]);

export function parseCoverageMatrix(value: unknown): CoverageMatrix {
  return CoverageMatrixSchema.parse(value);
}

export function validateCoverageMatrix(value: unknown): CoverageValidationReport {
  const parsed = CoverageMatrixSchema.safeParse(value);
  if (!parsed.success) {
    return {
      status: "blocked",
      issueCount: parsed.error.issues.length,
      issues: parsed.error.issues.map((issue) => ({
        capabilityId: "matrix",
        code: "schema-invalid",
        message: `${issue.path.join(".") || "matrix"}: ${issue.message}`,
      })),
    };
  }

  const seenIds = new Set<string>();
  const issues = parsed.data.capabilities.flatMap((capability) => {
    const capabilityIssues = validateCapability(capability);
    if (seenIds.has(capability.id)) {
      capabilityIssues.push({
        capabilityId: capability.id,
        code: "duplicate-capability-id",
        message: `Duplicate capability ID: ${capability.id}`,
      });
    } else {
      seenIds.add(capability.id);
    }
    return capabilityIssues;
  });
  return {
    status: issues.length === 0 ? "ready" : "blocked",
    issueCount: issues.length,
    issues,
  };
}

export function summarizeCoverageMatrix(value: unknown): CoverageSummary {
  const matrix = parseCoverageMatrix(value);
  const byStatus = Object.fromEntries(COVERAGE_STATUSES.map((status) => [status, 0])) as Record<
    CoverageStatus,
    number
  >;
  const byDomain = Object.fromEntries(COVERAGE_DOMAINS.map((domain) => [domain, 0])) as Record<
    CapabilityDomain,
    number
  >;

  for (const capability of matrix.capabilities) {
    byStatus[capability.status] += 1;
    byDomain[capability.domain] += 1;
  }

  return {
    total: matrix.capabilities.length,
    byStatus,
    byDomain,
    blockedCount: validateCoverageMatrix(matrix).issueCount,
  };
}

function validateCapability(capability: CoverageCapability): CoverageValidationIssue[] {
  const issues: CoverageValidationIssue[] = [];
  const add = (code: string, message: string) =>
    issues.push({ capabilityId: capability.id, code, message });

  if (capability.primaryPath && !capability.paths.includes(capability.primaryPath)) {
    add("primary-path-missing", "Primary path must be listed in available paths.");
  }

  if (capability.fallbackPath && !capability.paths.includes(capability.fallbackPath)) {
    add("fallback-path-missing", "Fallback path must be listed in available paths.");
  }

  if (capability.manualPath && !capability.paths.includes(capability.manualPath)) {
    add("manual-path-missing", "Manual/admin path must be listed in available paths.");
  }

  if (
    !capability.primaryPath &&
    capability.status !== "unsupported" &&
    capability.status !== "unknown"
  ) {
    add("primary-path-required", "Covered or partially covered capabilities need a primary path.");
  }

  if (FALLBACK_REQUIRED_STATUSES.has(capability.status) && !capability.fallbackPath) {
    add("fallback-path-required", "Covered capabilities need a fallback path.");
  }

  if (
    !capability.manualPath &&
    capability.status !== "unsupported" &&
    capability.status !== "unknown"
  ) {
    add("manual-path-required", "Covered capabilities need a documented manual/admin path.");
  }

  if (
    capability.status !== "unknown" &&
    capability.status !== "unsupported" &&
    capability.evidence.length === 0
  ) {
    add("evidence-required", "Covered capabilities need at least one evidence link.");
  }

  if (DECISION_REQUIRED_STATUSES.has(capability.status) && !capability.decisionRecord) {
    add(
      "decision-record-required",
      "Unsupported, probe-only, planning-only, and manual/admin gaps need a decision record.",
    );
  }

  if (capability.status === "unsupported" && capability.safetyClass !== "unsupported") {
    add(
      "unsupported-safety-class",
      "Unsupported capabilities must use the unsupported safety class.",
    );
  }

  return issues;
}
