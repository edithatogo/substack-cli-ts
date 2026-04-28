import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { buildDraftDuplicateLookupReport } from "./draft-lookup.js";

describe("buildDraftDuplicateLookupReport", () => {
  it("finds likely duplicates from inventory posts and stored mappings", () => {
    const report = buildDraftDuplicateLookupReport({
      post: {
        filePath: "drafts/example.md",
        metadata: {
          title: "Example Draft",
          slug: "example-draft",
          tags: [],
          section: "News",
        },
        markdown: "# Example Draft",
        html: "<h1>Example Draft</h1>",
        document: {
          type: "doc",
          content: [
            {
              type: "paragraph",
              content: [{ type: "text", text: "Example Draft" }],
            },
          ],
        },
        media: {
          assets: [],
          localCount: 0,
          remoteCount: 0,
          dataCount: 0,
        },
      },
      inventory: {
        status: "ok",
        endpoints: [],
        message: "ok",
        configuredPublication: {
          name: "Rare Insights",
          subdomain: "rareinsights",
        },
        sections: [
          {
            id: 1,
            publicationId: 1,
            name: "News",
            slug: "news",
          },
        ],
        posts: [
          {
            id: 101,
            publicationId: 1,
            title: "Example Draft",
            slug: "example-draft",
            canonicalUrl: "https://rareinsights.substack.com/p/example-draft",
            sectionId: 1,
          },
        ],
      },
      mappings: [
        {
          sourceFile: "/tmp/drafts/example.md",
          publicationUrl: "https://rareinsights.substack.com/",
          draftId: "101",
          draftUrl: "https://rareinsights.substack.com/publish/post/101",
          title: "Example Draft",
          slug: "example-draft",
          updatedAt: "2026-04-28T00:00:00.000Z",
        },
      ],
    });

    assert.equal(report.status, "matched");
    assert.equal(report.candidateCount, 2);
    const firstCandidate = report.candidates[0]!;
    const secondCandidate = report.candidates[1]!;
    assert.equal(firstCandidate.source, "inventory");
    assert.equal(firstCandidate.matchType, "slug");
    assert.equal(secondCandidate.source, "mapping");
  });
});
