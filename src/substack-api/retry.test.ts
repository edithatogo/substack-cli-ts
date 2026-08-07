import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it, vi } from "vitest";
import { withRetry } from "./retry.js";

describe("withRetry", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("returns successful results without retrying", async () => {
    const fn = vi.fn<() => Promise<string>>().mockResolvedValue("ok");

    await assert.doesNotReject(async () => {
      assert.equal(await withRetry(fn), "ok");
    });

    assert.equal(fn.mock.calls.length, 1);
  });

  it("retries failed attempts with capped exponential delay", async () => {
    const fn = vi
      .fn<() => Promise<string>>()
      .mockRejectedValueOnce(new Error("first"))
      .mockRejectedValueOnce("second")
      .mockResolvedValue("ok");

    const result = withRetry(fn, {
      maxRetries: 3,
      baseDelayMs: 10,
      maxDelayMs: 15,
      randomizer: () => 0,
    });

    await vi.advanceTimersByTimeAsync(10);
    await vi.advanceTimersByTimeAsync(20);

    assert.equal(await result, "ok");
    assert.equal(fn.mock.calls.length, 3);
    assert.equal(vi.mocked(console.warn).mock.calls.length, 2);
  });

  it("throws the final error after all retries fail", async () => {
    const finalError = new Error("final");
    const fn = vi
      .fn<() => Promise<never>>()
      .mockRejectedValueOnce(new Error("first"))
      .mockRejectedValueOnce(finalError);

    const result = withRetry(fn, {
      maxRetries: 1,
      baseDelayMs: 5,
      maxDelayMs: 5,
    });

    const rejection = assert.rejects(result, finalError);
    await vi.advanceTimersByTimeAsync(5);

    await rejection;
    assert.equal(fn.mock.calls.length, 2);
  });

  it("uses injected randomizer to keep retry timing deterministic", async () => {
    const fn = vi
      .fn<() => Promise<string>>()
      .mockRejectedValueOnce(new Error("first"))
      .mockResolvedValue("ok");
    const randomizer = vi.fn(() => 0.5);

    const result = withRetry(fn, {
      maxRetries: 1,
      baseDelayMs: 10,
      maxDelayMs: 20,
      randomizer,
    });

    await vi.advanceTimersByTimeAsync(10);
    assert.equal(fn.mock.calls.length, 1);
    assert.equal(randomizer.mock.calls.length, 1);

    await vi.advanceTimersByTimeAsync(10);
    assert.equal(fn.mock.calls.length, 2);

    await vi.advanceTimersByTimeAsync(0);
    assert.equal(await result, "ok");
    assert.equal(fn.mock.calls.length, 2);
  });
});
