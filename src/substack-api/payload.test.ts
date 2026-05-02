import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { parseMarkdownString } from "../parser/markdown.js";
import type { ProseMirrorNode } from "../types.js";
import {
  buildSubstackDraftPayload,
  buildDraftWriteRequestBody,
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

describe("buildDraftWriteRequestBody", () => {
  const payload: ReturnType<typeof buildSubstackDraftPayload> = {
    title: "Test Title",
    subtitle: "Test Subtitle",
    slug: "test-slug",
    body: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "Hello" }] }] },
    audience: "everyone",
    tags: ["test"],
    comments: "enabled",
  };

  it("produces create body keys matching the live Substack contract", () => {
    const body = buildDraftWriteRequestBody(payload, 12345, "create");

    const createKeys = Object.keys(body).sort();

    assert.deepEqual(createKeys, [
      "audience",
      "draft_body",
      "draft_bylines",
      "draft_podcast_duration",
      "draft_podcast_url",
      "draft_section_id",
      "draft_subtitle",
      "draft_title",
      "section_chosen",
      "type",
    ].sort());

    assert.equal(body.draft_title, "Test Title");
    assert.equal(body.draft_subtitle, "Test Subtitle");
    assert.equal(body.audience, "everyone");
    assert.equal(body.type, "newsletter");
    assert.equal(body.section_chosen, false);
    assert.equal(body.draft_section_id, null);
  });

  it("produces update body keys matching the live Substack contract", () => {
    const body = buildDraftWriteRequestBody(payload, 12345, "update", "2026-04-29T14:33:35.119Z");

    const updateKeys = Object.keys(body).sort();

    assert.deepEqual(updateKeys, [
      "draft_body",
      "draft_bylines",
      "draft_podcast_duration",
      "draft_podcast_url",
      "draft_section_id",
      "draft_subtitle",
      "draft_title",
      "last_updated_at",
      "section_chosen",
    ].sort());

    assert.equal(body.last_updated_at, "2026-04-29T14:33:35.119Z");
    assert.ok(!("audience" in body), "update body should not include audience");
    assert.ok(!("type" in body), "update body should not include type");
  });

  it("includes section_chosen only when sectionId is set", () => {
    const withSection = buildDraftWriteRequestBody(
      { ...payload, sectionId: 367275 },
      12345,
      "create",
    );
    assert.equal(withSection.section_chosen, true);
    assert.equal(withSection.draft_section_id, 367275);

    const withoutSection = buildDraftWriteRequestBody(payload, 12345, "create");
    assert.equal(withoutSection.section_chosen, false);
    assert.equal(withoutSection.draft_section_id, null);
  });
});
