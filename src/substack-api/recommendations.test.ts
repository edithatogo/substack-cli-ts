import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { materialFromCookieHeader } from "./auth.js";
import type { FetchLike } from "./client.js";

const {
  fetchRecommendationList,
  fetchRecommendationStatus,
  addRecommendation,
  removeRecommendation,
} = await import("./recommendations.js");

function material() {
  return materialFromCookieHeader(
    "substack.sid=fake-long-secret-value",
    "https://rareinsights.substack.com",
    "env",
  );
}

function fakeFetch(status: number, body: string): FetchLike {
  return () =>
    Promise.resolve({
      status,
      text: () => Promise.resolve(body),
    });
}

describe("fetchRecommendationList", () => {
  it("returns ok with parsed recommendations from known endpoint", async () => {
    const result = await fetchRecommendationList(
      "https://rareinsights.substack.com",
      material(),
      fakeFetch(
        200,
        JSON.stringify({
          recommendations: [
            {
              id: "pub-1",
              name: "Test Publication",
              subdomain: "testpub",
              description: "A test publication",
              logo_url: "https://example.com/logo.png",
              subscriber_count: 1500,
            },
          ],
        }),
      ),
    );

    assert.equal(result.status, "ok");
    assert.ok(result.recommended);
    assert.equal(result.recommended!.length, 1);
    assert.equal(result.recommended![0]!.name, "Test Publication");
    assert.equal(result.recommended![0]!.subdomain, "testpub");
    assert.equal(result.recommended![0]!.subscribers, 1500);
  });

  it("returns not-found when all endpoints 404", async () => {
    const result = await fetchRecommendationList(
      "https://rareinsights.substack.com",
      material(),
      fakeFetch(404, "{}"),
    );

    assert.equal(result.status, "not-found");
  });

  it("returns error on non-404 error", async () => {
    const result = await fetchRecommendationList(
      "https://rareinsights.substack.com",
      material(),
      fakeFetch(403, "{}"),
    );

    assert.equal(result.status, "forbidden");
  });

  it("handles empty response body gracefully", async () => {
    const result = await fetchRecommendationList(
      "https://rareinsights.substack.com",
      material(),
      fakeFetch(200, JSON.stringify({ recommendations: [] })),
    );

    assert.equal(result.status, "ok");
    assert.ok(result.recommended);
    assert.equal(result.recommended!.length, 0);
  });
});

describe("fetchRecommendationStatus", () => {
  it("returns status when endpoint responds", async () => {
    const result = await fetchRecommendationStatus(
      "https://rareinsights.substack.com",
      "https://otherpub.substack.com",
      material(),
      fakeFetch(
        200,
        JSON.stringify({
          is_recommended: true,
          is_recommending: false,
          mutual: false,
        }),
      ),
    );

    assert.equal(result.status, "ok");
    assert.equal(result.isRecommended, true);
    assert.equal(result.isRecommending, false);
    assert.equal(result.mutual, false);
  });

  it("returns not-found when all endpoints 404", async () => {
    const result = await fetchRecommendationStatus(
      "https://rareinsights.substack.com",
      "https://otherpub.substack.com",
      material(),
      fakeFetch(404, "{}"),
    );

    assert.equal(result.status, "not-found");
    assert.equal(result.isRecommended, null);
  });

  it("handles missing boolean fields gracefully", async () => {
    const result = await fetchRecommendationStatus(
      "https://rareinsights.substack.com",
      "https://otherpub.substack.com",
      material(),
      fakeFetch(200, JSON.stringify({ recommended: true })),
    );

    assert.equal(result.status, "ok");
    assert.equal(result.isRecommended, true);
    assert.equal(result.isRecommending, null);
    assert.equal(result.mutual, null);
  });
});

describe("addRecommendation", () => {
  it("returns ok on successful POST", async () => {
    const result = await addRecommendation(
      "https://rareinsights.substack.com",
      "https://otherpub.substack.com",
      material(),
      fakeFetch(201, JSON.stringify({ status: "ok" })),
    );

    assert.equal(result.status, "ok");
    assert.equal(result.publicationUrl, "https://otherpub.substack.com");
  });

  it("returns not-found when all endpoints 404", async () => {
    const result = await addRecommendation(
      "https://rareinsights.substack.com",
      "https://otherpub.substack.com",
      material(),
      fakeFetch(404, "{}"),
    );

    assert.equal(result.status, "not-found");
  });
});

describe("removeRecommendation", () => {
  it("returns ok on successful DELETE", async () => {
    const captures: { url: string; method?: string }[] = [];
    const fetchWithCapture: FetchLike = (url, init) => {
      captures.push({
        url,
        method: (init as Record<string, unknown>)?.method as string | undefined,
      });
      return Promise.resolve({
        status: 204,
        text: () => Promise.resolve(""),
      });
    };

    const result = await removeRecommendation(
      "https://rareinsights.substack.com",
      "https://otherpub.substack.com",
      material(),
      fetchWithCapture,
    );

    assert.equal(result.status, "ok");
    assert.ok(captures.length > 0);
    assert.equal(captures[0]!.method, "DELETE");
  });

  it("returns not-found when all endpoints 404", async () => {
    const result = await removeRecommendation(
      "https://rareinsights.substack.com",
      "https://otherpub.substack.com",
      material(),
      fakeFetch(404, "{}"),
    );

    assert.equal(result.status, "not-found");
  });
});
