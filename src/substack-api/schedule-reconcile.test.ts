import assert from "node:assert/strict";
import { describe, it } from "vitest";
import {
  parseScheduleFileContent,
  parseScheduleReconcileKeys,
  reconcileSchedule,
  type ScheduledQueueItem,
} from "./schedule-reconcile.js";

describe("schedule reconciliation", () => {
  it("parses schedule files from object or array shapes", () => {
    const fromObject = parseScheduleFileContent(
      JSON.stringify({
        items: [
          {
            title: "First post",
            scheduled_at: "2026-07-01T09:00:00Z",
            draft_id: 123,
            status: "scheduled",
            source_file: "posts/first.md",
          },
        ],
      }),
    );
    const fromArray = parseScheduleFileContent(
      JSON.stringify([{ subject: "Second post", at: "2026-07-02T09:00:00Z" }]),
    );

    assert.equal(fromObject[0]?.title, "First post");
    assert.equal(fromObject[0]?.draftId, "123");
    assert.equal(fromObject[0]?.status, "scheduled");
    assert.equal(fromObject[0]?.sourceFile, "posts/first.md");
    assert.equal(fromArray[0]?.title, "Second post");
  });

  it("rejects malformed schedule files and selectors", () => {
    assert.throws(() => parseScheduleFileContent("{"), /Could not parse/);
    assert.throws(() => parseScheduleFileContent(JSON.stringify({ posts: [] })), /items array/);
    assert.throws(
      () => parseScheduleFileContent(JSON.stringify([{ scheduledAt: "2026-07-01T09:00:00Z" }])),
      /needs title, draftId, or postId/,
    );
    assert.throws(() => parseScheduleFileContent(JSON.stringify(["post"])), /must be an object/);
    assert.throws(
      () => parseScheduleFileContent(JSON.stringify([{ title: "Post" }])),
      /missing scheduledAt/,
    );
    assert.throws(
      () => parseScheduleFileContent(JSON.stringify([{ title: "Post", scheduledAt: "soon" }])),
      /invalid scheduledAt/,
    );
    assert.throws(
      () =>
        parseScheduleFileContent(
          JSON.stringify([
            { title: "Post", scheduledAt: "2026-07-01T09:00:00Z", status: "unknown" },
          ]),
        ),
      /unsupported status/,
    );
    assert.throws(() => parseScheduleReconcileKeys(" , "), /At least one reconcile key/);
    assert.throws(() => parseScheduleReconcileKeys("title,slug"), /Unsupported reconcile key/);
  });

  it("matches expected scheduled items by title and time", () => {
    const report = reconcileSchedule(
      [
        {
          title: "First post",
          sourceFile: "posts/first.md",
          scheduledAt: "2026-07-01T09:00:00Z",
        },
      ],
      [
        {
          title: " first   post ",
          postId: "10",
          scheduledAt: "2026-07-01T09:03:00Z",
          status: "scheduled",
          source: "post",
        },
      ],
      { by: parseScheduleReconcileKeys("title,time"), toleranceMinutes: 5 },
    );

    assert.equal(report.status, "ok");
    assert.equal(report.expectedCount, 1);
    assert.equal(report.matchedCount, 1);
    assert.equal(report.matches[0]?.actual.postId, "10");
    assert.equal(report.matchedScheduled, 1);
    assert.equal(report.queueStateSummary.scheduled, 1);
  });

  it("reports missing rows and timestamp mismatches", () => {
    const queue: ScheduledQueueItem[] = [
      {
        title: "Time drift",
        scheduledAt: "2026-07-01T10:00:00Z",
        source: "broadcast",
      },
    ];

    const report = reconcileSchedule(
      [
        { title: "Time drift", scheduledAt: "2026-07-01T09:00:00Z" },
        { title: "Missing post", scheduledAt: "2026-07-02T09:00:00Z" },
      ],
      queue,
      { by: ["title", "time"], toleranceMinutes: 5 },
    );

    assert.equal(report.status, "mismatch");
    assert.equal(report.matchedCount, 0);
    assert.equal(report.timestampMismatches.length, 1);
    assert.equal(report.missing.length, 1);
    assert.equal(report.unexpected.length, 1);
  });

  it("reports duplicate title/time collisions", () => {
    const report = reconcileSchedule(
      [{ title: "Duplicate", scheduledAt: "2026-07-01T09:00:00Z" }],
      [
        { title: "Duplicate", scheduledAt: "2026-07-01T09:00:00Z", source: "post", postId: "1" },
        {
          title: "Duplicate",
          scheduledAt: "2026-07-01T09:00:00Z",
          source: "broadcast",
          postId: "1",
        },
      ],
      { by: ["title", "time"] },
    );

    assert.equal(report.status, "mismatch");
    assert.equal(report.duplicateCollisions.length, 2);
    assert.equal(report.duplicateCollisions[0]?.reason, "multiple-matches");
    assert.equal(report.unexpected.length, 2);
  });

  it("can reconcile by draft id and time", () => {
    const report = reconcileSchedule(
      [{ draftId: "123", scheduledAt: "2026-07-01T09:00:00Z" }],
      [{ draftId: "123", scheduledAt: "2026-07-01T09:00:00Z", source: "draft", status: "draft" }],
      { by: parseScheduleReconcileKeys("draft-id,time") },
    );

    assert.equal(report.status, "ok");
    assert.equal(report.matches[0]?.actual.draftId, "123");
    assert.equal(report.matchedDraft, 1);
  });

  it("does not match missing or different requested identity keys", () => {
    const titleReport = reconcileSchedule(
      [{ draftId: "123", scheduledAt: "2026-07-01T09:00:00Z" }],
      [{ scheduledAt: "2026-07-01T09:00:00Z", source: "post" }],
      { by: ["title", "time"] },
    );
    const draftReport = reconcileSchedule(
      [{ draftId: "123", scheduledAt: "2026-07-01T09:00:00Z" }],
      [{ draftId: "456", scheduledAt: "2026-07-01T09:00:00Z", source: "draft" }],
      { by: ["draft-id", "time"] },
    );

    assert.equal(titleReport.status, "mismatch");
    assert.equal(titleReport.missing.length, 1);
    assert.equal(draftReport.status, "mismatch");
    assert.equal(draftReport.missing.length, 1);
  });

  it("handles time-only matching and queue entries without usable keys", () => {
    const timeOnly = reconcileSchedule(
      [{ title: "Any title", scheduledAt: "2026-07-01T09:00:00Z" }],
      [
        { title: "Different title", scheduledAt: "not-a-date", source: "post" },
        { title: "Different title", source: "broadcast" },
        { title: "Different title", scheduledAt: "2026-07-01T09:00:00Z", source: "post" },
      ],
      { by: ["time"] },
    );
    const noKeys = reconcileSchedule(
      [{ title: "Any title", scheduledAt: "2026-07-01T09:00:00Z" }],
      [{ title: "Different title", scheduledAt: "2026-07-01T09:00:00Z", source: "post" }],
      { by: [] },
    );

    assert.equal(timeOnly.status, "mismatch");
    assert.equal(timeOnly.matches[0]?.actual.scheduledAt, "2026-07-01T09:00:00Z");
    assert.equal(timeOnly.unexpected.length, 2);
    assert.equal(noKeys.status, "ok");
    assert.equal(noKeys.unexpected.length, 0);
  });

  it("reports draft-id queue duplicate collisions without scheduled timestamps", () => {
    const report = reconcileSchedule(
      [{ draftId: "123", scheduledAt: "2026-07-01T09:00:00Z" }],
      [
        { postId: "123", source: "post" },
        { postId: "123", source: "broadcast" },
        { source: "draft" },
      ],
      { by: ["draft-id"] },
    );

    assert.equal(report.status, "mismatch");
    assert.equal(
      report.duplicateCollisions.some(
        (collision) =>
          collision.reason === "duplicate-queue-key" && collision.expected.scheduledAt === "",
      ),
      true,
    );
    assert.equal(report.unexpected.length, 3);
    assert.equal(report.queueStateSummary.other, 3);
  });

  it("supports postId and status mismatches", () => {
    const report = reconcileSchedule(
      [
        {
          postId: "10",
          status: "published",
          scheduledAt: "2026-07-01T09:00:00Z",
        },
      ],
      [
        {
          title: "Different title",
          postId: "10",
          scheduledAt: "2026-07-01T09:00:00Z",
          status: "scheduled",
          source: "post",
        },
      ],
      { by: ["draft-id", "time"] },
    );

    assert.equal(report.status, "mismatch");
    assert.equal(report.statusMismatches.length, 1);
    assert.equal(report.statusMismatches[0]?.expectedStatus, "published");
    assert.equal(report.statusMismatches[0]?.actualStatus, "scheduled");
    assert.equal(report.matches.length, 1);
    assert.equal(report.matchedScheduled, 1);
  });

  it("classifies queue status summary and unexpected entries", () => {
    const queue = [
      {
        title: "Scheduled",
        status: "scheduled",
        source: "post",
        scheduledAt: "2026-07-01T09:00:00Z",
      },
      {
        title: "Published",
        status: "published",
        source: "post",
        scheduledAt: "2026-07-01T09:00:00Z",
      },
      { title: "Draft", status: "draft", source: "draft", scheduledAt: "2026-07-02T09:00:00Z" },
      {
        title: "Broadcast",
        status: "sent",
        source: "broadcast",
        scheduledAt: "2026-07-03T09:00:00Z",
      },
    ];
    const report = reconcileSchedule(
      [{ title: "Scheduled", scheduledAt: "2026-07-01T09:00:00Z" }],
      queue,
      { by: ["title", "time"] },
    );

    assert.equal(report.matchedScheduled, 1);
    assert.equal(report.matchedPublished, 0);
    assert.equal(report.matchedDraft, 0);
    assert.equal(report.matchedOther, 0);
    assert.equal(report.unexpected.length, 3);
    assert.equal(report.queueStateSummary.scheduled, 1);
    assert.equal(report.queueStateSummary.published, 2);
    assert.equal(report.queueStateSummary.draft, 1);
    assert.equal(report.queueStateSummary.other, 0);
    assert.equal(report.status, "mismatch");
  });
});
