import assert from "node:assert/strict";
import fc from "fast-check";
import { describe, it } from "vitest";
import { safeParseAppConfig } from "../../config/store.js";
import { parseFrontmatter } from "../../parser/frontmatter.js";
import { parseMarkdownString } from "../../parser/markdown.js";

const numRuns = Number(process.env.FUZZ_RUNS ?? 120);

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
      { seed: 13_013, numRuns },
    );
  });

  it("keeps a missing front-matter document as the entire body", () => {
    fc.assert(
      fc.property(
        fc.stringMatching(/^[A-Za-z0-9 \n]{0,80}$/).filter((body) => !body.startsWith("---")),
        (body) => {
          const parsed = parseFrontmatter(body);
          assert.equal(parsed.body, body);
          assert.deepEqual(parsed.metadata.tags, []);
        },
      ),
      { seed: 13_015, numRuns },
    );
  });

  it("always emits a doc node for heading-only markdown", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 4 }),
        fc.stringMatching(/^[A-Za-z]{1,24}$/),
        async (depth, title) => {
          const parsed = await parseMarkdownString(`${"#".repeat(depth)} ${title}\n`);
          assert.equal(parsed.document.type, "doc");
          assert.equal(parsed.document.content?.[0]?.type, "heading");
        },
      ),
      { seed: 13_016, numRuns },
    );
  });

  it("treats operatorMode as a closed enum", () => {
    fc.assert(
      fc.property(fc.constantFrom("solo", "team", "agency", "ci"), (mode) => {
        const parsed = safeParseAppConfig({ operatorMode: mode });
        assert.equal(parsed.success, true);
        assert.equal(safeParseAppConfig({ operatorMode: `${mode}-x` }).success, false);
      }),
      { seed: 13_017, numRuns: 40 },
    );
  });
});
