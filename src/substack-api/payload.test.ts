import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { fc, test as fcTest } from "vitest/fast-check";
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
    body: {
      type: "doc",
      content: [{ type: "paragraph", content: [{ type: "text", text: "Hello" }] }],
    },
    audience: "everyone",
    tags: ["test"],
    comments: "enabled",
  };

  it("produces create body keys matching the live Substack contract", () => {
    const body = buildDraftWriteRequestBody(payload, 12345, "create");

    const createKeys = Object.keys(body).sort();

    assert.deepEqual(
      createKeys,
      [
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
      ].sort(),
    );

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

    assert.deepEqual(
      updateKeys,
      [
        "draft_body",
        "draft_bylines",
        "draft_podcast_duration",
        "draft_podcast_url",
        "draft_section_id",
        "draft_subtitle",
        "draft_title",
        "last_updated_at",
        "section_chosen",
      ].sort(),
    );

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

  it("includes shouldSendEmail in create body when set", () => {
    const withEmail = buildDraftWriteRequestBody(
      { ...payload, shouldSendEmail: true },
      12345,
      "create",
    );
    assert.equal(withEmail.should_send_email, true);

    const withoutEmail = buildDraftWriteRequestBody(payload, 12345, "create");
    assert.equal("should_send_email" in withoutEmail, false);
  });

  it("generates last_updated_at in update body when not provided", () => {
    const body = buildDraftWriteRequestBody(payload, 12345, "update");
    assert.ok("last_updated_at" in body);
    assert.equal(typeof body.last_updated_at, "string");
    assert.ok(body.last_updated_at!.length > 0);
  });
});

describe("validatePayloadCompatibility", () => {
  it("reports unsupported mark types", () => {
    const document = {
      type: "doc" as const,
      content: [
        {
          type: "paragraph" as const,
          content: [
            {
              type: "text" as const,
              text: "Hello",
              marks: [{ type: "unsupportedMark" }],
            },
          ],
        },
      ],
    };

    const report = validatePayloadCompatibility(document);
    assert.equal(report.ok, false);
    assert.equal(report.markTypes.length, 1);
    assert.equal(report.issues[0]?.type, "unsupportedMark");
    assert.equal(report.issues[0]?.reason, "mark type is not mapped for Substack API writes");
  });

  it("reports both unsupported nodes and marks together", () => {
    const document = {
      type: "doc" as const,
      content: [
        {
          type: "unsupportedNode" as const,
        },
      ],
    };

    const report = validatePayloadCompatibility(document);
    assert.equal(report.ok, false);
    assert.ok(report.nodeTypes.includes("unsupportedNode"));
  });

  it("reports ok for documents with only supported types", () => {
    const document = {
      type: "doc" as const,
      content: [
        {
          type: "paragraph" as const,
          content: [
            {
              type: "text" as const,
              text: "Hello",
              marks: [{ type: "bold" as const }],
            },
          ],
        },
      ],
    };

    const report = validatePayloadCompatibility(document);
    assert.equal(report.ok, true);
    assert.equal(report.issues.length, 0);
  });

  it("reports ok for documents with only supported types", () => {
    const document = {
      type: "doc" as const,
      content: [
        {
          type: "paragraph" as const,
          content: [
            {
              type: "text" as const,
              text: "Hello",
              marks: [{ type: "bold" as const }],
            },
          ],
        },
      ],
    };

    const report = validatePayloadCompatibility(document);
    assert.equal(report.ok, true);
    assert.equal(report.issues.length, 0);
  });
});

describe("buildDraftWriteRequestBody", () => {
  it("builds create request body with correct fields", () => {
    const { buildDraftWriteRequestBody } = await import("./payload.js");
    const payload = buildSubstackDraftPayload({
      filePath: "test.md",
      metadata: { title: "Test", tags: [] },
      markdown: "",
      html: "<p>Hello</p>",
      document: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "Hello" }] }] },
      media: { assets: [], localCount: 0, remoteCount: 0, dataCount: 0 },
    });
    const body = buildDraftWriteRequestBody(payload, 42, "create");
    assert.equal(body.draft_title, "Test");
    assert.equal(body.draft_bylines.length, 1);
    assert.equal(body.draft_bylines[0].id, 42);
  });
});

describe("validatePayloadCompatibility (property-based)", () => {
  const knownSupportedNodes = [
    "blockquote", "bulletList", "codeBlock", "doc", "embedNode",
    "hardBreak", "heading", "horizontalRule", "image", "listItem",
    "orderedList", "paragraph", "paywallDivider", "subscribeWidget",
    "table", "tableRow", "tableCell", "tableHeader", "text",
  ];

  const knownSupportedMarks = ["bold", "code", "italic", "link", "strike"];

  fcTest.prop({
    nodeType: fc.string({ minLength: 1, maxLength: 30 }),
    markType: fc.string({ minLength: 1, maxLength: 20 }),
  })("identifies unsupported node and mark types", ({ nodeType, markType }) => {
    fc.pre(!knownSupportedNodes.includes(nodeType));
    fc.pre(!knownSupportedMarks.includes(markType));

    const document: ProseMirrorNode = {
      type: "doc",
      content: [
        {
          type: nodeType as unknown as ProseMirrorNode["type"],
          content: [
            {
              type: "text",
              text: "Hello",
              marks: [{ type: markType as unknown as ProseMirrorNode["marks"][number]["type"] }],
            },
          ],
        },
      ],
    };

    const report = validatePayloadCompatibility(document);
    assert.equal(report.ok, false);
    assert.ok(report.nodeTypes.includes(nodeType) || report.markTypes.includes(markType));
    assert.ok(report.issues.length >= 1);
  });

  fcTest.prop({
    nodeType: fc.constantFrom(...knownSupportedNodes),
    markType: fc.constantFrom(...knownSupportedMarks),
  })("accepts supported node and mark types", ({ nodeType, markType }) => {
    const doc: ProseMirrorNode = {
      type: "doc",
      content: nodeType === "text"
        ? [{ type: "text", text: "Hello" }]
        : [
            {
              type: nodeType as ProseMirrorNode["type"],
              content: [
                { type: "text", text: "Hi", marks: [{ type: markType as ProseMirrorNode["marks"][number]["type"] }] },
              ],
            },
          ],
    };

    const report = validatePayloadCompatibility(doc);
    assert.equal(report.issues.length, 0);
  });
});