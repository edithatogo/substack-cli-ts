import { analyzeEditorCompatibility } from "../editor-compatibility/analyzer.js";
import type { EditorCompatibilityAssessment } from "../editor-compatibility/diagnostics.js";
import type { SubstackDraftPayload } from "../substack-api/payload.js";
import {
  buildSubstackDraftPayload,
  validatePayloadCompatibility,
} from "../substack-api/payload.js";
import type { PreparedPost } from "../types.js";
import { resolvePostTitle } from "./title.js";

export interface PrepublishReport {
  status: "ready" | "blocked";
  mode: PreparedPost["mode"];
  filePath: string;
  title: string;
  scheduleAt?: string | undefined;
  warnings: string[];
  compatibility: ReturnType<typeof validatePayloadCompatibility>;
  editorCompatibility?: EditorCompatibilityAssessment | undefined;
  payload?: SubstackDraftPayload | undefined;
  message: string;
}

export function prepublishPost(prepared: PreparedPost): PrepublishReport {
  const title = resolvePostTitle(prepared.post);
  const compatibility = validatePayloadCompatibility(prepared.post.document);
  const editorCompatibility = analyzeEditorCompatibility(prepared.post.document);

  if (!compatibility.ok) {
    return {
      status: "blocked",
      mode: prepared.mode,
      filePath: prepared.post.filePath,
      title,
      scheduleAt: prepared.scheduleAt,
      warnings: prepared.post.warnings,
      compatibility,
      editorCompatibility,
      message: "Prepublish blocked because the post contains unsupported Substack payload content.",
    };
  }

  if (!editorCompatibility.primaryEditor.ok) {
    const headerCount = editorCompatibility.primaryEditor.tableHeaderCount;
    return {
      status: "blocked",
      mode: prepared.mode,
      filePath: prepared.post.filePath,
      title,
      scheduleAt: prepared.scheduleAt,
      warnings: [
        ...prepared.post.warnings,
        `Primary editor schema incompatibility: contains ${headerCount} tableHeader node(s).`,
      ],
      compatibility,
      editorCompatibility,
      message: `Prepublish blocked: Substack primary editor rejects tableHeader nodes (Unknown node type: tableHeader). Run table normalization or convert tableHeader to tableCell.`,
    };
  }

  return {
    status: "ready",
    mode: prepared.mode,
    filePath: prepared.post.filePath,
    title,
    scheduleAt: prepared.scheduleAt,
    warnings: prepared.post.warnings,
    compatibility,
    editorCompatibility,
    payload: buildSubstackDraftPayload(prepared.post),
    message:
      "Prepublish validation passed. The payload is ready for browser publishing or future API transport.",
  };
}
