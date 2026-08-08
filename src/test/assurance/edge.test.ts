import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { parseFrontmatter } from "../../parser/frontmatter.js";

describe("edge assurance", () => {
  it("handles empty, delimiter-like, Unicode and CRLF input deterministically", () => {
    assert.deepEqual(parseFrontmatter("").metadata.tags, []);
    assert.equal(parseFrontmatter("--- not frontmatter").body, "--- not frontmatter");
    const unicode = parseFrontmatter("---\r\ntitle: Māori 日本語 🧪\r\ntags: one,, two\r\n---\r\n\0body");
    assert.equal(unicode.metadata.title, "Māori 日本語 🧪");
    assert.deepEqual(unicode.metadata.tags, ["one", "two"]);
    assert.equal(unicode.body, "\0body");
  });

  it("rejects invalid enum boundaries instead of coercing them", () => {
    assert.throws(() => parseFrontmatter("---\naudience: administrators\n---\nBody"));
  });
});
