import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { materialFromCookieHeader } from "./auth.js";
import type { FetchLike } from "./client.js";
import { fetchSuppressionList, suppressEmail } from "./subscriber-suppression.js";

const material = materialFromCookieHeader(
  "substack.sid=fake-secret",
  "https://test.substack.com",
  "env",
);

function fakeFetch(status: number, body: unknown): FetchLike {
  return () =>
    Promise.resolve({
      status,
      text: () => Promise.resolve(typeof body === "string" ? body : JSON.stringify(body)),
    });
}

function fakeFetchRoutes(routes: Map<string, { status: number; body: unknown }>): FetchLike {
  return (input: string) => {
    const route = routes.get(input);
    if (!route) {
      return Promise.resolve({ status: 404, text: () => Promise.resolve("{}") });
    }
    return Promise.resolve({
      status: route.status,
      text: () =>
        Promise.resolve(typeof route.body === "string" ? route.body : JSON.stringify(route.body)),
    });
  };
}

describe("fetchSuppressionList", () => {
  it("returns suppression entries from a valid response", async () => {
    const fetchFn = fakeFetch(200, {
      suppressions: [
        {
          email: "bounce@example.com",
          reason: "hard_bounce",
          suppressed_at: "2026-01-01T00:00:00Z",
        },
        { email: "spam@example.com", type: "spam_complaint" },
      ],
    });

    const result = await fetchSuppressionList("https://test.substack.com", material, fetchFn);

    assert.equal(result.status, "ok");
    assert.equal(result.entries!.length, 2);
    assert.equal(result.entries![0]!.email, "bounce@example.com");
    assert.equal(result.entries![0]!.reason, "hard_bounce");
    assert.equal(result.entries![0]!.suppressedAt, "2026-01-01T00:00:00Z");
    assert.equal(result.entries![1]!.email, "spam@example.com");
    assert.equal(result.entries![1]!.reason, "spam_complaint");
  });

  it("returns not-found when all known endpoints are missing", async () => {
    const result = await fetchSuppressionList(
      "https://test.substack.com",
      material,
      fakeFetch(404, {}),
    );

    assert.equal(result.status, "not-found");
    assert.match(result.message, /No suppression list endpoint/);
  });

  it("classifies non-404 failures", async () => {
    const result = await fetchSuppressionList(
      "https://test.substack.com",
      material,
      fakeFetch(403, {}),
    );

    assert.equal(result.status, "forbidden");
  });
});

describe("suppressEmail", () => {
  it("returns ok when suppression succeeds", async () => {
    const routes = new Map([
      ["https://test.substack.com/api/v1/publication/suppressions", { status: 200, body: {} }],
    ]);

    const result = await suppressEmail(
      "https://test.substack.com",
      "spam@example.com",
      material,
      fakeFetchRoutes(routes),
    );

    assert.equal(result.status, "ok");
    assert.equal(result.email, "spam@example.com");
  });

  it("returns failed when all known endpoints are missing", async () => {
    const result = await suppressEmail(
      "https://test.substack.com",
      "test@example.com",
      material,
      fakeFetch(404, {}),
    );

    assert.equal(result.status, "failed");
    assert.match(result.message, /No suppression add endpoint/);
  });

  it("returns failed on auth error", async () => {
    const result = await suppressEmail(
      "https://test.substack.com",
      "test@example.com",
      material,
      fakeFetch(401, {}),
    );

    assert.equal(result.status, "failed");
  });
});
