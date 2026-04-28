import assert from "node:assert/strict";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "vitest";
import { compareDraftContractMatrixArtifacts } from "./draft-contract-matrix.js";

describe("compareDraftContractMatrixArtifacts", () => {
  it("diffs matrix fixtures by normalized shape", async () => {
    const dir = await mkdtemp(join(tmpdir(), "draft-contract-matrix-compare-"));
    const expectedFile = join(dir, "expected.json");
    const actualFile = join(dir, "actual.json");

    await writeFile(
      expectedFile,
      `${JSON.stringify(
        {
          status: "inferred",
          captureCount: 1,
          sourceFiles: ["capture-a.json"],
          rowCount: 1,
          rows: [
            {
              operation: "create",
              method: "POST",
              endpoint: "/api/v1/drafts",
              confidence: "high",
              occurrences: 1,
              sourceFiles: ["capture-a.json"],
              evidence: ["Request targets the drafts collection."],
              requestBodyKeys: ["body", "title"],
              responseKeys: ["id", "slug"],
            },
          ],
          note: "expected",
        },
        null,
        2,
      )}\n`,
      "utf8",
    );

    await writeFile(
      actualFile,
      `${JSON.stringify(
        {
          status: "inferred",
          captureCount: 1,
          sourceFiles: ["capture-a.json"],
          rowCount: 1,
          rows: [
            {
              operation: "create",
              method: "POST",
              endpoint: "/api/v1/drafts",
              confidence: "medium",
              occurrences: 1,
              sourceFiles: ["capture-a.json"],
              evidence: ["Request targets the drafts collection."],
              requestBodyKeys: ["body", "title"],
              responseKeys: ["id", "slug"],
            },
          ],
          note: "actual",
        },
        null,
        2,
      )}\n`,
      "utf8",
    );

    const comparison = await compareDraftContractMatrixArtifacts(
      expectedFile,
      actualFile,
    );

    assert.equal(comparison.equal, false);
    assert.ok(
      comparison.differences.some((difference) =>
        difference.includes("confidence"),
      ),
    );
  });
});
