import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { describe, it } from "vitest";
import { findDraftMapping, loadDraftMappings, saveDraftMapping } from "./draft-mappings.js";

describe("draft mappings", () => {
  it("saves and replaces mappings by source file and publication", async () => {
    await withTempState(async () => {
      assert.deepEqual(await loadDraftMappings(), []);

      await saveDraftMapping({
        sourceFile: "post.md",
        publicationUrl: "https://rareinsights.substack.com/p/ignored",
        draftId: 123,
        draftUrl: "https://rareinsights.substack.com/publish/post/123",
        title: "First title",
        slug: "first-title",
      });

      await saveDraftMapping({
        sourceFile: "post.md",
        publicationUrl: "https://rareinsights.substack.com/",
        draftId: "456",
        title: "Updated title",
      });

      const mappings = await loadDraftMappings();
      const mapping = await findDraftMapping("post.md", "https://rareinsights.substack.com");

      assert.equal(mappings.length, 1);
      assert.ok(mapping);
      assert.equal(mapping.draftId, "456");
      assert.equal(mapping.title, "Updated title");
      assert.equal(mapping.sourceFile, resolve("post.md"));
      assert.equal(mapping.publicationUrl, "https://rareinsights.substack.com/");
    });
  });
});

async function withTempState(run: () => Promise<void>): Promise<void> {
  const previousStateDir = process.env.SUBSTACK_CLI_STATE_DIR;
  const temp = await mkdtemp(join(tmpdir(), "substack-cli-test-"));

  try {
    process.env.SUBSTACK_CLI_STATE_DIR = join(temp, ".substack-cli");
    await run();
  } finally {
    if (previousStateDir === undefined) {
      delete process.env.SUBSTACK_CLI_STATE_DIR;
    } else {
      process.env.SUBSTACK_CLI_STATE_DIR = previousStateDir;
    }
    await rm(temp, { recursive: true, force: true });
  }
}
