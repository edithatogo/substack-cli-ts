import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { buildDraftContractMatrix } from "./draft-contract-matrix.js";

describe("buildDraftContractMatrix", () => {
  it("merges repeated candidates across multiple capture reviews", () => {
    const report = buildDraftContractMatrix([
      {
        sourceFile: "capture-a.json",
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
              bodyKeys: ["body", "title", "slug"],
            },
          ],
          responseEndpoints: [
            {
              status: 200,
              url: "https://rareinsights.substack.com/api/v1/drafts",
              bodyKind: "json",
              bodyLength: 84,
              topLevelKeys: ["id", "slug", "url"],
              id: 123,
              slug: "example-draft",
              draftUrl: "https://rareinsights.substack.com/publish/post/123",
            },
          ],
          note: "first capture",
        },
      },
      {
        sourceFile: "capture-b.json",
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
              bodyLength: 44,
              bodyKeys: ["title", "body", "metadata"],
            },
          ],
          responseEndpoints: [
            {
              status: 200,
              url: "https://rareinsights.substack.com/api/v1/drafts",
              bodyKind: "json",
              bodyLength: 90,
              topLevelKeys: ["id", "slug", "url"],
              id: 124,
              slug: "example-draft-2",
              draftUrl: "https://rareinsights.substack.com/publish/post/124",
            },
          ],
          note: "second capture",
        },
      },
    ]);

    assert.equal(report.status, "inferred");
    assert.equal(report.captureCount, 2);
    assert.equal(report.rowCount, 1);
    const row = report.rows[0]!;
    assert.equal(row.occurrences, 2);
    assert.equal(row.confidence, "high");
    assert.deepEqual(row.sourceFiles, ["capture-a.json", "capture-b.json"]);
  });
});
