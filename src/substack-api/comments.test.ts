import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { materialFromCookieHeader } from "./auth.js";
import type { FetchLike } from "./client.js";
import { fetchCommentSettings, updateCommentSettings } from "./comments.js";

const material = materialFromCookieHeader(
  "substack.sid=fake-secret",
  "https://test.substack.com",
  "env",
);

describe("fetchCommentSettings", () => {
  it("parses comment settings from a valid response", async () => {
    const fetchFn = fakeFetch(200, {
      commenting_enabled: true,
      must_be_paid_subscriber: true,
      must_be_subscriber: true,
      hold_for_review: true,
      auto_approve_repeated_commenters: false,
    });

    const result = await fetchCommentSettings("https://test.substack.com", 42, material, fetchFn);

    assert.equal(result.status, "ok");
    assert.equal(result.settings?.commentingEnabled, true);
    assert.equal(result.settings?.mustBePaidSubscriber, true);
    assert.equal(result.settings?.mustBeSubscriber, true);
    assert.equal(result.settings?.holdForReview, true);
  });

  it("returns not-found when no endpoint responds", async () => {
    const result = await fetchCommentSettings(
      "https://test.substack.com",
      42,
      material,
      fakeFetch(404, {}),
    );

    assert.equal(result.status, "not-found");
  });
});

describe("updateCommentSettings", () => {
  it("writes mapped settings to the first available endpoint", async () => {
    let requestedUrl = "";
    let requestedBody = "";
    const fetchFn: FetchLike = async (url, init) => {
      requestedUrl = url;
      requestedBody = String(init?.body ?? "");
      return response(200, {
        commenting_enabled: false,
        must_be_paid_subscriber: true,
      });
    };

    const result = await updateCommentSettings(
      "https://test.substack.com",
      42,
      { commentingEnabled: false, mustBePaidSubscriber: true },
      material,
      fetchFn,
    );

    assert.equal(result.status, "ok");
    assert.match(requestedUrl, /\/api\/v1\/post\/42\/comment_settings$/);
    assert.deepEqual(JSON.parse(requestedBody), {
      commenting_enabled: false,
      must_be_paid_subscriber: true,
    });
    assert.equal(result.settings?.commentingEnabled, false);
    assert.equal(result.settings?.mustBePaidSubscriber, true);
  });

  it("returns not-found when all write endpoints are unavailable", async () => {
    const result = await updateCommentSettings(
      "https://test.substack.com",
      42,
      { holdForReview: true },
      material,
      fakeFetch(404, {}),
    );

    assert.equal(result.status, "not-found");
  });
});

function fakeFetch(status: number, body: unknown): FetchLike {
  return () => Promise.resolve(response(status, body));
}

function response(status: number, body: unknown): Awaited<ReturnType<FetchLike>> {
  return {
    status,
    text: () => Promise.resolve(JSON.stringify(body)),
  };
}
