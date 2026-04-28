import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "vitest";
import {
  captureFixture,
  compareFixture,
  validateSchemaFile,
} from "./fixtures.js";

describe("schema fixtures", () => {
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
