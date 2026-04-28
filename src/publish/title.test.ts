import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { parseMarkdownString } from "../parser/markdown.js";
import { resolvePostTitle } from "./title.js";

describe("resolvePostTitle", () => {
  it("prefers front matter title", async () => {
    const post = await parseMarkdownString(
      `---
title: "Front Matter Title"
---
# Heading Title
`,
      "post.md",
    );

    assert.equal(resolvePostTitle(post), "Front Matter Title");
  });

  it("falls back to the first heading", async () => {
    const post = await parseMarkdownString(
      "# Heading Title\n\nBody.",
      "post.md",
    );

    assert.equal(resolvePostTitle(post), "Heading Title");
  });

  it("falls back to the file basename", async () => {
    const post = await parseMarkdownString("Body only.", "my-post.md");

    assert.equal(resolvePostTitle(post), "my-post");
  });
});
