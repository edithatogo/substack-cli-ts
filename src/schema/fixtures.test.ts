import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "vitest";
import {
  captureFixture,
  compareFixture,
  validateSchemaFile,
} from "./fixtures.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "..", "..");

interface FixtureEntry {
  markdownFile: string;
  fixtureFile: string;
  label: string;
}

const FIXTURE_REGISTRY: FixtureEntry[] = [
  { label: "basic", markdownFile: "examples/basic.md", fixtureFile: "fixtures/prosemirror/basic.json" },
  { label: "embeds", markdownFile: "examples/embeds.md", fixtureFile: "fixtures/prosemirror/embeds.json" },
  { label: "formatting", markdownFile: "examples/formatting.md", fixtureFile: "fixtures/prosemirror/formatting.json" },
  { label: "images", markdownFile: "examples/images.md", fixtureFile: "fixtures/prosemirror/images.json" },
  { label: "media", markdownFile: "examples/media.md", fixtureFile: "fixtures/prosemirror/media.json" },
  { label: "tables", markdownFile: "examples/tables.md", fixtureFile: "fixtures/prosemirror/tables.json" },
];

for (const entry of FIXTURE_REGISTRY) {
  describe(`schema fixture: ${entry.label}`, () => {
    const markdownFile = join(repoRoot, entry.markdownFile);
    const fixtureFile = join(repoRoot, entry.fixtureFile);

    it("validates the fixture file", async () => {
      const summary = await validateSchemaFile(fixtureFile);
      assert.equal(summary.valid, true);
    });

    it("has not drifted from current parser output", async () => {
      const result = await compareFixture(markdownFile, fixtureFile);
      assert.equal(
        result.equal,
        true,
        `Fixture ${entry.fixtureFile} does not match current parser output. ` +
        `Expected: ${JSON.stringify(result.expectedSummary)}, ` +
        `Actual: ${JSON.stringify(result.actualSummary)}. ` +
        `Re-capture with: node dist/cli.js schema capture ${entry.markdownFile} --out ${entry.fixtureFile}`,
      );
    });

    it("includes sourceFile metadata", async () => {
      const raw = await readFile(fixtureFile, "utf8");
      assert.match(raw, /"sourceFile"/);
    });
  });
}

describe("schema fixtures tooling", () => {
  it("captures, validates, and compares generated fixtures", async () => {
    const temp = await mkdtemp(join(tmpdir(), "substack-cli-fixture-"));

    try {
      const markdownFile = join(temp, "post.md");
      const fixtureFile = join(temp, "fixture.json");

      await writeFile(markdownFile, "# Fixture\n\nHello **world**.", "utf8");

      const fixture = await captureFixture(markdownFile, fixtureFile);
      const summary = await validateSchemaFile(fixtureFile);
      const comparison = await compareFixture(markdownFile, fixtureFile);

      assert.equal(fixture.summary.valid, true);
      assert.deepEqual(summary.nodeTypes, [
        "doc",
        "heading",
        "paragraph",
        "text",
      ]);
      assert.equal(comparison.equal, true);

      const raw = await readFile(fixtureFile, "utf8");
      assert.match(raw, /"sourceFile"/);
    } finally {
      await rm(temp, { recursive: true, force: true });
    }
  });
});
