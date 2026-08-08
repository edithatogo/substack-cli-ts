import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { parseMarkdownString } from "../../parser/markdown.js";

describe("metamorphic parser assurance", () => {
  it("preserves semantic output across line-ending transformations", async () => {
    const source = "---\ntitle: Metamorphic\ntags: one, two\n---\n# Heading\n\nParagraph";
    const lf = await parseMarkdownString(source);
    const crlf = await parseMarkdownString(source.replaceAll("\n", "\r\n"));
    assert.deepEqual(crlf.metadata, lf.metadata);
    assert.deepEqual(crlf.document, lf.document);
    assert.equal(crlf.html, lf.html);
  });

  it("ignores semantically empty trailing lines", async () => {
    const base = await parseMarkdownString("# Heading\n\nParagraph");
    const transformed = await parseMarkdownString("# Heading\n\nParagraph\n\n\n");
    assert.deepEqual(transformed.document, base.document);
  });
});
