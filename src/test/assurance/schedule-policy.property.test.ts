import assert from "node:assert/strict";
import fc from "fast-check";
import { describe, it } from "vitest";
import {
  evaluatePublicationSchedulePolicy,
  parseScheduleLimits,
  type ScheduleCalendarItem,
} from "../../policy/schedule-calendar.js";

describe("schedule policy properties", () => {
  const now = new Date("2026-08-11T00:00:00Z");
  const limits = parseScheduleLimits({
    timezone: "UTC",
    maxHorizonDays: 60,
    maxQueuedPosts: 8,
    minSpacingMinutes: 180,
  });

  it("accepts uniquely spaced calendars inside horizon and queue cap", () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 6 }), (count) => {
        const calendar: ScheduleCalendarItem[] = Array.from({ length: count }, (_, index) => ({
          title: `Existing ${index}`,
          series: index % 2 === 0 ? "posts" : "notes",
          scheduledAt: new Date(now.getTime() + (index + 1) * 4 * 60 * 60 * 1000).toISOString(),
        }));
        const candidate: ScheduleCalendarItem = {
          title: "Candidate",
          series: "main",
          scheduledAt: new Date(now.getTime() + (count + 1) * 4 * 60 * 60 * 1000).toISOString(),
        };
        const decision = evaluatePublicationSchedulePolicy({
          candidate,
          calendar,
          limits,
          now,
        });
        assert.equal(decision.allowed, true);
        assert.equal(decision.queuedCount, count + 1);
      }),
      { seed: 16_704, numRuns: 40 },
    );
  });

  it("rejects duplicate instants across series", () => {
    fc.assert(
      fc.property(fc.integer({ min: 2, max: 48 }), (hoursAhead) => {
        const scheduledAt = new Date(now.getTime() + hoursAhead * 60 * 60 * 1000).toISOString();
        const decision = evaluatePublicationSchedulePolicy({
          candidate: { title: "New", series: "posts", scheduledAt },
          calendar: [{ title: "Existing", series: "notes", scheduledAt }],
          limits,
          now,
        });
        assert.equal(decision.allowed, false);
        assert.ok(decision.violations.some((violation) => violation.code === "collision"));
      }),
      { seed: 16_704, numRuns: 40 },
    );
  });

  it("rejects candidates beyond the configured horizon", () => {
    fc.assert(
      fc.property(fc.integer({ min: 61, max: 400 }), (daysAhead) => {
        const decision = evaluatePublicationSchedulePolicy({
          candidate: {
            title: "Far",
            scheduledAt: new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000).toISOString(),
          },
          calendar: [],
          limits,
          now,
        });
        assert.equal(decision.allowed, false);
        assert.ok(decision.violations.some((violation) => violation.code === "horizon"));
      }),
      { seed: 16_704, numRuns: 40 },
    );
  });
});
