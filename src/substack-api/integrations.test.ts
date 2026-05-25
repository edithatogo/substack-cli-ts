import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { materialFromCookieHeader } from "./auth.js";
import type { FetchLike } from "./client.js";
import {
  crossPost,
  fetchApiTokens,
  fetchIntegrations,
  importFromRss,
  importFromWordPress,
} from "./integrations.js";

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
    if (!route) return Promise.resolve({ status: 404, text: () => Promise.resolve("{}") });
    return Promise.resolve({
      status: route.status,
      text: () =>
        Promise.resolve(typeof route.body === "string" ? route.body : JSON.stringify(route.body)),
    });
  };
}

describe("fetchIntegrations", () => {
  it("parses integration list responses", async () => {
    const result = await fetchIntegrations(
      "https://test.substack.com",
      material,
      fakeFetch(200, {
        integrations: [
          {
            id: 1,
            title: "Zapier",
            type: "zapier",
            connected: true,
            created_at: "2026-01-01T00:00:00Z",
            description: "Automation",
          },
        ],
      }),
    );

    assert.equal(result.status, "ok");
    assert.equal(result.integrations?.[0]?.id, "1");
    assert.equal(result.integrations?.[0]?.name, "Zapier");
    assert.equal(result.integrations?.[0]?.status, "connected");
  });

  it("returns not-found when endpoints are unavailable", async () => {
    const result = await fetchIntegrations(
      "https://test.substack.com",
      material,
      fakeFetch(404, {}),
    );

    assert.equal(result.status, "not-found");
  });
});

describe("integration write probes", () => {
  it("reports cross-post success", async () => {
    const result = await crossPost(
      "https://test.substack.com",
      123,
      "twitter",
      material,
      fakeFetch(200, {}),
    );

    assert.equal(result.status, "ok");
    assert.equal(result.platform, "twitter");
  });

  it("parses WordPress import IDs", async () => {
    const result = await importFromWordPress(
      "https://test.substack.com",
      "export.xml",
      material,
      fakeFetch(200, { import_id: "wp-1" }),
    );

    assert.equal(result.status, "ok");
    assert.equal(result.importId, "wp-1");
  });

  it("falls back across RSS import endpoints", async () => {
    const routes = new Map([
      [
        "https://test.substack.com/api/v1/publication/import/rss",
        { status: 200, body: { id: "rss-1" } },
      ],
    ]);

    const result = await importFromRss(
      "https://test.substack.com",
      "https://example.com/feed.xml",
      material,
      fakeFetchRoutes(routes),
    );

    assert.equal(result.status, "ok");
    assert.equal(result.importId, "rss-1");
  });
});

describe("fetchApiTokens", () => {
  it("redacts token values into previews", async () => {
    const result = await fetchApiTokens(
      "https://test.substack.com",
      material,
      fakeFetch(200, {
        tokens: [
          {
            id: "token-1",
            label: "Automation",
            token: "abcd1234secret5678",
            scopes: ["posts", 123, "stats"],
            createdAt: "2026-01-01T00:00:00Z",
            last_used_at: "2026-01-02T00:00:00Z",
          },
        ],
      }),
    );

    assert.equal(result.status, "ok");
    assert.equal(result.tokens?.[0]?.tokenPreview, "abcd...5678");
    assert.deepEqual(result.tokens?.[0]?.scopes, ["posts", "stats"]);
  });
});
