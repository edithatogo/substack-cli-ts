import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { materialFromCookieHeader } from "./auth.js";
import { type FetchLike } from "./client.js";
import { fetchSubscriberList } from "./subscriber-list.js";

function fakeFetch(
  status: number,
  body: string,
): FetchLike {
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

describe("fetchSubscriberList", () => {
  it("returns entries from a valid response", async () => {
    const fetchFn = fakeFetch(
      200,
      JSON.stringify([
        { email: "alice@example.com", type: "paid", source: "substack" },
        { email: "bob@example.com", type: "free", source: "import" },
      ]),
    );

    const result = await fetchSubscriberList(
      "https://test.substack.com",
      material,
      fetchFn,
    );

    assert.equal(result.status, "ok");
    assert.equal(result.entries!.length, 2);
    assert.equal(result.entries![0]!.email, "alice@example.com");
    assert.equal(result.entries![0]!.type, "paid");
    assert.equal(result.entries![0]!.source, "substack");
    assert.equal(result.entries![1]!.email, "bob@example.com");
    assert.equal(result.entries![1]!.type, "free");
    assert.equal(result.entries![1]!.source, "import");
    assert.match(result.message, /Found 2 subscribers/);
  });

  it("returns empty entries for empty response", async () => {
    const fetchFn = fakeFetch(200, JSON.stringify([]));

    const result = await fetchSubscriberList(
      "https://test.substack.com",
      material,
      fetchFn,
    );

    assert.equal(result.status, "ok");
    assert.equal(result.entries!.length, 0);
  });

  it("returns schema-drift for non-array response body", async () => {
    const fetchFn = fakeFetch(200, JSON.stringify({ not: "array" }));

    const result = await fetchSubscriberList(
      "https://test.substack.com",
      material,
      fetchFn,
    );

    assert.equal(result.status, "schema-drift");
  });

  it("returns unauthenticated on 401", async () => {
    const fetchFn = fakeFetch(
      401,
      JSON.stringify({ error: "unauthorized" }),
    );

    const result = await fetchSubscriberList(
      "https://test.substack.com",
      material,
      fetchFn,
    );

    assert.equal(result.status, "unauthenticated");
  });

  it("returns forbidden on 403", async () => {
    const fetchFn = fakeFetch(403, JSON.stringify({}));

    const result = await fetchSubscriberList(
      "https://test.substack.com",
      material,
      fetchFn,
    );

    assert.equal(result.status, "forbidden");
  });

  it("returns not-found on 404", async () => {
    const fetchFn = fakeFetch(404, JSON.stringify({}));

    const result = await fetchSubscriberList(
      "https://test.substack.com",
      material,
      fetchFn,
    );

    assert.equal(result.status, "not-found");
  });

  it("returns network-error when fetch throws", async () => {
    const fetchFn: FetchLike = () =>
      Promise.reject(new Error("Network failure"));

    const result = await fetchSubscriberList(
      "https://test.substack.com",
      material,
      fetchFn,
    );

    assert.equal(result.status, "network-error");
  });

  it("passes limit and offset as query parameters", async () => {
    const fetchFn = fakeFetch(200, JSON.stringify([]));

    await fetchSubscriberList(
      "https://test.substack.com",
      material,
      fetchFn,
      { limit: 50, offset: 100 },
    );

    assert.ok(true);
  });
});
