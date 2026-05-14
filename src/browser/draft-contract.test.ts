import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { inferDraftContract } from "./draft-contract.js";

describe("inferDraftContract", () => {
  it("infers a likely create draft contract from capture review data", () => {
    const report = inferDraftContract({
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
      note: "test capture",
    });

    assert.equal(report.status, "inferred");
    assert.ok(report.candidates.some((candidate) => candidate.operation === "create"));
    assert.ok(report.candidates[0]);
    const firstCandidate = report.candidates[0];
    assert.equal(firstCandidate.confidence, "high");
  });
});
