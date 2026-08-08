import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { parseFrontmatter } from "../../parser/frontmatter.js";
import { parseMarkdownString } from "../../parser/markdown.js";

describe("regression assurance", () => {
  it("preserves quoted titles and comma-separated tags", () => {
    const parsed = parseFrontmatter(
      '---\r\ntitle: "Policy: Then and Now"\r\ntags: policy, evidence\r\n---\r\nBody',
    );
    assert.equal(parsed.metadata.title, "Policy: Then and Now");
    assert.deepEqual(parsed.metadata.tags, ["policy", "evidence"]);
    assert.equal(parsed.body, "Body");
  });

  it("retains the adjacent-risk warning regression", async () => {
    const parsed = await parseMarkdownString(
      "![Hero](https://example.test/hero.png)\n\n---\n\n{{subscribe: Join}}",
    );
    assert.equal(parsed.warnings.length, 2);
    assert.match(parsed.warnings[0] ?? "", /Adjacent image and horizontalRule/);
  });
});
