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
    assert.equal(plan.items.length, 2);
    assert.equal(plan.items[0]?.draftId, "123");
    assert.equal(plan.items[1]?.draftId, "789");
    assert.equal(plan.skipped.length, 1);
    assert.equal(plan.skipped[0]?.reason, "already-scheduled-or-live");
  });

  it("treats an explicitly empty filter file as selecting no items", () => {
    const plan = buildBatchSchedulePlan({
      selectorSourceFiles: ["schedule.json", "ids.txt"],
      ids: [],
      scheduleItems: [{ draftId: "123", scheduledAt: "2026-07-01T09:00:00Z" }],
    });

    assert.equal(plan.items.length, 0);
    assert.equal(plan.skipped.length, 0);
  });

  it("builds an unfiltered plan and honors numeric/state aliases", () => {
    const items = parseBatchScheduleFileContent(
      JSON.stringify([
        {
          id: 123,
          at: "2026-07-01T09:00:00Z",
          subject: "Numeric draft",
          file: "posts/numeric.md",
          state: "sent",
        },
        { draftId: "456", scheduledAt: "2026-07-02T09:00:00Z" },
      ]),
    );
    const plan = buildBatchSchedulePlan({
      selectorSourceFiles: ["schedule.json"],
      scheduleItems: items,
    });

    assert.equal(items[0]?.draftId, "123");
    assert.equal(items[0]?.title, "Numeric draft");
    assert.equal(items[0]?.sourceFile, "posts/numeric.md");
    assert.equal(plan.items.length, 1);
    assert.equal(plan.items[0]?.draftId, "456");
    assert.equal(plan.skipped[0]?.draftId, "123");
  });
});
