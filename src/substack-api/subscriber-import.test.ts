import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { materialFromCookieHeader } from "./auth.js";
import type { FetchLike } from "./client.js";
import { importSubscribers } from "./subscriber-import.js";

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

describe("importSubscribers", () => {
  it("returns ok when import succeeds", async () => {
    const routes = new Map([
      [
        "https://test.substack.com/api/v1/publication/subscribers/import",
        { status: 200, body: { imported: 10, total: 15 } },
      ],
    ]);

    const csvData = "email,type\ntest@example.com,free\n";
    const result = await importSubscribers(
      "https://test.substack.com",
      csvData,
      material,
      fakeFetchRoutes(routes),
    );

    assert.equal(result.status, "ok");
    assert.equal(result.imported, 10);
    assert.equal(result.total, 15);
  });

  it("returns failed when all known endpoints are missing", async () => {
    const result = await importSubscribers(
      "https://test.substack.com",
      "email,type",
      material,
      fakeFetch(404, {}),
    );

    assert.equal(result.status, "failed");
    assert.match(result.message, /No subscriber CSV import endpoint/);
  });

  it("returns failed on auth error", async () => {
    const result = await importSubscribers(
      "https://test.substack.com",
      "email,type",
      material,
      fakeFetch(401, {}),
    );

    assert.equal(result.status, "failed");
  });
});
