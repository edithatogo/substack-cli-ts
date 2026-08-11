import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { parseFrontmatter } from "../../parser/frontmatter.js";
import { parseMarkdownString } from "../../parser/markdown.js";
import { simulatePublishGate } from "../harness/deterministic-simulator.js";

describe("edge assurance", () => {
  it("handles empty, delimiter-like, Unicode and CRLF input deterministically", () => {
    assert.deepEqual(parseFrontmatter("").metadata.tags, []);
    assert.equal(parseFrontmatter("--- not frontmatter").body, "--- not frontmatter");
    const unicode = parseFrontmatter(
      "---\r\ntitle: Māori 日本語 🧪\r\ntags: one,, two\r\n---\r\n\0body",
    );
    assert.equal(unicode.metadata.title, "Māori 日本語 🧪");
    assert.deepEqual(unicode.metadata.tags, ["one", "two"]);
    assert.equal(unicode.body, "\0body");
  });

  it("rejects invalid enum boundaries instead of coercing them", () => {
    assert.throws(() => parseFrontmatter("---\naudience: administrators\n---\nBody"));
  });

  it("parses deeply nested headings without calling Substack", async () => {
    const markdown = Array.from(
      { length: 8 },
      (_, index) => `${"#".repeat((index % 6) + 1)} H${index}`,
    ).join("\n\n");
    const parsed = await parseMarkdownString(markdown);
    assert.equal(parsed.document.type, "doc");
    assert.ok((parsed.document.content?.length ?? 0) >= 8);
  });

  it("keeps unconfirmed publish fail-closed", () => {
    const result = simulatePublishGate({
      seed: 7,
      mode: "publish",
      confirmed: false,
      dryRun: false,
    });
    assert.equal(result.status, "blocked");
    assert.match(result.reason ?? "", /--yes/);
  });
});
