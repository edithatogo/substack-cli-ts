import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { materialFromCookieHeader } from "./auth.js";
import { apiHeaders, classifyFailure, requestJson } from "./client.js";

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
    assert.equal(
      classifyFailure(401, "/api/v1/test").status,
      "unauthenticated",
    );
    assert.equal(classifyFailure(403, "/api/v1/test").status, "forbidden");
    assert.equal(classifyFailure(404, "/api/v1/test").status, "not-found");
    assert.equal(classifyFailure(0, "/api/v1/test").status, "network-error");
    assert.equal(classifyFailure(418, "/api/v1/test").status, "schema-drift");
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
