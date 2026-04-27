import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseMarkdownString } from "./markdown.js";
import { preparePost } from "../publish/prepare.js";

describe("parseMarkdownString", () => {
  it("extracts front matter and creates a ProseMirror document", async () => {
    const parsed = await parseMarkdownString(`---
title: "Example post"
tags: [substack, markdown]
---
# Heading

Hello **world**.
`);

    assert.equal(parsed.metadata.title, "Example post");
    assert.deepEqual(parsed.metadata.tags, ["substack", "markdown"]);
    assert.equal(parsed.document.type, "doc");
    assert.equal(parsed.document.content?.[0]?.type, "heading");
  });

  it("maps Substack shortcodes to custom Tiptap nodes", async () => {
    const parsed = await parseMarkdownString(`Intro

{{paywall}}

{{subscribe: Join now}}
`);

    const nodeTypes = parsed.document.content?.map((node) => node.type);
    assert.ok(nodeTypes?.includes("paywallDivider"));
    assert.ok(nodeTypes?.includes("subscribeWidget"));
  });
});

describe("preparePost", () => {
  it("rejects invalid schedule timestamps", async () => {
    await assert.rejects(
      () => preparePost("examples/basic.md", { mode: "schedule", scheduleAt: "tomorrow-ish" }),
      /Invalid schedule timestamp/,
    );
  });
});
