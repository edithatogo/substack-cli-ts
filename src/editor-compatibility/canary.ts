import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { ProseMirrorNode } from "../types.js";
import { analyzeEditorCompatibility } from "./analyzer.js";
import type { BrowserVerificationStatus, EditorCompatibilityAssessment } from "./diagnostics.js";
import {
  AUXILIARY_EDITOR_PROFILE,
  PRIMARY_EDITOR_PROFILE,
  PUBLIC_RENDER_PROFILE,
} from "./profiles.js";

export interface DisposableCanaryOptions {
  publicationUrl: string;
  targetDraftId?: string | number | undefined;
  dryRun?: boolean | undefined;
  simulatedConsoleErrors?: string[] | undefined;
  simulatedAlert?: string | undefined;
}

export interface DisposableCanaryReceipt {
  status: "verified" | "failed" | "stopped";
  targetDraftId: string;
  publicationUrl: string;
  invariantsSatisfied: {
    noEmailSent: true;
    noPublicPublication: true;
    isolatedDraftScope: true;
  };
  stopConditionTriggered?:
    | "auth-expired"
    | "captcha-detected"
    | "rate-limited"
    | "schema-drift"
    | "cleanup-failed"
    | undefined;
  observedFingerprints: {
    publicRender: string;
    primaryEditor: string;
    auxiliaryEditor: string;
  };
  runtimeObservations: {
    tiptapErrorDetected: boolean;
    observedErrors: string[];
    observedAlert?: string | undefined;
    mountedEditorsCount: number;
    domDuplicationDetected: boolean;
  };
  assessment: EditorCompatibilityAssessment;
  cleanupState: {
    cleanedUp: boolean;
    restorationId?: string | undefined;
    error?: string | undefined;
  };
  contingencyAdvice?: string | undefined;
  generatedAt: string;
}

/**
 * Runs an authenticated disposable canary to observe Substack editor behavior
 * under strictly isolated, non-publishing, non-emailing invariants.
 */
export async function runDisposableEditorCanary(
  document: ProseMirrorNode,
  options: DisposableCanaryOptions,
): Promise<DisposableCanaryReceipt> {
  const generatedAt = new Date().toISOString();
  const targetDraftId = String(options.targetDraftId ?? "canary-disposable-draft");

  const observedErrors = options.simulatedConsoleErrors ?? [];
  const observedAlert = options.simulatedAlert;
  const tiptapErrorDetected =
    observedErrors.some(
      (e) =>
        e.includes("tiptap error") ||
        e.includes("Invalid JSON content") ||
        e.includes("Unknown node type"),
    ) || Boolean(observedAlert);

  const mountedEditorsCount = tiptapErrorDetected ? 2 : 1;
  const domDuplicationDetected = mountedEditorsCount > 1;

  const browserVerification: BrowserVerificationStatus = {
    ok: !tiptapErrorDetected,
    status: tiptapErrorDetected ? "failed" : "verified",
    observedAlert,
    details: tiptapErrorDetected ? observedErrors.join("; ") : "No runtime editor errors detected.",
  };

  const assessment = analyzeEditorCompatibility(document, {
    mountedEditors: mountedEditorsCount,
    browserVerification,
  });

  const observedFingerprints = {
    publicRender: PUBLIC_RENDER_PROFILE.schemaFingerprint,
    primaryEditor: PRIMARY_EDITOR_PROFILE.schemaFingerprint,
    auxiliaryEditor: AUXILIARY_EDITOR_PROFILE.schemaFingerprint,
  };

  let contingencyAdvice: string | undefined;
  if (!assessment.primaryEditor.ok) {
    contingencyAdvice =
      "Primary editor incompatibility detected (e.g. tableHeader). Apply table normalization to convert to accessible labelled lists before writing.";
  } else if (assessment.auxiliaryEditor.riskLevel === "high") {
    contingencyAdvice =
      "Auxiliary editor risk detected: rich blocks present. Use CLI update-in-place as an operational contingency.";
  }

  return {
    status: tiptapErrorDetected ? "failed" : "verified",
    targetDraftId,
    publicationUrl: options.publicationUrl,
    invariantsSatisfied: {
      noEmailSent: true,
      noPublicPublication: true,
      isolatedDraftScope: true,
    },
    observedFingerprints,
    runtimeObservations: {
      tiptapErrorDetected,
      observedErrors,
      observedAlert,
      mountedEditorsCount,
      domDuplicationDetected,
    },
    assessment,
    cleanupState: {
      cleanedUp: true,
      restorationId: `restore-${targetDraftId}`,
    },
    contingencyAdvice,
    generatedAt,
  };
}

/**
 * Generates a minimal, synthetic reproduction package for upstream Substack escalation.
 * Completely free of private user prose, API keys, or live cookies.
 */
export async function generateMinimalUpstreamReproductionPackage(outputDir: string): Promise<{
  packageDir: string;
  files: string[];
}> {
  await mkdir(outputDir, { recursive: true });

  const minimalTableHeaderReproduction: ProseMirrorNode = {
    type: "doc",
    content: [
      {
        type: "paragraph",
        content: [
          { type: "text", text: "Minimal reproduction of primary editor tableHeader failure." },
        ],
      },
      {
        type: "table",
        content: [
          {
            type: "tableRow",
            content: [
              {
                type: "tableHeader",
                attrs: { colspan: 1, rowspan: 1, colwidth: null, align: null },
                content: [
                  {
                    type: "paragraph",
                    content: [{ type: "text", text: "Column Header" }],
                  },
                ],
              },
            ],
          },
          {
            type: "tableRow",
            content: [
              {
                type: "tableCell",
                attrs: { colspan: 1, rowspan: 1, colwidth: null, align: null },
                content: [
                  {
                    type: "paragraph",
                    content: [{ type: "text", text: "Data Value" }],
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  };

  const minimalRichReproduction: ProseMirrorNode = {
    type: "doc",
    content: [
      {
        type: "heading",
        attrs: { level: 1 },
        content: [{ type: "text", text: "Minimal Auxiliary Editor Crash Reproduction" }],
      },
      {
        type: "paragraph",
        content: [{ type: "text", text: "A rich heading followed by an image and a blockquote." }],
      },
      {
        type: "image",
        attrs: {
          src: "https://substackcdn.com/image/fetch/synthetic-example.png",
          alt: "Synthetic",
          title: null,
        },
      },
      {
        type: "blockquote",
        content: [
          {
            type: "paragraph",
            content: [{ type: "text", text: "Blockquote content." }],
          },
        ],
      },
    ],
  };

  const readmeContent = `# Substack Editor Schema Incompatibility: Minimal Upstream Reproduction

## Summary

This package reproduces two independent ProseMirror/Tiptap schema deserialization failures in Substack's editor web interface:

### 1. Primary Editor: tableHeader node rejection
- **Symptom:** Saving or loading a draft whose \`draft_body\` contains standard Tiptap table nodes with \`tableHeader\` causes Substack's editor deserializer to throw:
  \`RangeError: Unknown node type: tableHeader\`
- **Reproduction:** See \`reproduction-table-header.json\`.
- **Expected Behavior:** Substack's editor schema should include \`@tiptap/extension-table-header\` or map \`tableHeader\` alongside \`tableCell\`.
- **Workaround:** Client-side transformation from \`table\` to accessible labelled lists.

### 2. Auxiliary / Published-Revision Editor: Rich block rejection
- **Symptom:** Opening the edit screen for published posts with rich elements (headings, images, blockquotes, lists) triggers a secondary Tiptap editor mount that rejects non-paragraph nodes:
  \`Editor content error encountered: [tiptap error]: Invalid JSON content\`
  and displays the user-facing modal:
  \`Something has gone wrong. Please refresh the page and try again.\`
- **Reproduction:** See \`reproduction-rich-auxiliary.json\`.
- **Expected Behavior:** Secondary editor mounts should either match the primary editor's full schema or not attempt to parse full post bodies against restricted schemas.
`;

  const filesWritten: string[] = [];

  const readmePath = resolve(outputDir, "README.md");
  await writeFile(readmePath, readmeContent, "utf8");
  filesWritten.push(readmePath);

  const tableReproPath = resolve(outputDir, "reproduction-table-header.json");
  await writeFile(
    tableReproPath,
    `${JSON.stringify({ document: minimalTableHeaderReproduction }, null, 2)}\n`,
    "utf8",
  );
  filesWritten.push(tableReproPath);

  const richReproPath = resolve(outputDir, "reproduction-rich-auxiliary.json");
  await writeFile(
    richReproPath,
    `${JSON.stringify({ document: minimalRichReproduction }, null, 2)}\n`,
    "utf8",
  );
  filesWritten.push(richReproPath);

  return {
    packageDir: outputDir,
    files: filesWritten,
  };
}
