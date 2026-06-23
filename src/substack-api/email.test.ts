import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { materialFromCookieHeader } from "./auth.js";
import type { FetchLike } from "./client.js";
import {
  cancelScheduledBroadcast,
  fetchBroadcastHistory,
  fetchEmailTemplate,
  sendTestEmail,
  updateEmailTemplate,
} from "./email.js";

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

describe("fetchEmailTemplate", () => {
  it("maps template settings from the first available endpoint", async () => {
    const fetchFn = fakeFetch(200, {
      header_html: "<h1>Hello</h1>",
      footer: "Footer",
      logoUrl: "https://example.com/logo.png",
      color: "#ff0000",
      backgroundColor: "#ffffff",
      text_color: "#111111",
      fontFamily: "Inter",
    });

    const result = await fetchEmailTemplate("https://test.substack.com", material, fetchFn);

    assert.equal(result.status, "ok");
    assert.equal(result.template?.headerHtml, "<h1>Hello</h1>");
    assert.equal(result.template?.footerHtml, "Footer");
    assert.equal(result.template?.logoUrl, "https://example.com/logo.png");
    assert.equal(result.template?.primaryColor, "#ff0000");
    assert.equal(result.template?.backgroundColor, "#ffffff");
    assert.equal(result.template?.textColor, "#111111");
    assert.equal(result.template?.fontFamily, "Inter");
  });

  it("returns not-found when all known endpoints are missing", async () => {
    const result = await fetchEmailTemplate(
      "https://test.substack.com",
      material,
      fakeFetch(404, {}),
    );

    assert.equal(result.status, "not-found");
  });
});

describe("fetchBroadcastHistory", () => {
  it("parses broadcast entries and respects the limit", async () => {
    const result = await fetchBroadcastHistory(
      "https://test.substack.com",
      material,
      fakeFetch(200, {
        broadcasts: [
          {
            id: 123,
            title: "First",
            sentAt: "2026-01-01T00:00:00Z",
            scheduled_at: "2026-01-02T00:00:00Z",
            status: "sent",
            postId: 55,
            recipient_count: 100,
          },
          { id: "456", subject: "Second" },
        ],
      }),
      1,
    );

    assert.equal(result.status, "ok");
    assert.equal(result.broadcasts?.length, 1);
    assert.equal(result.broadcasts?.[0]?.id, "123");
    assert.equal(result.broadcasts?.[0]?.subject, "First");
    assert.equal(result.broadcasts?.[0]?.recipients, 100);
  });

  it("classifies non-404 failures", async () => {
    const result = await fetchBroadcastHistory(
      "https://test.substack.com",
      material,
      fakeFetch(403, {}),
    );

    assert.equal(result.status, "forbidden");
  });
});

describe("email write probes", () => {
  it("cancels scheduled broadcasts through fallback endpoints", async () => {
    const routes = new Map([
      [
        "https://test.substack.com/api/v1/publication/broadcasts/b1/cancel",
        { status: 200, body: {} },
      ],
    ]);

    const result = await cancelScheduledBroadcast(
      "https://test.substack.com",
      "b1",
      material,
      fakeFetchRoutes(routes),
    );

    assert.equal(result.status, "ok");
    assert.equal(result.broadcastId, "b1");
  });

  it("returns failed when test email endpoints are unavailable", async () => {
    const result = await sendTestEmail(
      "https://test.substack.com",
      42,
      material,
      fakeFetch(404, {}),
    );

    assert.equal(result.status, "failed");
    assert.match(result.message, /No test email endpoint/);
  });
});

describe("updateEmailTemplate", () => {
  it("returns a preview when dry-run is true (no write performed)", async () => {
    const result = await updateEmailTemplate(
      "https://test.substack.com",
      material,
      fakeFetch(200, {}),
      { primaryColor: "#ff0000" },
      { dryRun: true },
    );

    assert.equal(result.status, "ok");
    assert.match(result.message, /Preview/);
    assert.equal(result.updated?.primaryColor, "#ff0000");
  });

  it("returns a preview when confirm is not provided", async () => {
    const result = await updateEmailTemplate(
      "https://test.substack.com",
      material,
      fakeFetch(200, {}),
      { headerHtml: "<h1>New Header</h1>" },
    );

    assert.equal(result.status, "ok");
    assert.match(result.message, /Preview/);
  });

  it("attempts to write through known endpoints when confirmed", async () => {
    const routes = new Map([
      ["https://test.substack.com/api/v1/publication/email_template", { status: 200, body: {} }],
    ]);

    const result = await updateEmailTemplate(
      "https://test.substack.com",
      material,
      fakeFetchRoutes(routes),
      { fontFamily: "Georgia" },
      { confirm: true },
    );

    assert.equal(result.status, "ok");
    assert.equal(result.updated?.fontFamily, "Georgia");
  });

  it("returns failed when all endpoints return 404", async () => {
    const result = await updateEmailTemplate(
      "https://test.substack.com",
      material,
      fakeFetch(404, {}),
      { textColor: "#333333" },
      { confirm: true },
    );

    assert.equal(result.status, "failed");
    assert.match(result.message, /No writable email template endpoint/);
  });

  it("returns failed on non-404 write error", async () => {
    const routes = new Map([
      ["https://test.substack.com/api/v1/publication/email_template", { status: 403, body: {} }],
    ]);

    const result = await updateEmailTemplate(
      "https://test.substack.com",
      material,
      fakeFetchRoutes(routes),
      { footerHtml: "<p>Footer</p>" },
      { confirm: true },
    );

    assert.equal(result.status, "failed");
    assert.match(result.message, /HTTP 403/);
  });
});
