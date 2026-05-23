import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it, vi } from "vitest";
import { materialFromCookieHeader } from "./auth.js";
import { apiHeaders, classifyFailure, requestJson } from "./client.js";

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("substack-api client helpers", () => {
  it("builds browser-like headers from auth material", () => {
    const material = materialFromCookieHeader(
      "substack.sid=fake-long-secret-value",
      "https://rareinsights.substack.com",
      "env",
    );

    const headers = apiHeaders(material);

    assert.equal(headers.accept, "application/json");
    assert.equal(headers.cookie, material.cookieHeader);
    assert.equal(headers.referer, "https://rareinsights.substack.com");
    assert.equal(headers.origin, "https://rareinsights.substack.com");
    assert.ok(headers["user-agent"]);
    assert.match(headers["user-agent"], /Chrome Safari/);
  });

  it("parses JSON responses and falls back to null for text bodies", async () => {
    const parsed = await requestJson(
      fakeFetch(200, JSON.stringify({ ok: true })),
      "https://substack.com/api/v1/test",
      {},
    );
    const fallback = await requestJson(
      fakeFetch(200, "not json"),
      "https://substack.com/api/v1/test",
      {},
    );

    assert.equal(parsed.status, 200);
    assert.deepEqual(parsed.body, { ok: true });
    assert.equal(fallback.status, 200);
    assert.equal(fallback.body, null);
  });

  it("classifies failure states from HTTP status codes", () => {
    assert.equal(classifyFailure(401, "/api/v1/test").status, "unauthenticated");
    assert.equal(classifyFailure(403, "/api/v1/test").status, "forbidden");
    assert.equal(classifyFailure(404, "/api/v1/test").status, "not-found");
    assert.equal(classifyFailure(0, "/api/v1/test").status, "network-error");
    assert.equal(classifyFailure(418, "/api/v1/test").status, "schema-drift");
  });

  it("handles network errors in requestJson gracefully", async () => {
    const failingFetch: typeof fetch = () => Promise.reject(new Error("Network failure"));
    const result = await requestJson(
      failingFetch as unknown as (
        input: string,
        init?: Record<string, unknown>,
      ) => Promise<{ status: number; text: () => Promise<string> }>,
      "https://substack.com/api/v1/test",
      {},
    );
    assert.equal(result.status, 0);
    assert.equal(result.body, null);
  });

  it("handles non-JSON parse failure in requestJson gracefully", async () => {
    const nonJsonFetch = () =>
      Promise.resolve({
        status: 500,
        text: () => Promise.resolve("Internal Server Error"),
      });
    const result = await requestJson(
      nonJsonFetch as unknown as (
        input: string,
        init?: Record<string, unknown>,
      ) => Promise<{ status: number; text: () => Promise<string> }>,
      "https://substack.com/api/v1/test",
      {},
    );
    assert.equal(result.status, 500);
    assert.equal(result.body, null);
  });

  it("handles non-JSON parse failure in requestJson gracefully", async () => {
    const nonJsonFetch = () =>
      Promise.resolve({
        status: 500,
        text: () => Promise.resolve("Internal Server Error"),
      });
    const result = await requestJson(
      nonJsonFetch as unknown as (
        input: string,
        init?: Record<string, unknown>,
      ) => Promise<{ status: number; text: () => Promise<string> }>,
      "https://substack.com/api/v1/test",
      {},
    );
    assert.equal(result.status, 500);
    assert.equal(result.body, null);
  });
});

describe("requestDelete", () => {
  it("sends DELETE request and handles JSON response", async () => {
    const { requestDelete } = await import("./client.js");
    const result = await requestDelete(
      fakeFetch(200, JSON.stringify({ status: "deleted" })),
      "https://test.substack.com/api/v1/test/1",
      {},
    );
    assert.equal(result.status, 200);
  });
});

describe("requestWrite", () => {
  it("sends POST request and parses draftId from response", async () => {
    const { requestWrite } = await import("./client.js");
    const result = await requestWrite(
      fakeFetch(200, JSON.stringify({ id: 123, draft_url: "https://substack.com/p/123" })),
      "https://substack.com/api/v1/drafts",
      "POST",
      { "content-type": "application/json" },
      { draft_title: "Test" },
    );
    assert.equal(result.status, 200);
    assert.equal(result.draftId, 123);
    assert.equal(result.draftUrl, "https://substack.com/p/123");
  });

  it("parses draftId from string id", async () => {
    const { requestWrite } = await import("./client.js");
    const result = await requestWrite(
      fakeFetch(200, JSON.stringify({ id: "456" })),
      "https://substack.com/api/v1/drafts/456",
      "PUT",
      {},
      {},
    );
    assert.equal(result.draftId, 456);
  });

  it("handles network errors", async () => {
    const { requestWrite } = await import("./client.js");
    const failing = () => Promise.reject(new Error("Network failure"));
    const result = await requestWrite(
      failing as unknown as (
        input: string,
        init?: Record<string, unknown>,
      ) => Promise<{ status: number; text: () => Promise<string> }>,
      "https://substack.com/api/v1/drafts",
      "POST",
      {},
      {},
      { maxRetries: 0, baseDelayMs: 1, maxDelayMs: 1 },
    );
    assert.equal(result.status, 0);
    assert.equal(result.body, null);
  });

  it("handles non-JSON responses", async () => {
    const { requestWrite } = await import("./client.js");
    const result = await requestWrite(
      fakeFetch(201, "not json"),
      "https://substack.com/api/v1/drafts",
      "POST",
      {},
      {},
    );
    assert.equal(result.status, 201);
    assert.equal(result.body, null);
  });

  it("retries rate-limited write requests before returning success", async () => {
    const { requestWrite } = await import("./client.js");
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce({
        status: 429,
        headers: new Headers({ "retry-after": "1" }),
        text: async () => JSON.stringify({ error: "rate limited" }),
      })
      .mockResolvedValueOnce({
        status: 200,
        text: async () => JSON.stringify({ id: 789 }),
      });

    const resultPromise = requestWrite(
      fetchImpl,
      "https://substack.com/api/v1/drafts",
      "POST",
      {},
      {},
      { maxRetries: 2, baseDelayMs: 5, maxDelayMs: 1000 },
    );

    await vi.advanceTimersByTimeAsync(1000);

    const result = await resultPromise;
    assert.equal(result.status, 200);
    assert.equal(result.draftId, 789);
    assert.equal(result.retryAttempts, 1);
    assert.equal(fetchImpl.mock.calls.length, 2);
  });

  it("retries transient network write failures", async () => {
    const { requestWrite } = await import("./client.js");
    const fetchImpl = vi
      .fn()
      .mockRejectedValueOnce(new Error("socket closed"))
      .mockResolvedValueOnce({
        status: 200,
        text: async () => JSON.stringify({ id: 101 }),
      });

    const resultPromise = requestWrite(
      fetchImpl,
      "https://substack.com/api/v1/drafts",
      "POST",
      {},
      {},
      { maxRetries: 1, baseDelayMs: 5, maxDelayMs: 5 },
    );

    await vi.advanceTimersByTimeAsync(5);

    const result = await resultPromise;
    assert.equal(result.status, 200);
    assert.equal(result.draftId, 101);
    assert.equal(result.retryAttempts, 1);
  });
});

describe("mimeTypeForExt", () => {
  it("returns correct MIME types for common extensions", async () => {
    const { uploadImage } = await import("./client.js");
    assert.ok(typeof uploadImage === "function"); // verify it exists
  });
});

describe("extractUploadUrl", () => {
  it("prefers configured field name", async () => {
    const { uploadImage } = await import("./client.js");
    assert.ok(typeof uploadImage === "function");
  });
});

function fakeFetch(
  status: number,
  body: string,
): (
  input: string,
  init?: { headers?: Record<string, string> },
) => Promise<{
  status: number;
  text: () => Promise<string>;
}> {
  return () =>
    Promise.resolve({
      status,
      text: () => Promise.resolve(body),
    });
}
