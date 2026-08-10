import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it, vi } from "vitest";
import {
  applyRateLimitReceipt,
  createRateLimitController,
  defaultRateLimitRuntimeState,
  parseRateLimitReceipt,
  parseRetryAfterHeader,
  RateLimiter,
  RateLimitGovernor,
  RateLimitStatePersistenceError,
} from "./rate-limit.js";

describe("RateLimiter", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-12T00:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("allows requests while tokens are available", async () => {
    const limiter = new RateLimiter(2, 1);

    await limiter.acquire();
    await limiter.acquire();

    assert.ok(true);
  });

  it("waits until a token is refilled", async () => {
    const limiter = new RateLimiter(1, 1);
    await limiter.acquire();

    let acquired = false;
    const pending = limiter.acquire().then(() => {
      acquired = true;
    });

    await vi.advanceTimersByTimeAsync(999);
    assert.equal(acquired, false);

    await vi.advanceTimersByTimeAsync(1);
    await pending;

    assert.equal(acquired, true);
  });
});

describe("rate-limit state persistence", () => {
  it("retries only persistence and succeeds after transient failures", async () => {
    const save = vi
      .fn<(state: ReturnType<typeof defaultRateLimitRuntimeState>, path: string) => Promise<void>>()
      .mockRejectedValueOnce(new Error("locked"))
      .mockRejectedValueOnce(new Error("locked"))
      .mockResolvedValueOnce();
    const sleep = vi.fn(async () => undefined);
    const controller = await createRateLimitController("rate-limit-test.json", {
      maxRetries: 2,
      baseDelayMs: 5,
      save,
      sleep,
    });

    await controller.persist({ channel: "read", observedStatus: 200 });

    assert.equal(save.mock.calls.length, 3);
    assert.deepEqual(
      sleep.mock.calls.map(([ms]) => ms),
      [5, 10],
    );
  });

  it("throws a typed terminal error retaining observed status", async () => {
    const failure = new Error("disk unavailable");
    const controller = await createRateLimitController("rate-limit-test.json", {
      maxRetries: 1,
      save: async () => Promise.reject(failure),
      sleep: async () => undefined,
    });

    await assert.rejects(
      () => controller.persist({ channel: "write", observedStatus: 429 }),
      (error: unknown) => {
        assert.ok(error instanceof RateLimitStatePersistenceError);
        assert.equal(error.channel, "write");
        assert.equal(error.observedStatus, 429);
        assert.equal(error.attempts, 2);
        assert.equal(error.cause, failure);
        return true;
      },
    );
  });
});

describe("RateLimitGovernor", () => {
  it("serializes read requests with the configured minimum interval", async () => {
    vi.useFakeTimers();
    try {
      const state = defaultRateLimitRuntimeState();
      state.read.minIntervalMs = 5;
      const governor = new RateLimitGovernor(state, "read");
      const beforeNextAllowedAt = state.read.runtime.nextAllowedAtMs;

      const first = governor.acquire();
      let secondStarted = false;
      const second = governor.acquire().then(() => {
        secondStarted = true;
      });

      await first;
      await vi.advanceTimersByTimeAsync(1);
      assert.equal(secondStarted, false);

      await vi.advanceTimersByTimeAsync(5);
      await second;

      assert.equal(secondStarted, true);
      assert.equal(state.read.runtime.nextAllowedAtMs > beforeNextAllowedAt, true);
    } finally {
      vi.useRealTimers();
    }
  });
});

describe("rate-limit receipt helpers", () => {
  it("parses receipts only when channel updates are present", () => {
    const invalid = parseRateLimitReceipt(
      JSON.stringify({
        schemaVersion: 1,
        source: "operator",
        confidence: "high",
      }),
    );
    const valid = parseRateLimitReceipt(
      JSON.stringify({
        schemaVersion: 1,
        source: "operator",
        confidence: "high",
        read: { minIntervalMs: 2000, baseDelayMs: 400, maxDelayMs: 5000, maxRetries: 4 },
      }),
    );
    assert.equal(invalid, undefined);
    assert.ok(valid);
    assert.equal(valid?.source, "operator");
  });

  it("applies parsed rate-limit receipts to state and updates confidence", () => {
    const state = defaultRateLimitRuntimeState();
    const receipt = {
      schemaVersion: 1,
      source: "operator" as const,
      confidence: "high" as const,
      observedAt: "2026-05-12T00:01:00.000Z",
      read: { minIntervalMs: 7000, baseDelayMs: 1000 },
      write: { maxDelayMs: 12000, maxRetries: 3 },
    };

    const updated = applyRateLimitReceipt(state, receipt);
    assert.ok(updated);
    assert.equal(updated?.source, "operator");
    assert.equal(updated?.confidence, "high");
    assert.equal(updated?.read.minIntervalMs, 7000);
    assert.equal(updated?.write.maxDelayMs, 12000);
    assert.equal(updated?.write.maxRetries, 3);
    assert.equal(updated?.read.baseDelayMs, 1000);
  });
});

describe("Retry-After parsing", () => {
  it("parses numeric retry-after seconds", () => {
    assert.equal(parseRetryAfterHeader("7", 0), 7000);
  });

  it("parses HTTP-date retry-after", () => {
    assert.equal(
      parseRetryAfterHeader(
        "Tue, 12 May 2026 00:00:10 GMT",
        new Date("2026-05-12T00:00:00Z").getTime(),
      ),
      10000,
    );
  });
});
