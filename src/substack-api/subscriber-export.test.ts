import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { materialFromCookieHeader } from "./auth.js";
import type { FetchLike } from "./client.js";
import { fetchSubscriberExport } from "./subscriber-export.js";

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

describe("fetchSubscriberExport", () => {
  it("returns CSV data from the export endpoint", async () => {
    const csvContent = "email,type,source\nalice@example.com,paid,substack\n";
    const fetchFn = fakeFetch(200, csvContent);

    const result = await fetchSubscriberExport("https://test.substack.com", material, fetchFn);

    assert.equal(result.status, "ok");
    assert.equal(result.csvData, csvContent);
    assert.equal(result.format, "csv");
  });

  it("returns not-found when all known endpoints are missing", async () => {
    const result = await fetchSubscriberExport(
      "https://test.substack.com",
      material,
      fakeFetch(404, {}),
    );

    assert.equal(result.status, "not-found");
    assert.match(result.message, /No subscriber CSV export endpoint/);
  });

  it("classifies non-404 failures", async () => {
    const result = await fetchSubscriberExport(
      "https://test.substack.com",
      material,
      fakeFetch(403, {}),
    );

    assert.equal(result.status, "forbidden");
  });

  it("returns network-error when fetch throws", async () => {
    const fetchFn: FetchLike = () => Promise.reject(new Error("Network failure"));

    const result = await fetchSubscriberExport("https://test.substack.com", material, fetchFn);

    assert.equal(result.status, "network-error");
  });
});
