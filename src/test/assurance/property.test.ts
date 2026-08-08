import assert from "node:assert/strict";
import fc from "fast-check";
import { describe, it } from "vitest";
import { parseFrontmatter } from "../../parser/frontmatter.js";

describe("property-based assurance", () => {
  it("normalizes every generated safe tag list without empty values", () => {
    fc.assert(
      fc.property(
        fc.array(fc.stringMatching(/^[A-Za-z0-9_-]{1,20}$/), { maxLength: 20 }),
        (tags) => {
          const parsed = parseFrontmatter(`---\ntags: ${tags.join(", ")}\n---\nBody`);
          assert.deepEqual(parsed.metadata.tags, tags);
          assert.ok(parsed.metadata.tags.every((tag) => tag.length > 0));
        },
      ),
      { seed: 13_013, numRuns: 200 },
    );
  });
});
