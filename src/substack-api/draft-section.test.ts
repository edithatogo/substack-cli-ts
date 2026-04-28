import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { buildDraftSectionResolutionReport } from "./draft-section.js";

describe("buildDraftSectionResolutionReport", () => {
  it("resolves a section by matching section id and name", () => {
    const report = buildDraftSectionResolutionReport({
      post: {
        filePath: "drafts/example.md",
        metadata: {
          tags: [],
          section: "News",
          sectionId: 12,
        },
        markdown: "# Example Draft",
        html: "<h1>Example Draft</h1>",
        document: {
          type: "doc",
          content: [{ type: "paragraph" }],
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
            id: 12,
            publicationId: 1,
            name: "News",
            slug: "news",
          },
        ],
      },
    });

    assert.equal(report.status, "resolved");
    assert.equal(report.candidateCount, 1);
    const resolvedSection = report.resolvedSection!;
    assert.equal(resolvedSection.id, 12);
    assert.equal(resolvedSection.slug, "news");
  });
});
