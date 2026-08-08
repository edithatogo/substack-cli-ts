import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { simulateRetrySchedule } from "../harness/deterministic-simulator.js";

describe("deterministic simulation testing", () => {
  it("replays the same virtual timeline for the same seed", () => {
    const first = simulateRetrySchedule(20260808, [503, 429, 200], 4);
    const second = simulateRetrySchedule(20260808, [503, 429, 200], 4);
    assert.deepEqual(first, second);
    assert.equal(first.status, "succeeded");
    assert.deepEqual(
      first.events.map((event) => event.attempt),
      [1, 2, 3],
    );
  });

  it("never exceeds the attempt budget", () => {
    const result = simulateRetrySchedule(1, [503, 503, 503, 200], 3);
    assert.equal(result.status, "exhausted");
    assert.equal(result.events.length, 3);
  });
});
