import type { ProseMirrorNode } from "../types.js";
import type {
  BrowserVerificationStatus,
  CompatibilityFinding,
  ComplexityMetrics,
  EditorCompatibilityAssessment,
} from "./diagnostics.js";
import {
  AUXILIARY_EDITOR_PROFILE,
  PRIMARY_EDITOR_PROFILE,
  PUBLIC_RENDER_PROFILE,
} from "./profiles.js";

export interface AnalyzeCompatibilityOptions {
  mountedEditors?: number;
  browserVerification?: BrowserVerificationStatus;
}

export function analyzeEditorCompatibility(
  document: ProseMirrorNode,
  options: AnalyzeCompatibilityOptions = {},
): EditorCompatibilityAssessment {
  const publicIssues: CompatibilityFinding[] = [];
  const primaryIssues: CompatibilityFinding[] = [];
  const auxiliaryIssues: CompatibilityFinding[] = [];

  const incompatibleAuxiliaryCounts: Record<string, number> = {};
  let totalNodeCount = 0;
  let maxDepth = 0;
  let tableCount = 0;
  let tableHeaderCount = 0;

  function walk(node: ProseMirrorNode, path: string, depth: number): void {
    totalNodeCount++;
    if (depth > maxDepth) {
      maxDepth = depth;
    }

    if (node.type === "table") {
      tableCount++;
    }
    if (node.type === "tableHeader") {
      tableHeaderCount++;
    }

    // Check Public Render Profile
    if (!PUBLIC_RENDER_PROFILE.supportedNodeTypes.has(node.type)) {
      publicIssues.push({
        path,
        nodeType: node.type,
        targetProfile: "public-render",
        severity: "error",
        code: "UNSUPPORTED_PUBLIC_NODE",
        message: `Node type '${node.type}' is not supported for public rendering.`,
      });
    }

    // Check Primary Draft Editor Profile
    if (!PRIMARY_EDITOR_PROFILE.supportedNodeTypes.has(node.type)) {
      const isTableHeader = node.type === "tableHeader";
      primaryIssues.push({
        path,
        nodeType: node.type,
        targetProfile: "primary-editor",
        severity: "error",
        code: isTableHeader ? "UNKNOWN_NODE_TYPE_TABLE_HEADER" : "UNSUPPORTED_PRIMARY_NODE",
        message: isTableHeader
          ? "Unknown node type: tableHeader - Substack primary editor rejects tableHeader; table rows must contain tableCell nodes."
          : `Node type '${node.type}' is not supported by Substack's primary draft editor.`,
      });
    }

    // Check Auxiliary / Restricted Editor Profile
    if (!AUXILIARY_EDITOR_PROFILE.supportedNodeTypes.has(node.type)) {
      incompatibleAuxiliaryCounts[node.type] = (incompatibleAuxiliaryCounts[node.type] ?? 0) + 1;
      auxiliaryIssues.push({
        path,
        nodeType: node.type,
        targetProfile: "auxiliary-editor",
        severity: "warning",
        code: "AUXILIARY_SCHEMA_REJECTION",
        message: `Node type '${node.type}' is rejected by Substack's auxiliary/published editor schema (triggers '[tiptap error]: Invalid JSON content').`,
      });
    }

    // Check Marks
    for (const mark of node.marks ?? []) {
      if (!PUBLIC_RENDER_PROFILE.supportedMarkTypes.has(mark.type)) {
        publicIssues.push({
          path,
          nodeType: node.type,
          markType: mark.type,
          targetProfile: "public-render",
          severity: "error",
          code: "UNSUPPORTED_PUBLIC_MARK",
          message: `Mark type '${mark.type}' is not supported for public rendering.`,
        });
      }

      if (!PRIMARY_EDITOR_PROFILE.supportedMarkTypes.has(mark.type)) {
        primaryIssues.push({
          path,
          nodeType: node.type,
          markType: mark.type,
          targetProfile: "primary-editor",
          severity: "error",
          code: "UNSUPPORTED_PRIMARY_MARK",
          message: `Mark type '${mark.type}' is not supported by Substack's primary draft editor.`,
        });
      }

      if (!AUXILIARY_EDITOR_PROFILE.supportedMarkTypes.has(mark.type)) {
        auxiliaryIssues.push({
          path,
          nodeType: node.type,
          markType: mark.type,
          targetProfile: "auxiliary-editor",
          severity: "warning",
          code: "AUXILIARY_MARK_REJECTION",
          message: `Mark type '${mark.type}' is rejected by Substack's auxiliary/published editor schema.`,
        });
      }
    }

    // Recurse children
    node.content?.forEach((child, index) => {
      walk(child, `${path}.content[${index}]`, depth + 1);
    });
  }

  walk(document, "doc", 1);

  // Stored body round trip verification
  let roundTripOk = false;
  let byteSize = 0;
  let roundTripError: string | undefined;
  try {
    const serialized = JSON.stringify(document);
    byteSize = Buffer.byteLength(serialized, "utf8");
    const parsed = JSON.parse(serialized) as unknown;
    roundTripOk = typeof parsed === "object" && parsed !== null;
  } catch (err) {
    roundTripOk = false;
    roundTripError = err instanceof Error ? err.message : String(err);
  }

  const mountedEditors = options.mountedEditors ?? 1;
  const duplicateEditorMountingDetected = mountedEditors > 1;

  const metrics: ComplexityMetrics = {
    nodeCount: totalNodeCount,
    deepestDepth: maxDepth,
    tableCount,
    tableHeaderCount,
    mountedEditors,
    duplicateEditorMountingDetected,
    estimatedDomCostMultiplier:
      mountedEditors * (1 + tableCount * 0.5 + (totalNodeCount > 100 ? 0.5 : 0)),
  };

  const auxiliaryRiskLevel: "none" | "low" | "high" =
    auxiliaryIssues.length === 0
      ? "none"
      : auxiliaryIssues.length > 5 || Object.keys(incompatibleAuxiliaryCounts).length > 2
        ? "high"
        : "low";

  return {
    publicRender: {
      ok: publicIssues.length === 0,
      status: publicIssues.length === 0 ? "supported" : "unsupported",
      issues: publicIssues,
    },
    storedBodyRoundTrip: {
      ok: roundTripOk,
      status: roundTripOk ? "valid" : "invalid",
      byteSize,
      error: roundTripError,
    },
    primaryEditor: {
      ok: primaryIssues.length === 0,
      status: primaryIssues.length === 0 ? "compatible" : "incompatible",
      tableHeaderCount,
      tableCount,
      issues: primaryIssues,
    },
    auxiliaryEditor: {
      ok: auxiliaryIssues.length === 0,
      riskLevel: auxiliaryRiskLevel,
      incompatibleNodeCounts: incompatibleAuxiliaryCounts,
      issues: auxiliaryIssues,
    },
    metrics,
    browserVerification: options.browserVerification,
  };
}
