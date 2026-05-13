import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it, vi } from "vitest";
import { RateLimiter } from "./rate-limit.js";

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
