import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it } from "vitest";
import type { ProseMirrorNode } from "../types.js";
import { analyzeEditorCompatibility } from "./analyzer.js";
import {
  evaluateEditorOperationalPolicy,
  normalizeTablesToAccessibleLists,
} from "./contingencies.js";

const root = resolve(import.meta.dirname, "../..");
const fixtureDir = resolve(root, "fixtures/prosemirror/editor-compatibility");

function loadFixture(name: string): { id: string; title: string; document: ProseMirrorNode } {
  const content = readFileSync(resolve(fixtureDir, name), "utf8");
  return JSON.parse(content) as { id: string; title: string; document: ProseMirrorNode };
}

describe("Editor Compatibility Analyzer", () => {
  describe("Control fixtures", () => {
    it("evaluates paragraph-only cover control as compatible across all editors", () => {
      const { document } = loadFixture("cover-control.json");
      const assessment = analyzeEditorCompatibility(document);

      assert.equal(assessment.publicRender.ok, true);
      assert.equal(assessment.storedBodyRoundTrip.ok, true);
      assert.equal(assessment.primaryEditor.ok, true);
      assert.equal(assessment.primaryEditor.tableHeaderCount, 0);
      assert.equal(assessment.primaryEditor.tableCount, 0);
      assert.equal(assessment.auxiliaryEditor.ok, true);
      assert.equal(assessment.auxiliaryEditor.riskLevel, "none");
      assert.equal(assessment.auxiliaryEditor.issues.length, 0);

      const policy = evaluateEditorOperationalPolicy(assessment);
      assert.equal(policy.canProceedWithPrimaryWrite, true);
      assert.equal(policy.hardBlockReason, undefined);
    });

    it("evaluates rich pilot control with primary editor pass and high auxiliary risk", () => {
      const { document } = loadFixture("rich-pilot-control.json");
      const assessment = analyzeEditorCompatibility(document);

      assert.equal(assessment.publicRender.ok, true);
      assert.equal(assessment.storedBodyRoundTrip.ok, true);
      assert.equal(assessment.primaryEditor.ok, true);
      assert.equal(assessment.primaryEditor.tableHeaderCount, 0);
      assert.equal(assessment.primaryEditor.tableCount, 0);

      // Fails restricted auxiliary editor schema with high risk
      assert.equal(assessment.auxiliaryEditor.ok, false);
      assert.equal(assessment.auxiliaryEditor.riskLevel, "high");
      assert.ok(assessment.auxiliaryEditor.issues.length > 0);

      // Confirms specific rejected rich node types
      const counts = assessment.auxiliaryEditor.incompatibleNodeCounts;
      assert.ok((counts.heading ?? 0) >= 1);
      assert.ok((counts.image ?? 0) >= 1);
      assert.ok((counts.blockquote ?? 0) >= 1);
      assert.ok((counts.bulletList ?? 0) >= 1);
      assert.ok((counts.orderedList ?? 0) >= 1);

      // Verify exact JSON path reporting
      const imageIssue = assessment.auxiliaryEditor.issues.find((i) => i.nodeType === "image");
      assert.ok(imageIssue);
      assert.equal(imageIssue.path, "doc.content[2]");

      const policy = evaluateEditorOperationalPolicy(assessment);
      assert.equal(policy.canProceedWithPrimaryWrite, true);
      assert.equal(policy.contingencyRecommended, "cli-update-in-place");
      assert.match(policy.remediationAdvice ?? "", /CLI-only update-in-place/);
    });
  });

  describe("Scheduled essays with primary-editor tableHeader incompatibility", () => {
    const essaySpecs = [
      { filename: "me-001-tables.json", expectedTables: 2, expectedHeaders: 7 },
      { filename: "me-002-tables.json", expectedTables: 2, expectedHeaders: 7 },
      { filename: "me-003-tables.json", expectedTables: 1, expectedHeaders: 4 },
      { filename: "me-004-tables.json", expectedTables: 1, expectedHeaders: 4 },
      { filename: "me-005-tables.json", expectedTables: 2, expectedHeaders: 8 },
      { filename: "me-006-tables.json", expectedTables: 3, expectedHeaders: 11 },
    ];

    let grandTotalTables = 0;
    let grandTotalHeaders = 0;

    for (const spec of essaySpecs) {
      it(`detects exact tableHeader counts for ${spec.filename}`, () => {
        const { document } = loadFixture(spec.filename);
        const assessment = analyzeEditorCompatibility(document);

        assert.equal(assessment.primaryEditor.tableCount, spec.expectedTables);
        assert.equal(assessment.primaryEditor.tableHeaderCount, spec.expectedHeaders);
        assert.equal(assessment.primaryEditor.ok, false);
        assert.equal(assessment.primaryEditor.status, "incompatible");

        grandTotalTables += assessment.primaryEditor.tableCount;
        grandTotalHeaders += assessment.primaryEditor.tableHeaderCount;

        // Verify exact JSON paths are returned
        const headerIssues = assessment.primaryEditor.issues.filter(
          (i) => i.code === "UNKNOWN_NODE_TYPE_TABLE_HEADER",
        );
        assert.equal(headerIssues.length, spec.expectedHeaders);
        for (const issue of headerIssues) {
          assert.equal(issue.nodeType, "tableHeader");
          assert.match(issue.path, /^doc\.content\[\d+\]\.content\[\d+\]\.content\[\d+\]$/);
          assert.match(issue.message, /Unknown node type: tableHeader/);
        }

        // Policy enforces hard block
        const policy = evaluateEditorOperationalPolicy(assessment);
        assert.equal(policy.canProceedWithPrimaryWrite, false);
        assert.equal(policy.contingencyRecommended, "table-normalization");
      });
    }

    it("verifies the total corpus count matches exactly 11 tables and 41 tableHeaders", () => {
      assert.equal(grandTotalTables, 11);
      assert.equal(grandTotalHeaders, 41);
    });
  });

  describe("Table normalization contingency", () => {
    it("transforms table nodes to accessible labelled lists and resolves primary incompatibility", () => {
      const { document } = loadFixture("me-001-tables.json");
      const normalized = normalizeTablesToAccessibleLists(document);

      const before = analyzeEditorCompatibility(document);
      const after = analyzeEditorCompatibility(normalized);

      assert.equal(before.primaryEditor.ok, false);
      assert.equal(before.primaryEditor.tableHeaderCount, 7);
      assert.equal(before.primaryEditor.tableCount, 2);

      assert.equal(after.primaryEditor.ok, true);
      assert.equal(after.primaryEditor.tableHeaderCount, 0);
      assert.equal(after.primaryEditor.tableCount, 0);

      // Verify text preserved
      const rawText = JSON.stringify(normalized);
      assert.match(rawText, /High-Frequency Trader/);
      assert.match(rawText, /Disclosure Window/);

      const policy = evaluateEditorOperationalPolicy(after);
      assert.equal(policy.canProceedWithPrimaryWrite, true);
    });
  });

  describe("Complexity metrics and duplicate editor mounting detection", () => {
    it("detects duplicate editor mounting and calculates DOM cost multiplier", () => {
      const { document } = loadFixture("rich-pilot-control.json");

      const single = analyzeEditorCompatibility(document, { mountedEditors: 1 });
      assert.equal(single.metrics.mountedEditors, 1);
      assert.equal(single.metrics.duplicateEditorMountingDetected, false);

      const duplicate = analyzeEditorCompatibility(document, { mountedEditors: 2 });
      assert.equal(duplicate.metrics.mountedEditors, 2);
      assert.equal(duplicate.metrics.duplicateEditorMountingDetected, true);
      assert.ok(duplicate.metrics.estimatedDomCostMultiplier >= 2.0);
    });
  });
});
