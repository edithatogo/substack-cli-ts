import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { materialFromCookieHeader } from "./auth.js";
import { type FetchLike } from "./client.js";
import {
  fetchEmailTemplate,
  fetchBroadcastHistory,
  cancelScheduledBroadcast,
  sendTestEmail,
} from "./email.js";

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

describe("fetchEmailTemplate", () => {
  it("returns template settings from valid response", async () => {
    const fetchFn = fakeFetch(
      200,
      JSON.stringify({
        header_html: "<h1>Header</h1>",
        footer_html: "<p>Footer</p>",
        logo_url: "https://example.com/logo.png",
        primary_color: "#000000",
        background_color: "#ffffff",
        text_color: "#333333",
        font_family: "Arial",
      }),
    );

    const result = await fetchEmailTemplate(
      "https://test.substack.com",
      material,
      fetchFn,
    );

    assert.equal(result.status, "ok");
    assert.equal(result.template?.headerHtml, "<h1>Header</h1>");
    assert.equal(result.template?.footerHtml, "<p>Footer</p>");
    assert.equal(result.template?.logoUrl, "https://example.com/logo.png");
    assert.equal(result.template?.primaryColor, "#000000");
    assert.equal(result.template?.backgroundColor, "#ffffff");
    assert.equal(result.template?.textColor, "#333333");
    assert.equal(result.template?.fontFamily, "Arial");
  });

  it("falls back to alternate field names", async () => {
    const fetchFn = fakeFetch(
      200,
      JSON.stringify({
        header: "<h1>Alt</h1>",
        footer: "<p>Alt Footer</p>",
        logoUrl: "https://example.com/logo2.png",
        primaryColor: "#111",
        backgroundColor: "#eee",
        textColor: "#222",
        fontFamily: "Helvetica",
      }),
    );

    const result = await fetchEmailTemplate(
      "https://test.substack.com",
      material,
      fetchFn,
    );

    assert.equal(result.status, "ok");
    assert.equal(result.template?.headerHtml, "<h1>Alt</h1>");
    assert.equal(result.template?.logoUrl, "https://example.com/logo2.png");
  });

  it("returns null for missing fields", async () => {
    const fetchFn = fakeFetch(200, JSON.stringify({}));

    const result = await fetchEmailTemplate(
      "https://test.substack.com",
      material,
      fetchFn,
    );

    assert.equal(result.status, "ok");
    assert.equal(result.template?.headerHtml, null);
    assert.equal(result.template?.logoUrl, null);
  });

  it("returns not-found when all endpoints return 404", async () => {
    const fetchFn = fakeFetch(404, "{}");

    const result = await fetchEmailTemplate(
      "https://test.substack.com",
      material,
      fetchFn,
    );

    assert.equal(result.status, "not-found");
  });
});

describe("fetchBroadcastHistory", () => {
  it("returns broadcasts from array response", async () => {
    const fetchFn = fakeFetch(
      200,
      JSON.stringify([
        {
          id: "bc-1",
          subject: "Newsletter #1",
          sent_at: "2026-01-01T00:00:00Z",
          scheduled_for: null,
          status: "sent",
          post_id: 100,
          recipients: 5000,
        },
      ]),
    );

    const result = await fetchBroadcastHistory(
      "https://test.substack.com",
      material,
      fetchFn,
    );

    assert.equal(result.status, "ok");
    assert.equal(result.broadcasts?.length, 1);
    assert.equal(result.broadcasts?.[0]?.id, "bc-1");
    assert.equal(result.broadcasts?.[0]?.subject, "Newsletter #1");
    assert.equal(result.broadcasts?.[0]?.status, "sent");
    assert.equal(result.broadcasts?.[0]?.postId, 100);
    assert.equal(result.broadcasts?.[0]?.recipients, 5000);
  });

  it("parses broadcasts from nested field", async () => {
    const fetchFn = fakeFetch(
      200,
      JSON.stringify({
        broadcasts: [
          {
            id: "bc-2",
            title: "Nested Broadcast",
            sentAt: "2026-02-01T00:00:00Z",
            scheduledFor: "2026-03-01T00:00:00Z",
            status: "scheduled",
            postId: 200,
            recipient_count: 3000,
          },
        ],
      }),
    );

    const result = await fetchBroadcastHistory(
      "https://test.substack.com",
      material,
      fetchFn,
    );

    assert.equal(result.status, "ok");
    assert.equal(result.broadcasts?.length, 1);
    assert.equal(result.broadcasts?.[0]?.subject, "Nested Broadcast");
    assert.equal(result.broadcasts?.[0]?.scheduledFor, "2026-03-01T00:00:00Z");
  });

  it("applies limit parameter", async () => {
    const items = Array.from({ length: 5 }, (_, i) => ({
      id: `bc-${i}`,
      subject: `Email ${i}`,
      status: "sent",
    }));

    const fetchFn = fakeFetch(200, JSON.stringify(items));

    const result = await fetchBroadcastHistory(
      "https://test.substack.com",
      material,
      fetchFn,
      3,
    );

    assert.equal(result.status, "ok");
    assert.equal(result.broadcasts?.length, 3);
  });

  it("returns not-found when all endpoints return 404", async () => {
    const fetchFn = fakeFetch(404, "{}");

    const result = await fetchBroadcastHistory(
      "https://test.substack.com",
      material,
      fetchFn,
    );

    assert.equal(result.status, "not-found");
  });
});

describe("cancelScheduledBroadcast", () => {
  it("returns ok on successful cancel", async () => {
    const fetchFn = fakeFetch(200, JSON.stringify({ status: "cancelled" }));

    const result = await cancelScheduledBroadcast(
      "https://test.substack.com",
      "bc-1",
      material,
      fetchFn,
    );

    assert.equal(result.status, "ok");
    assert.equal(result.broadcastId, "bc-1");
    assert.match(result.message, /cancelled/);
  });

  it("returns failed on 401", async () => {
    const fetchFn = fakeFetch(401, "{}");

    const result = await cancelScheduledBroadcast(
      "https://test.substack.com",
      "bc-1",
      material,
      fetchFn,
    );

    assert.equal(result.status, "failed");
  });

  it("returns failed when all endpoints return 404", async () => {
    const fetchFn = fakeFetch(404, "{}");

    const result = await cancelScheduledBroadcast(
      "https://test.substack.com",
      "bc-1",
      material,
      fetchFn,
    );

    assert.equal(result.status, "failed");
  });
});

describe("sendTestEmail", () => {
  it("returns ok on successful send", async () => {
    const fetchFn = fakeFetch(200, JSON.stringify({ sent: true }));

    const result = await sendTestEmail(
      "https://test.substack.com",
      42,
      material,
      fetchFn,
    );

    assert.equal(result.status, "ok");
    assert.equal(result.draftId, 42);
    assert.match(result.message, /Test email sent/);
  });

  it("returns failed on 401", async () => {
    const fetchFn = fakeFetch(401, "{}");

    const result = await sendTestEmail(
      "https://test.substack.com",
      42,
      material,
      fetchFn,
    );

    assert.equal(result.status, "failed");
  });

  it("returns failed when all endpoints return 404", async () => {
    const fetchFn = fakeFetch(404, "{}");

    const result = await sendTestEmail(
      "https://test.substack.com",
      42,
      material,
      fetchFn,
    );

    assert.equal(result.status, "failed");
  });
});
