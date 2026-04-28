import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { parseMarkdownString } from "../parser/markdown.js";
import type { ProseMirrorNode } from "../types.js";
import {
  buildSubstackDraftPayload,
  validatePayloadCompatibility,
} from "./payload.js";

describe("buildSubstackDraftPayload", () => {
  it("normalizes metadata and supported ProseMirror content", async () => {
    const post = await parseMarkdownString(`---
title: "API Draft"
subtitle: "Draft subtitle"
slug: api-draft
tags: [substack, api]
audience: free
section: ai-governance
sectionId: 367275
comments: enabled
---
# API Draft

Hello **world** with [a link](https://example.com).

- one
- two

> quoted

\`\`\`ts
const value = 1;
\`\`\`

---

{{paywall}}

{{subscribe: Join now}}
`);

    const payload = buildSubstackDraftPayload(post);

    assert.equal(payload.title, "API Draft");
    assert.equal(payload.subtitle, "Draft subtitle");
    assert.equal(payload.slug, "api-draft");
    assert.deepEqual(payload.tags, ["substack", "api"]);
    assert.equal(payload.audience, "free");
    assert.equal(payload.section, "ai-governance");
    assert.equal(payload.sectionId, 367275);
    assert.equal(payload.comments, "enabled");
    assert.equal(payload.body.type, "doc");
  });

  it("rejects unsupported nodes before API write calls", () => {
    const document: ProseMirrorNode = {
      type: "doc",
      content: [{ type: "unsupportedWidget" }],
    };

    const report = validatePayloadCompatibility(document);

    assert.equal(report.ok, false);
    assert.equal(report.issues[0]?.type, "unsupportedWidget");
    assert.throws(
      () =>
        buildSubstackDraftPayload({
          filePath: "<memory>",
          metadata: { tags: [] },
          markdown: "",
          html: "",
          document,
          media: {
            assets: [],
            localCount: 0,
            remoteCount: 0,
            dataCount: 0,
          },
        }),
      /Unsupported Substack payload content/,
    );
  });
});
