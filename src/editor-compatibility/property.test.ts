import assert from "node:assert/strict";
import fc from "fast-check";
import { describe, it } from "vitest";
import type { ProseMirrorNode } from "../types.js";
import { analyzeEditorCompatibility } from "./analyzer.js";
import { normalizeTablesToAccessibleLists } from "./contingencies.js";

function makeDocWithTable(tableHeaderCount: number): ProseMirrorNode {
  const headers: ProseMirrorNode[] = [];
  for (let i = 0; i < tableHeaderCount; i++) {
    headers.push({
      type: "tableHeader",
      attrs: { colspan: 1, rowspan: 1, colwidth: null, align: null },
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: `Col ${i + 1}` }],
        },
      ],
    });
  }

  return {
    type: "doc",
    content: [
      {
        type: "paragraph",
        content: [{ type: "text", text: "Introduction" }],
      },
      {
        type: "table",
        content: [
          {
            type: "tableRow",
            content: headers,
          },
          {
            type: "tableRow",
            content: headers.map((_, i) => ({
              type: "tableCell",
              attrs: { colspan: 1, rowspan: 1, colwidth: null, align: null },
              content: [
                {
                  type: "paragraph",
                  content: [{ type: "text", text: `Data ${i + 1}` }],
                },
              ],
            })),
          },
        ],
      },
    ],
  };
}

describe("Editor Compatibility Property Tests", () => {
  it("proves that any document containing tableHeader is incompatible with primary editor", () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 20 }), (headerCount) => {
        const doc = makeDocWithTable(headerCount);
        const assessment = analyzeEditorCompatibility(doc);

        assert.equal(assessment.primaryEditor.ok, false);
        assert.equal(assessment.primaryEditor.status, "incompatible");
        assert.equal(assessment.primaryEditor.tableHeaderCount, headerCount);
        assert.equal(assessment.primaryEditor.issues.length, headerCount);
      }),
      { numRuns: 50 },
    );
  });

  it("proves that table normalization guarantees zero tableHeader nodes and compatible primary editor", () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 20 }), (headerCount) => {
        const doc = makeDocWithTable(headerCount);
        const normalized = normalizeTablesToAccessibleLists(doc);
        const assessment = analyzeEditorCompatibility(normalized);

        assert.equal(assessment.primaryEditor.ok, true);
        assert.equal(assessment.primaryEditor.tableHeaderCount, 0);
        assert.equal(assessment.primaryEditor.tableCount, 0);
        assert.equal(assessment.storedBodyRoundTrip.ok, true);
      }),
      { numRuns: 50 },
    );
  });
});
