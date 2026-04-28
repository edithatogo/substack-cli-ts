import assert from "node:assert/strict";
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "vitest";
import { writeDraftContractMatrixFixture } from "./draft-contract-matrix.js";

describe("writeDraftContractMatrixFixture", () => {
  it("writes a normalized matrix fixture file", async () => {
    const dir = await mkdtemp(join(tmpdir(), "draft-contract-matrix-"));
    const outFile = join(dir, "matrix.json");

    const report = await writeDraftContractMatrixFixture(
      [
        {
          sourceFile: "capture.json",
          review: {
            capturedAt: "2026-04-28T00:00:00.000Z",
            publicationUrl: "https://rareinsights.substack.com/",
            pageUrl: "https://rareinsights.substack.com/publish/post",
            requestCount: 1,
            responseCount: 1,
            requestEndpoints: [
              {
                method: "POST",
                url: "https://rareinsights.substack.com/api/v1/drafts",
                bodyKind: "json",
                bodyLength: 42,
                bodyKeys: ["title", "body", "slug"],
              },
            ],
            responseEndpoints: [],
            note: "capture",
          },
        },
      ],
      { outFile },
    );

    const content = await readFile(outFile, "utf8");
    const parsed = JSON.parse(content) as {
      rowCount: number;
      sourceFiles: string[];
    };

    assert.equal(report.rowCount, 1);
    assert.equal(parsed.rowCount, 1);
    assert.deepEqual(parsed.sourceFiles, ["capture.json"]);
  });
});
