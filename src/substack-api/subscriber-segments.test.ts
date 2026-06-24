import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { materialFromCookieHeader } from "./auth.js";
import type { FetchLike } from "./client.js";
import { fetchSubscriberSegments } from "./subscriber-segments.js";

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

describe("fetchSubscriberSegments", () => {
  it("returns segments from a valid response", async () => {
    const fetchFn = fakeFetch(200, {
      segments: [
        {
          id: "1",
          name: "Active Readers",
          subscriber_count: 100,
          created_at: "2026-01-01T00:00:00Z",
          is_dynamic: true,
        },
        { id: "2", name: "VIP", count: 50, is_dynamic: false },
      ],
    });

    const result = await fetchSubscriberSegments("https://test.substack.com", material, fetchFn);

    assert.equal(result.status, "ok");
    assert.equal(result.segments!.length, 2);
    assert.equal(result.segments![0]!.name, "Active Readers");
    assert.equal(result.segments![0]!.subscriberCount, 100);
    assert.equal(result.segments![0]!.isDynamic, true);
    assert.equal(result.segments![1]!.name, "VIP");
    assert.equal(result.segments![1]!.subscriberCount, 50);
    assert.equal(result.segments![1]!.isDynamic, false);
  });

  it("returns not-found when all known endpoints are missing", async () => {
    const result = await fetchSubscriberSegments(
      "https://test.substack.com",
      material,
      fakeFetch(404, {}),
    );

    assert.equal(result.status, "not-found");
    assert.match(result.message, /No subscriber segments endpoint/);
  });

  it("classifies non-404 failures", async () => {
    const result = await fetchSubscriberSegments(
      "https://test.substack.com",
      material,
      fakeFetch(403, {}),
    );

    assert.equal(result.status, "forbidden");
  });

  it("returns ok with empty segments array", async () => {
    const fetchFn = fakeFetch(200, { segments: [] });

    const result = await fetchSubscriberSegments("https://test.substack.com", material, fetchFn);

    assert.equal(result.status, "ok");
    assert.deepEqual(result.segments, []);
  });

  it("returns ok with null segments body", async () => {
    const fetchFn = fakeFetch(200, { segments: [{ id: "1", name: "Test" }] });

    const result = await fetchSubscriberSegments("https://test.substack.com", material, fetchFn);

    assert.equal(result.status, "ok");
    assert.equal(result.segments!.length, 1);
  });
});
