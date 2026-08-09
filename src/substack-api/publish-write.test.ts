import assert from "node:assert/strict";
import { describe, it } from "vitest";
import type { ApiAuthMaterial } from "./auth.js";
import { executePublishWrite, planPublishWrite } from "./publish-write.js";

const dummyMaterial: ApiAuthMaterial = {
  source: "env",
  publicationUrl: "https://test.substack.com",
  cookieHeader: "dummy_session=abc",
  cookies: [
    {
      name: "dummy_session",
      domain: "test.substack.com",
      path: "/",
      expires: 0,
      secure: false,
      httpOnly: false,
      sameSite: "Lax" as const,
      value: "abc",
    },
  ],
  hasLikelySessionCookie: true,
};

describe("planPublishWrite", () => {
  it("plans publish operation", () => {
    const plan = planPublishWrite(
      "123",
      "https://test.substack.com/publish/post/123",
      "publish",
      "https://test.substack.com",
    );

    assert.equal(plan.status, "planned");
    assert.equal(plan.operation, "publish");
    assert.equal(plan.method, "POST");
    assert.ok(plan.endpoint.includes("/api/v1/drafts/123/publish"));
  });

  it("plans schedule operation with timestamp", () => {
    const plan = planPublishWrite(
      "123",
      "https://test.substack.com/publish/post/123",
      "schedule",
      "https://test.substack.com",
      "2026-06-01T09:00:00Z",
    );

    assert.equal(plan.operation, "schedule");
    assert.ok(plan.endpoint.includes("/api/v1/drafts/123/scheduled_release"));
    assert.ok(!plan.endpoint.endsWith("/schedule"));
    assert.equal(plan.scheduleAt, "2026-06-01T09:00:00Z");
  });

  it("plans prepublish operation without targeting the live publish endpoint", () => {
    const plan = planPublishWrite(
      "123",
      "https://test.substack.com/publish/post/123",
      "prepublish",
      "https://test.substack.com",
    );

    assert.equal(plan.operation, "prepublish");
    assert.ok(plan.endpoint.includes("/api/v1/drafts/123/prepublish"));
  });
});

describe("executePublishWrite", () => {
  it("reports published status on success", async () => {
    const plan = planPublishWrite(
      "123",
      "https://test.substack.com/publish/post/123",
      "publish",
      "https://test.substack.com",
    );

    const mockFetch = async (_url: string, _init?: Record<string, unknown>) => ({
      status: 200,
      text: async () =>
        JSON.stringify({
          id: 123,
          post_url: "https://test.substack.com/p/my-post",
          title: "My Post",
        }),
    });

    const result = await executePublishWrite(plan, dummyMaterial, mockFetch);

    assert.equal(result.status, "published");
    assert.equal(result.operation, "publish");
    assert.equal(result.postUrl, "https://test.substack.com/p/my-post");
  });

  it("reports scheduled status on schedule success", async () => {
    const plan = planPublishWrite(
      "123",
      "https://test.substack.com/publish/post/123",
      "schedule",
      "https://test.substack.com",
      "2026-06-01T09:00:00Z",
    );

    const mockFetch = async () => ({
      status: 200,
      text: async () => JSON.stringify({ id: 123 }),
    });

    const result = await executePublishWrite(plan, dummyMaterial, mockFetch);

    assert.equal(result.status, "scheduled");
    assert.equal(result.operation, "schedule");
    assert.equal(result.retryAttempts, 0);
  });

  it("surfaces write retry attempts", async () => {
    const plan = planPublishWrite(
      "123",
      "https://test.substack.com/publish/post/123",
      "schedule",
      "https://test.substack.com",
      "2026-06-01T09:00:00Z",
    );

    const mockFetch = async () => ({
      status: 200,
      text: async () => JSON.stringify({ id: 123 }),
    });

    const result = await executePublishWrite(plan, dummyMaterial, mockFetch);

    assert.equal(result.retryAttempts, 0);
  });

  it("fails on HTTP error", async () => {
    const plan = planPublishWrite(
      "123",
      "https://test.substack.com/publish/post/123",
      "publish",
      "https://test.substack.com",
    );

    const mockFetch = async () => ({
      status: 403,
      text: async () => "Forbidden",
    });

    const result = await executePublishWrite(plan, dummyMaterial, mockFetch);

    assert.equal(result.status, "failed");
    assert.match(result.error ?? "", /HTTP 403/);
  });
});
