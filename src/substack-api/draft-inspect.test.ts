import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { buildDraftInspectionReport } from "./draft-inspect.js";

describe("buildDraftInspectionReport", () => {
  it("bundles payload compatibility, section resolution, duplicate lookup, and planning", () => {
    const report = buildDraftInspectionReport({
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
      publicationUrl: "https://rareinsights.substack.com/",
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
            id: 12,
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
            sectionId: 12,
          },
        ],
      },
      mappings: [
        {
          sourceFile: "drafts/example.md",
          publicationUrl: "https://rareinsights.substack.com/",
          draftId: "101",
          draftUrl: "https://rareinsights.substack.com/publish/post/101",
          title: "Example Draft",
          slug: "example-draft",
          updatedAt: "2026-04-28T00:00:00.000Z",
        },
      ],
      existingDraft: {
        sourceFile: "drafts/example.md",
        publicationUrl: "https://rareinsights.substack.com/",
        draftId: "101",
        draftUrl: "https://rareinsights.substack.com/publish/post/101",
        title: "Example Draft",
        slug: "example-draft",
        updatedAt: "2026-04-28T00:00:00.000Z",
      },
    });

    assert.equal(report.status, "ready");
    assert.equal(report.title, "Example Draft");
    assert.equal(report.sectionResolutionApplied, true);
    assert.equal(report.resolvedSectionId, 12);
    assert.equal(report.section.status, "resolved");
    assert.equal(report.duplicates.status, "matched");
    assert.ok(report.plan);
    assert.equal(report.plan.operation, "update");
    assert.equal(report.plan.payload.sectionId, 12);
  });
});
