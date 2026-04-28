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
    assert.equal(plan.method, "POST");
    assert.equal(
      plan.endpoint,
      "https://rareinsights.substack.com/api/v1/drafts",
    );
    assert.equal(plan.payload.title, "Planned Draft");
    assert.equal(plan.duplicateKey.slug, "planned-draft");
    assert.equal(plan.duplicateKey.sourceFile, "planned.md");
  });
});
