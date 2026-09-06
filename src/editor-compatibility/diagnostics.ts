import type { ProfileId } from "./profiles.js";

export type FindingSeverity = "error" | "warning";

export interface CompatibilityFinding {
  path: string;
  nodeType: string;
  markType?: string | undefined;
  targetProfile: ProfileId;
  severity: FindingSeverity;
  code: string;
  message: string;
}

export interface ComplexityMetrics {
  nodeCount: number;
  deepestDepth: number;
  tableCount: number;
  tableHeaderCount: number;
  mountedEditors: number;
  duplicateEditorMountingDetected: boolean;
  estimatedDomCostMultiplier: number;
}

export interface ProfileCompatibilityStatus {
  ok: boolean;
  status: "supported" | "unsupported" | "compatible" | "incompatible";
  issues: CompatibilityFinding[];
}

export interface AuxiliaryCompatibilityStatus {
  ok: boolean;
  riskLevel: "none" | "low" | "high";
  incompatibleNodeCounts: Record<string, number>;
  issues: CompatibilityFinding[];
}

export interface StoredBodyRoundTripStatus {
  ok: boolean;
  status: "valid" | "invalid";
  byteSize: number;
  error?: string | undefined;
}

export interface BrowserVerificationStatus {
  ok: boolean;
  status: "verified" | "failed" | "unverified";
  details?: string | undefined;
  observedAlert?: string | undefined;
}

export interface EditorCompatibilityAssessment {
  publicRender: ProfileCompatibilityStatus;
  storedBodyRoundTrip: StoredBodyRoundTripStatus;
  primaryEditor: ProfileCompatibilityStatus & {
    tableHeaderCount: number;
    tableCount: number;
  };
  auxiliaryEditor: AuxiliaryCompatibilityStatus;
  metrics: ComplexityMetrics;
  browserVerification?: BrowserVerificationStatus | undefined;
}
