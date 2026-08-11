import assert from "node:assert/strict";
import { describe, it } from "vitest";
import {
  evaluatePublicationSchedulePolicy,
  parsePublicationCatalogue,
  parseScheduleLimits,
  resolveScheduledInstant,
} from "./schedule-calendar.js";

describe("publication schedule calendar policy", () => {
  const limits = parseScheduleLimits({
    timezone: "UTC",
    maxHorizonDays: 30,
    maxQueuedPosts: 3,
    minSpacingMinutes: 120,
  });
  const now = new Date("2026-08-11T00:00:00Z");

  it("accepts a well-spaced candidate inside the horizon", () => {
    const decision = evaluatePublicationSchedulePolicy({
      candidate: { title: "New", scheduledAt: "2026-08-20T09:00:00Z", series: "main" },
      calendar: [{ title: "Existing", scheduledAt: "2026-08-18T09:00:00Z", series: "notes" }],
      limits,
      now,
    });

    assert.equal(decision.allowed, true);
    assert.equal(decision.queuedCount, 2);
    assert.deepEqual(decision.violations, []);
  });

  it("blocks exact cross-series collisions", () => {
    const decision = evaluatePublicationSchedulePolicy({
      candidate: { title: "New", scheduledAt: "2026-08-20T09:00:00Z", series: "main" },
      calendar: [{ title: "Existing", scheduledAt: "2026-08-20T09:00:00Z", series: "notes" }],
      limits,
      now,
    });

    assert.equal(decision.allowed, false);
    assert.ok(decision.violations.some((violation) => violation.code === "collision"));
  });

  it("blocks horizon, queue-cap, and spacing violations", () => {
    const decision = evaluatePublicationSchedulePolicy({
      candidate: { title: "Far", scheduledAt: "2026-12-01T09:00:00Z", series: "main" },
      calendar: [
        { title: "A", scheduledAt: "2026-08-12T09:00:00Z" },
        { title: "B", scheduledAt: "2026-08-13T09:00:00Z" },
        { title: "C", scheduledAt: "2026-08-14T09:00:00Z" },
        { title: "Near", scheduledAt: "2026-12-01T10:00:00Z" },
      ],
      limits,
      now,
    });

    assert.equal(decision.allowed, false);
    const codes = decision.violations.map((violation) => violation.code);
    assert.ok(codes.includes("horizon"));
    assert.ok(codes.includes("queue-cap"));
    assert.ok(codes.includes("spacing"));
  });

  it("ignores the candidate's own catalogue row", () => {
    const decision = evaluatePublicationSchedulePolicy({
      candidate: {
        draftId: "123",
        sourceFile: "post.md",
        scheduledAt: "2026-08-20T09:00:00Z",
      },
      calendar: [
        {
          draftId: "123",
          sourceFile: "post.md",
          scheduledAt: "2026-08-20T09:00:00Z",
        },
      ],
      limits,
      now,
    });

    assert.equal(decision.allowed, true);
  });

  it("parses object and array catalogues", () => {
    const fromObject = parsePublicationCatalogue({
      drafts: [{ id: "1", scheduledAt: "2026-08-20T09:00:00Z", title: "Draft" }],
      posts: [{ id: "2", postDate: "2026-08-21T09:00:00Z", title: "Post" }],
      notes: [{ id: "3", scheduled_at: "2026-08-22T09:00:00Z", title: "Note" }],
    });
    const fromArray = parsePublicationCatalogue([
      { title: "Loose", scheduledAt: "2026-08-23T09:00:00Z" },
    ]);

    assert.equal(fromObject.length, 3);
    assert.equal(fromArray.length, 1);
    assert.deepEqual(
      fromObject.map((item) => item.source),
      ["post", "draft", "note"],
    );
  });

  it("rejects DST gaps and folds without an explicit offset", () => {
    const skipped = resolveScheduledInstant("2026-03-08T02:30:00", "America/New_York");
    const fold = resolveScheduledInstant("2026-11-01T01:30:00", "America/New_York");
    const ok = resolveScheduledInstant("2026-07-01T10:00:00", "America/New_York");

    assert.equal(skipped.status, "dst-skipped");
    assert.equal(fold.status, "dst-ambiguous");
    assert.equal(ok.status, "ok");
  });

  it("accepts explicit offsets through DST folds", () => {
    const resolved = resolveScheduledInstant("2026-11-01T01:30:00-05:00", "America/New_York");
    assert.equal(resolved.status, "ok");
  });
});
