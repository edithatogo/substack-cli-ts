import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { materialFromCookieHeader } from "./auth.js";
import { getSubscriberCount } from "./subscriber.js";

function fakeFetch(
  status: number,
  body: string,
) {
  return () =>
    Promise.resolve({
      status,
      text: () => Promise.resolve(body),
    });
}

const material = materialFromCookieHeader(
  "substack.sid=fake-secret",
  "https://test.substack.com",
  "env",
);

describe("getSubscriberCount", () => {
  it("returns subscriber count from checklist", async () => {
    const fetchFn = fakeFetch(
      200,
      JSON.stringify({ subscriber_count: 42 }),
    ) as unknown as typeof fetch;

    const count = await getSubscriberCount(
      "https://test.substack.com",
      material,
      fetchFn,
    );

    assert.equal(count, 42);
  });

  it("returns 0 when subscriber_count field is missing", async () => {
    const fetchFn = fakeFetch(
      200,
      JSON.stringify({}),
    ) as unknown as typeof fetch;

    const count = await getSubscriberCount(
      "https://test.substack.com",
      material,
      fetchFn,
    );

    assert.equal(count, 0);
  });

  it("returns 0 when subscriber_count is null", async () => {
    const fetchFn = fakeFetch(
      200,
      JSON.stringify({ subscriber_count: null }),
    ) as unknown as typeof fetch;

    const count = await getSubscriberCount(
      "https://test.substack.com",
      material,
      fetchFn,
    );

    assert.equal(count, 0);
  });

  it("throws on network error", async () => {
    const fetchFn = (() =>
      Promise.reject(new Error("Network failure"))) as unknown as typeof fetch;

    await assert.rejects(
      () =>
        getSubscriberCount("https://test.substack.com", material, fetchFn),
      /Failed to fetch publication checklist/,
    );
  });
});
