import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { parseMarkdownString } from "../parser/markdown.js";
import { planCreateDraft } from "./draft-write.js";

describe("planCreateDraft", () => {
  it("builds a local draft write plan without sending a request", async () => {
    const post = await parseMarkdownString(
      `---
title: "Planned Draft"
slug: planned-draft
---
Hello world.
`,
      "planned.md",
    );

    const plan = planCreateDraft(post, "https://rareinsights.substack.com/");

    assert.equal(plan.status, "planned");
    assert.equal(plan.operation, "create");
    assert.equal(plan.method, "POST");
    assert.equal(
      plan.endpoint,
      "https://rareinsights.substack.com/api/v1/drafts",
    );
    assert.equal(plan.payload.title, "Planned Draft");
    assert.equal(plan.duplicateKey.slug, "planned-draft");
    assert.equal(plan.duplicateKey.sourceFile, "planned.md");
    assert.equal(plan.sectionResolutionApplied, false);
  });

  it("plans an update when a stored mapping already exists", async () => {
    const post = await parseMarkdownString(
      `---
title: "Existing Draft"
---
Hello world.
`,
      "existing.md",
    );

    const plan = planCreateDraft(post, "https://rareinsights.substack.com/", {
      sourceFile: "existing.md",
      publicationUrl: "https://rareinsights.substack.com/",
      draftId: "123",
      draftUrl: "https://rareinsights.substack.com/publish/post/123",
      title: "Existing Draft",
      updatedAt: "2026-04-28T00:00:00.000Z",
    });

    assert.equal(plan.operation, "update");
    assert.equal(plan.method, "PUT");
    assert.equal(
      plan.endpoint,
      "https://rareinsights.substack.com/api/v1/drafts/123",
    );
    assert.equal(
      plan.draftUrl,
      "https://rareinsights.substack.com/publish/post/123",
    );
  });

  it("applies a resolved section to the planned payload", async () => {
    const post = await parseMarkdownString(
      `---
title: "Section Draft"
section: news
---
Hello world.
`,
      "section.md",
    );

    const plan = planCreateDraft(
      post,
      "https://rareinsights.substack.com/",
      null,
      {
        status: "resolved",
        sourceFile: "section.md",
        publicationUrl: "https://rareinsights.substack.com/",
        requestedSection: "news",
        requestedSectionId: undefined,
        resolvedSection: {
          id: 42,
          name: "News",
          slug: "news",
          score: 100,
          reasons: ["Section slug matches the requested section exactly."],
        },
        candidateCount: 1,
        candidates: [
          {
            id: 42,
            name: "News",
            slug: "news",
            score: 100,
            reasons: ["Section slug matches the requested section exactly."],
          },
        ],
        note: "test",
      },
    );

    assert.equal(plan.sectionResolutionApplied, true);
    assert.equal(plan.resolvedSectionId, 42);
    assert.equal(plan.payload.sectionId, 42);
  });
});
