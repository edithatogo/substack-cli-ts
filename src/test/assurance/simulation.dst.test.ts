import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { simulatePublishGate, simulateRetrySchedule } from "../harness/deterministic-simulator.js";

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

  it("blocks unconfirmed publish and schedule for the same seed", () => {
    const publish = simulatePublishGate({
      seed: 20260811,
      mode: "publish",
      confirmed: false,
      dryRun: false,
    });
    const again = simulatePublishGate({
      seed: 20260811,
      mode: "publish",
      confirmed: false,
      dryRun: false,
    });
    assert.deepEqual(publish, again);
    assert.equal(publish.status, "blocked");
    assert.equal(
      simulatePublishGate({ seed: 1, mode: "schedule", confirmed: false, dryRun: false }).status,
      "blocked",
    );
    assert.equal(
      simulatePublishGate({ seed: 1, mode: "publish", confirmed: false, dryRun: true }).status,
      "dry-run",
    );
    assert.equal(
      simulatePublishGate({ seed: 1, mode: "draft", confirmed: false, dryRun: false }).status,
      "allowed",
    );
  });
});
