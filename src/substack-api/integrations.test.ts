import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { materialFromCookieHeader } from "./auth.js";
import { type FetchLike } from "./client.js";
import {
  fetchIntegrations,
  crossPost,
  importFromWordPress,
  importFromRss,
  fetchApiTokens,
} from "./integrations.js";

function fakeFetch(status: number, body: string): FetchLike {
  return () =>
    Promise.resolve({
      status,
      text: () => Promise.resolve(body),
    });
}

function fakeFetchRoutes(routes: Map<string, unknown>): FetchLike {
  return (input: string) => {
    const body = routes.get(input);
    if (body === undefined) {
      return Promise.resolve({ status: 404, text: () => Promise.resolve("{}") });
    }
    return Promise.resolve({
      status: 200,
      text: () => Promise.resolve(JSON.stringify(body)),
    });
  };
}

const material = materialFromCookieHeader(
  "substack.sid=fake-secret",
  "https://test.substack.com",
  "env",
);

describe("fetchIntegrations", () => {
  it("returns integrations from array response", async () => {
    const fetchFn = fakeFetch(
      200,
      JSON.stringify([
        {
          id: "int-1",
          name: "Zapier",
          type: "automation",
          status: "connected",
          configured_at: "2026-01-01T00:00:00Z",
          description: "Automate workflows",
        },
      ]),
    );

    const result = await fetchIntegrations(
      "https://test.substack.com",
      material,
      fetchFn,
    );

    assert.equal(result.status, "ok");
    assert.equal(result.integrations?.length, 1);
    assert.equal(result.integrations?.[0]?.id, "int-1");
    assert.equal(result.integrations?.[0]?.name, "Zapier");
    assert.equal(result.integrations?.[0]?.type, "automation");
    assert.equal(result.integrations?.[0]?.status, "connected");
  });

  it("parses integrations from nested field", async () => {
    const fetchFn = fakeFetch(
      200,
      JSON.stringify({
        integrations: [
          { id: "int-2", name: "Discord", type: "chat", connected: true },
        ],
      }),
    );

    const result = await fetchIntegrations(
      "https://test.substack.com",
      material,
      fetchFn,
    );

    assert.equal(result.status, "ok");
    assert.equal(result.integrations?.length, 1);
    assert.equal(result.integrations?.[0]?.status, "connected");
  });

  it("handles connected boolean as status", async () => {
    const fetchFn = fakeFetch(
      200,
      JSON.stringify([
        { id: "int-3", name: "Slack", type: "chat", connected: false },
      ]),
    );

    const result = await fetchIntegrations(
      "https://test.substack.com",
      material,
      fetchFn,
    );

    assert.equal(result.status, "ok");
    assert.equal(result.integrations?.[0]?.status, "disconnected");
  });

  it("returns not-found when all endpoints return 404", async () => {
    const fetchFn = fakeFetch(404, "{}");

    const result = await fetchIntegrations(
      "https://test.substack.com",
      material,
      fetchFn,
    );

    assert.equal(result.status, "not-found");
  });

  it("returns unauthenticated on 401", async () => {
    const fetchFn = fakeFetch(401, "{}");

    const result = await fetchIntegrations(
      "https://test.substack.com",
      material,
      fetchFn,
    );

    assert.equal(result.status, "unauthenticated");
  });
});

describe("crossPost", () => {
  it("returns ok on successful cross-post", async () => {
    const fetchFn = fakeFetch(200, JSON.stringify({ status: "ok" }));

    const result = await crossPost(
      "https://test.substack.com",
      42,
      "twitter",
      material,
      fetchFn,
    );

    assert.equal(result.status, "ok");
    assert.equal(result.postId, 42);
    assert.equal(result.platform, "twitter");
    assert.match(result.message, /Cross-post to twitter/);
  });

  it("returns failed on 401", async () => {
    const fetchFn = fakeFetch(401, "{}");

    const result = await crossPost(
      "https://test.substack.com",
      42,
      "bluesky",
      material,
      fetchFn,
    );

    assert.equal(result.status, "failed");
  });

  it("returns failed when all endpoints return 404", async () => {
    const fetchFn = fakeFetch(404, "{}");

    const result = await crossPost(
      "https://test.substack.com",
      42,
      "mastodon",
      material,
      fetchFn,
    );

    assert.equal(result.status, "failed");
    assert.match(result.message, /No cross-post endpoint found/);
  });
});

describe("importFromWordPress", () => {
  it("returns ok with import id on success", async () => {
    const fetchFn = fakeFetch(
      200,
      JSON.stringify({ import_id: "wp-123" }),
    );

    const result = await importFromWordPress(
      "https://test.substack.com",
      "/path/to/wordpress.xml",
      material,
      fetchFn,
    );

    assert.equal(result.status, "ok");
    assert.equal(result.importId, "wp-123");
    assert.match(result.message, /WordPress import initiated/);
  });

  it("returns ok without import id", async () => {
    const fetchFn = fakeFetch(200, JSON.stringify({}));

    const result = await importFromWordPress(
      "https://test.substack.com",
      "/path/to/wordpress.xml",
      material,
      fetchFn,
    );

    assert.equal(result.status, "ok");
    assert.equal(result.importId, undefined);
  });

  it("returns failed on 401", async () => {
    const fetchFn = fakeFetch(401, "{}");

    const result = await importFromWordPress(
      "https://test.substack.com",
      "/path/to/wordpress.xml",
      material,
      fetchFn,
    );

    assert.equal(result.status, "failed");
  });

  it("returns failed when all endpoints return 404", async () => {
    const fetchFn = fakeFetch(404, "{}");

    const result = await importFromWordPress(
      "https://test.substack.com",
      "/path/to/wordpress.xml",
      material,
      fetchFn,
    );

    assert.equal(result.status, "failed");
  });
});

describe("importFromRss", () => {
  it("returns ok with import id on success", async () => {
    const fetchFn = fakeFetch(
      200,
      JSON.stringify({ import_id: "rss-456" }),
    );

    const result = await importFromRss(
      "https://test.substack.com",
      "https://example.com/feed.xml",
      material,
      fetchFn,
    );

    assert.equal(result.status, "ok");
    assert.equal(result.importId, "rss-456");
    assert.match(result.message, /RSS import initiated/);
  });

  it("returns failed on 401", async () => {
    const fetchFn = fakeFetch(401, "{}");

    const result = await importFromRss(
      "https://test.substack.com",
      "https://example.com/feed.xml",
      material,
      fetchFn,
    );

    assert.equal(result.status, "failed");
  });

  it("returns failed when all endpoints return 404", async () => {
    const fetchFn = fakeFetch(404, "{}");

    const result = await importFromRss(
      "https://test.substack.com",
      "https://example.com/feed.xml",
      material,
      fetchFn,
    );

    assert.equal(result.status, "failed");
  });
});

describe("fetchApiTokens", () => {
  it("returns tokens from array response with redacted previews", async () => {
    const fetchFn = fakeFetch(
      200,
      JSON.stringify([
        {
          id: "token-1",
          name: "My App",
          token: "sk-1234567890abcdef",
          scopes: ["read", "write"],
          created_at: "2026-01-01T00:00:00Z",
          last_used_at: "2026-05-01T00:00:00Z",
        },
      ]),
    );

    const result = await fetchApiTokens(
      "https://test.substack.com",
      material,
      fetchFn,
    );

    assert.equal(result.status, "ok");
    assert.equal(result.tokens?.length, 1);
    assert.equal(result.tokens?.[0]?.id, "token-1");
    assert.equal(result.tokens?.[0]?.name, "My App");
    assert.equal(result.tokens?.[0]?.tokenPreview, "sk-1...cdef");
    assert.deepEqual(result.tokens?.[0]?.scopes, ["read", "write"]);
    assert.equal(result.tokens?.[0]?.createdAt, "2026-01-01T00:00:00Z");
    assert.equal(result.tokens?.[0]?.lastUsedAt, "2026-05-01T00:00:00Z");
  });

  it("parses tokens from nested field", async () => {
    const fetchFn = fakeFetch(
      200,
      JSON.stringify({
        tokens: [
          { id: "t2", label: "App 2", key: "short", scopes: [] },
        ],
      }),
    );

    const result = await fetchApiTokens(
      "https://test.substack.com",
      material,
      fetchFn,
    );

    assert.equal(result.status, "ok");
    assert.equal(result.tokens?.length, 1);
    assert.equal(result.tokens?.[0]?.name, "App 2");
  });

  it("redacts short tokens as ****", async () => {
    const fetchFn = fakeFetch(
      200,
      JSON.stringify([{ id: "t1", name: "Test", token: "abc" }]),
    );

    const result = await fetchApiTokens(
      "https://test.substack.com",
      material,
      fetchFn,
    );

    assert.equal(result.status, "ok");
    assert.equal(result.tokens?.[0]?.tokenPreview, "****");
  });

  it("returns not-found when all endpoints return 404", async () => {
    const fetchFn = fakeFetch(404, "{}");

    const result = await fetchApiTokens(
      "https://test.substack.com",
      material,
      fetchFn,
    );

    assert.equal(result.status, "not-found");
  });

  it("returns unauthenticated on 401", async () => {
    const fetchFn = fakeFetch(401, "{}");

    const result = await fetchApiTokens(
      "https://test.substack.com",
      material,
      fetchFn,
    );

    assert.equal(result.status, "unauthenticated");
  });
});
