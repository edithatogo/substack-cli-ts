import assert from "node:assert/strict";
import { describe, it } from "vitest";
import {
  buildBatchSchedulePlan,
  parseBatchScheduleFileContent,
  parseIdFileContent,
} from "./selectors.js";

describe("batch selectors", () => {
  it("parses id files with comments and blank lines", () => {
    assert.deepEqual(parseIdFileContent("123\n\n# comment\n456 # inline\n"), ["123", "456"]);
  });

  it("parses schedule files from arrays and item objects", () => {
    const items = parseBatchScheduleFileContent(
      JSON.stringify({
        items: [
          {
            draft_id: 123,
            scheduled_at: "2026-07-01T09:00:00Z",
            title: "First",
            source_file: "posts/first.md",
          },
        ],
      }),
    );
    const arrayItems = parseBatchScheduleFileContent(
      JSON.stringify([{ id: "456", at: "2026-07-02T09:00:00Z" }]),
    );

    assert.equal(items[0]?.draftId, "123");
    assert.equal(items[0]?.sourceFile, "posts/first.md");
    assert.equal(arrayItems[0]?.draftId, "456");
  });

  it("rejects malformed schedule selector files", () => {
    assert.throws(() => parseBatchScheduleFileContent("{"), /Could not parse/);
    assert.throws(
      () => parseBatchScheduleFileContent(JSON.stringify({ posts: [] })),
      /items array/,
    );
    assert.throws(
      () => parseBatchScheduleFileContent(JSON.stringify(["123"])),
      /must be an object/,
    );
    assert.throws(
      () =>
        parseBatchScheduleFileContent(JSON.stringify([{ scheduledAt: "2026-07-01T09:00:00Z" }])),
      /missing draftId/,
    );
    assert.throws(
      () => parseBatchScheduleFileContent(JSON.stringify([{ draftId: "123" }])),
      /missing scheduledAt/,
    );
    assert.throws(
      () =>
        parseBatchScheduleFileContent(JSON.stringify([{ draftId: "123", scheduledAt: "soon" }])),
      /invalid scheduledAt/,
    );
  });

  it("builds an explicit batch plan with filters, limit, and skip state", () => {
    const plan = buildBatchSchedulePlan({
      selectorSourceFiles: ["schedule.json", "ids.txt"],
      ids: ["123", "456", "789"],
      limit: 2,
      scheduleItems: [
        { draftId: "123", scheduledAt: "2026-07-01T09:00:00Z", status: "draft" },
        { draftId: "456", scheduledAt: "2026-07-02T09:00:00Z", status: "scheduled" },
        { draftId: "789", scheduledAt: "2026-07-03T09:00:00Z", status: "draft" },
      ],
    });

    assert.deepEqual(plan.selectorSourceFiles, ["schedule.json", "ids.txt"]);
    assert.equal(plan.items.length, 1);
    assert.equal(plan.items[0]?.draftId, "123");
    assert.equal(plan.skipped.length, 1);
    assert.equal(plan.skipped[0]?.reason, "already-scheduled-or-live");
  });
});
