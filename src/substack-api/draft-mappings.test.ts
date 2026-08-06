import assert from "node:assert/strict";
import { mkdtemp, rm, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "vitest";
import {
  buildDraftMappingsExport,
  findDraftMapping,
  importDraftMappings,
  loadDraftMappings,
  normalizePublicationUrl,
  normalizeSourceFile,
  parseDraftMappingsPayload,
  saveDraftMapping,
} from "./draft-mappings.js";

describe("draft mappings", () => {
  it("appends mappings by source file and publication", async () => {
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

      assert.equal(mappings.length, 2);
      assert.equal(mapping?.draftId, "456");
      assert.equal(mapping?.title, "Updated title");
      assert.equal(mapping?.sourceFile, normalizeSourceFile("post.md"));
      assert.equal(mapping?.publicationUrl, "https://rareinsights.substack.com/");
      assert.equal(mapping?.eventSequence, 2);
      assert.equal(mapping?.eventId?.length, 64);
      assert.ok(typeof mapping?.queueHash === "string");
    });
  });

  it("imports mappings idempotently with queue checks", async () => {
    await withTempState(async () => {
      const seed = [
        {
          sourceFile: normalizeSourceFile("post.md"),
          publicationUrl: "https://rareinsights.substack.com/",
          publicationId: "rareinsights.substack.com",
          draftId: "999",
          draftUrl: "https://rareinsights.substack.com/publish/post/999",
          title: "Seed title",
          slug: "seed-title",
          updatedAt: new Date("2026-08-01T00:00:00.000Z").toISOString(),
          eventId: "seed-event",
          eventSequence: 1,
          eventType: "import",
        },
      ];

      await importDraftMappings(JSON.stringify({ mappings: seed }));

      const first = await importDraftMappings(JSON.stringify({ mappings: seed, schemaVersion: 1 }));
      assert.equal(first.status, "no-op");
      assert.equal(first.appended, 0);
      assert.equal(first.skipped, 1);
      assert.equal(first.duplicates, 1);

      const withDelta = [
        ...seed,
        {
          sourceFile: "post.md",
          publicationUrl: "https://rareinsights.substack.com/",
          publicationId: "rareinsights.substack.com",
          draftId: "1000",
          draftUrl: "https://rareinsights.substack.com/publish/post/1000",
          title: "Next title",
          slug: "next-title",
          updatedAt: new Date("2026-08-02T00:00:00.000Z").toISOString(),
          eventType: "import",
        },
      ];

      const second = await importDraftMappings(JSON.stringify({ mappings: withDelta }));
      assert.equal(second.status, "imported");
      assert.equal(second.appended, 1);
      assert.equal(second.skipped, 1);
      assert.equal(second.duplicates, 1);
      assert.equal(typeof second.beforeHash, "string");
      assert.equal(typeof second.afterHash, "string");

      const final = await loadDraftMappings();
      assert.equal(final.length, 2);
      assert.equal(final[1]?.draftId, "1000");
      assert.equal(final[1]?.queueHash?.length, 64);
    });
  });

  it("loads an empty list when the mappings file is missing", async () => {
    await withTempState(async () => {
      assert.deepEqual(await loadDraftMappings(), []);
    });
  });

  it("normalizes source file and publication URL inputs", () => {
    assert.equal(normalizeSourceFile("post.md").endsWith("post.md"), true);
    assert.equal(
      normalizePublicationUrl("https://rareinsights.substack.com/p/post?view=web#comments"),
      "https://rareinsights.substack.com/",
    );
  });

  it("builds export payload and parses legacy payload shapes", () => {
    const exportPayload = buildDraftMappingsExport([
      {
        sourceFile: normalizeSourceFile("post.md"),
        publicationUrl: "https://rareinsights.substack.com/",
        publicationId: "rareinsights.substack.com",
        draftId: "1",
        title: "Legacy title",
        updatedAt: "2026-08-01T00:00:00.000Z",
        eventType: "import",
        eventSequence: 1,
        eventId: "evt-1",
      },
    ]);

    const text = JSON.stringify(exportPayload);
    assert.equal(parseDraftMappingsPayload(text).length, 1);

    const legacy = JSON.stringify([
      {
        sourceFile: normalizeSourceFile("post.md"),
        publicationUrl: "https://rareinsights.substack.com/",
        publicationId: "rareinsights.substack.com",
        draftId: "1",
        title: "Legacy title",
        updatedAt: "2026-08-01T00:00:00.000Z",
        eventType: "import",
        eventSequence: 1,
        eventId: "evt-2",
      },
    ]);
    assert.equal(parseDraftMappingsPayload(legacy).length, 1);
  });

  it("supports dry-run import without mutating local mappings", async () => {
    await withTempState(async () => {
      const payload = {
        mappings: [
          {
            sourceFile: normalizeSourceFile("post.md"),
            publicationUrl: "https://rareinsights.substack.com/",
            publicationId: "rareinsights.substack.com",
            draftId: "2",
            title: "Dry run",
            updatedAt: "2026-08-03T00:00:00.000Z",
            eventType: "import",
          },
        ],
      };

      const summary = await importDraftMappings(JSON.stringify(payload), { dryRun: true });
      assert.equal(summary.status, "imported");
      assert.equal(summary.appended, 1);
      assert.deepEqual(await loadDraftMappings(), []);
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
      Reflect.deleteProperty(process.env, "SUBSTACK_CLI_STATE_DIR");
    } else {
      process.env.SUBSTACK_CLI_STATE_DIR = previousStateDir;
    }
    await rm(temp, { recursive: true, force: true });
  }
}
