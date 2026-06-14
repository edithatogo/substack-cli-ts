import assert from "node:assert/strict";
import { describe, it } from "vitest";
import type { ApiAuthMaterial } from "../substack-api/auth.js";
import type { FetchLike } from "../substack-api/client.js";
import { buildCommentTriageReport, inspectCommunitySurface } from "./community.js";

const material: ApiAuthMaterial = {
  source: "env",
  publicationUrl: "https://example.substack.com",
  cookieHeader: "substack.sid=redacted",
  cookies: [],
  hasLikelySessionCookie: true,
};

describe("community triage", () => {
  it("classifies questions, testimonials, and possible moderation items", () => {
    const report = buildCommentTriageReport(123, {
      status: "ok",
      message: "Found 3 comments.",
      comments: [
        {
          id: 1,
          body: "How did you calculate this?",
          authorName: "A",
          authorHandle: "a",
          publishedAt: "2026-01-01T00:00:00Z",
          status: "published",
        },
        {
          id: 2,
          body: "Thanks, this was helpful.",
          authorName: "B",
          authorHandle: "b",
          publishedAt: "2026-01-01T00:00:00Z",
          status: "published",
        },
        {
          id: 3,
          body: "spam link",
          authorName: "C",
          authorHandle: "c",
          publishedAt: "2026-01-01T00:00:00Z",
          status: "pending",
        },
      ],
    });

    assert.equal(report.total, 3);
    assert.equal(report.needsReply.length, 1);
    assert.equal(report.possibleTestimonials.length, 1);
    assert.equal(report.possibleModeration.length, 1);
  });

  it("propagates non-ok comment list statuses", () => {
    const report = buildCommentTriageReport(123, {
      status: "forbidden",
      message: "Forbidden",
    });

    assert.equal(report.total, 0);
    assert.equal(report.message, "Forbidden");
  });

  it("inspects available community surfaces", async () => {
    const seen: string[] = [];
    const fetchFn: FetchLike = async (input) => {
      seen.push(String(input));
      return {
        status: 200,
        text: async () => JSON.stringify({ ok: true }),
      };
    };

    const result = await inspectCommunitySurface(
      "https://example.substack.com",
      material,
      fetchFn,
      "recommendations",
    );

    assert.equal(result.status, "ok");
    assert.equal(result.endpoint, "/api/v1/publication/recommendations");
    assert.ok(seen[0]?.includes("/api/v1/publication/recommendations"));
  });

  it("falls back through not-found community endpoints", async () => {
    let calls = 0;
    const fetchFn: FetchLike = async () => {
      calls += 1;
      return {
        status: 404,
        text: async () => "{}",
      };
    };

    const result = await inspectCommunitySurface(
      "https://example.substack.com",
      material,
      fetchFn,
      "boost",
    );

    assert.equal(result.status, "not-found");
    assert.equal(result.surface, "boost");
    assert.equal(calls, 2);
  });

  it("classifies failed community probes", async () => {
    const fetchFn: FetchLike = async () => ({
      status: 403,
      text: async () => "{}",
    });

    const result = await inspectCommunitySurface(
      "https://example.substack.com",
      material,
      fetchFn,
      "recommendations",
    );

    assert.equal(result.status, "forbidden");
    assert.equal(result.endpoint, "/api/v1/publication/recommendations");
  });

  it("handles invalid URLs and request failures as structured results", async () => {
    const unusedFetch: FetchLike = async () => {
      throw new Error("should not be called");
    };
    const invalidUrl = await inspectCommunitySurface(
      "not a url",
      material,
      unusedFetch,
      "recommendations",
    );
    assert.equal(invalidUrl.status, "network-error");

    const invalidEndpointBase = await inspectCommunitySurface(
      "data:text/plain,substack",
      material,
      unusedFetch,
      "boost",
    );
    assert.equal(invalidEndpointBase.status, "network-error");
    assert.equal(invalidEndpointBase.endpoint, "/api/v1/publication/boost");

    const failingFetch: FetchLike = async () => {
      throw new Error("offline");
    };
    const requestFailure = await inspectCommunitySurface(
      "https://example.substack.com",
      material,
      failingFetch,
      "boost",
    );
    assert.equal(requestFailure.status, "network-error");
  });
});
