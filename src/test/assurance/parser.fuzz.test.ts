import assert from "node:assert/strict";
import fc from "fast-check";
import { describe, it } from "vitest";
import { safeParseAppConfig } from "../../config/store.js";
import { parseFrontmatter } from "../../parser/frontmatter.js";
import { parseMarkdownString } from "../../parser/markdown.js";
import { validateProseMirrorDocument } from "../../parser/schema.js";

const numRuns = Number(process.env.FUZZ_RUNS ?? 80);

describe("parser and config fuzzing", () => {
  it("never throws unstructured errors for arbitrary front matter text", () => {
    fc.assert(
      fc.property(fc.string({ maxLength: 200 }), (source) => {
        try {
          const parsed = parseFrontmatter(source);
          assert.ok(Array.isArray(parsed.metadata.tags));
          assert.equal(typeof parsed.body, "string");
        } catch (error) {
          assert.ok(error instanceof Error);
        }
      }),
      { seed: 20_260_811, numRuns },
    );
  });

  it("round-trips generated safe tag lists", () => {
    fc.assert(
      fc.property(
        fc.array(fc.stringMatching(/^[A-Za-z0-9_-]{1,12}$/), { maxLength: 8 }),
        (tags) => {
          const parsed = parseFrontmatter(`---\ntags: ${tags.join(", ")}\n---\nBody`);
          assert.deepEqual(parsed.metadata.tags, tags);
        },
      ),
      { seed: 20_260_812, numRuns },
    );
  });

  it("produces a ProseMirror document or a structured failure for markdown", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.stringMatching(/^[#>*`\sA-Za-z0-9._-]{0,120}$/),
        async (body) => {
          const parsed = await parseMarkdownString(`---\ntitle: Fuzz\n---\n${body}`);
          assert.equal(validateProseMirrorDocument(parsed.document).type, "doc");
        },
      ),
      { seed: 20_260_813, numRuns },
    );
  });

  it("accepts or rejects arbitrary JSON as app config without hanging", () => {
    fc.assert(
      fc.property(fc.jsonValue(), (value) => {
        const result = safeParseAppConfig(value);
        assert.equal(typeof result.success, "boolean");
      }),
      { seed: 20_260_814, numRuns },
    );
  });

  it("rejects unknown browser runtimes and accepts documented ones", () => {
    fc.assert(
      fc.property(
        fc.constantFrom("browserbase", "local", "camoufox"),
        fc.stringMatching(/^[a-z]{3,12}$/),
        (runtime, noise) => {
          assert.equal(safeParseAppConfig({ browserRuntime: runtime }).success, true);
          if (noise !== runtime) {
            assert.equal(safeParseAppConfig({ browserRuntime: noise }).success, false);
          }
        },
      ),
      { seed: 20_260_815, numRuns: Math.min(numRuns, 40) },
    );
  });
});
