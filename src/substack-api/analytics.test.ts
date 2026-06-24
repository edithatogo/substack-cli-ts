import assert from "node:assert/strict";
import { describe, it } from "vitest";
import {
  fetchAnalyticsInventory,
  fetchEmailPerformance,
  fetchPostAnalytics,
  fetchRevenueAnalytics,
  fetchSubscriberGrowth,
} from "./analytics.js";
import { materialFromCookieHeader } from "./auth.js";
import type { FetchLike } from "./client.js";

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

describe("fetchPostAnalytics", () => {
  it("returns analytics from a valid response", async () => {
    const fetchFn = fakeFetch(
      200,
      JSON.stringify({
        title: "Test Post",
        views: 1000,
        read_rate: 0.65,
        email_opens: 200,
        email_clicks: 50,
        referrers: [
          { source: "Twitter", views: 300 },
          { source: "Direct", views: 700 },
        ],
      }),
    );

    const result = await fetchPostAnalytics("https://test.substack.com", 42, material, fetchFn);

    assert.equal(result.status, "ok");
    assert.equal(result.analytics?.postId, 42);
    assert.equal(result.analytics?.title, "Test Post");
    assert.equal(result.analytics?.views, 1000);
    assert.equal(result.analytics?.readRate, 0.65);
    assert.equal(result.analytics?.emailOpens, 200);
    assert.equal(result.analytics?.emailClicks, 50);
    assert.equal(result.analytics?.referrers.length, 2);
    assert.equal(result.analytics?.referrers[0]?.source, "Twitter");
    assert.equal(result.analytics?.referrers[0]?.views, 300);
  });

  it("falls back to alternate field names", async () => {
    const fetchFn = fakeFetch(
      200,
      JSON.stringify({
        post_title: "Alt Post",
        view_count: 500,
        readRate: 0.4,
        opens: 100,
        clicks: 25,
      }),
    );

    const result = await fetchPostAnalytics("https://test.substack.com", 42, material, fetchFn);

    assert.equal(result.status, "ok");
    assert.equal(result.analytics?.title, "Alt Post");
    assert.equal(result.analytics?.views, 500);
    assert.equal(result.analytics?.readRate, 0.4);
    assert.equal(result.analytics?.emailOpens, 100);
    assert.equal(result.analytics?.emailClicks, 25);
  });

  it("returns defaults for missing fields", async () => {
    const fetchFn = fakeFetch(200, JSON.stringify({}));

    const result = await fetchPostAnalytics("https://test.substack.com", 42, material, fetchFn);

    assert.equal(result.status, "ok");
    assert.equal(result.analytics?.views, 0);
    assert.equal(result.analytics?.readRate, null);
    assert.equal(result.analytics?.emailOpens, null);
    assert.equal(result.analytics?.emailClicks, null);
    assert.equal(result.analytics?.referrers.length, 0);
  });

  it("returns not-found when all endpoints return 404", async () => {
    const fetchFn = fakeFetch(404, "{}");

    const result = await fetchPostAnalytics("https://test.substack.com", 42, material, fetchFn);

    assert.equal(result.status, "not-found");
  });

  it("returns unauthenticated on 401", async () => {
    const fetchFn = fakeFetch(401, JSON.stringify({ error: "unauthorized" }));

    const result = await fetchPostAnalytics("https://test.substack.com", 42, material, fetchFn);

    assert.equal(result.status, "unauthenticated");
  });

  it("returns forbidden on 403", async () => {
    const fetchFn = fakeFetch(403, JSON.stringify({}));

    const result = await fetchPostAnalytics("https://test.substack.com", 42, material, fetchFn);

    assert.equal(result.status, "forbidden");
  });
});

describe("fetchSubscriberGrowth", () => {
  it("returns growth data from a valid response", async () => {
    const fetchFn = fakeFetch(
      200,
      JSON.stringify({
        period: "2026-05",
        total_subscribers: 5000,
        net_change: 100,
        free_subscribers: 4000,
        paid_subscribers: 1000,
        churned: 20,
      }),
    );

    const result = await fetchSubscriberGrowth("https://test.substack.com", material, fetchFn);

    assert.equal(result.status, "ok");
    assert.equal(result.growth?.period, "2026-05");
    assert.equal(result.growth?.totalSubscribers, 5000);
    assert.equal(result.growth?.netChange, 100);
    assert.equal(result.growth?.freeSubscribers, 4000);
    assert.equal(result.growth?.paidSubscribers, 1000);
    assert.equal(result.growth?.churned, 20);
  });

  it("falls back to alternate field names", async () => {
    const fetchFn = fakeFetch(
      200,
      JSON.stringify({
        date_range: "last_30_days",
        subscriber_count: 3000,
        netChange: 50,
        free: 2500,
        paid: 500,
        unsubscribes: 10,
      }),
    );

    const result = await fetchSubscriberGrowth("https://test.substack.com", material, fetchFn);

    assert.equal(result.status, "ok");
    assert.equal(result.growth?.totalSubscribers, 3000);
    assert.equal(result.growth?.netChange, 50);
    assert.equal(result.growth?.churned, 10);
  });

  it("passes period as a query parameter", async () => {
    let requestedUrl = "";
    const fetchFn: FetchLike = async (url) => {
      requestedUrl = url;
      return {
        status: 200,
        text: () =>
          Promise.resolve(
            JSON.stringify({
              period: "weekly",
              total_subscribers: 10,
              net_change: 1,
            }),
          ),
      };
    };

    const result = await fetchSubscriberGrowth("https://test.substack.com", material, fetchFn, {
      period: "weekly",
    });

    assert.equal(result.status, "ok");
    assert.match(requestedUrl, /[?&]period=weekly/);
  });

  it("returns not-found when all endpoints return 404", async () => {
    const fetchFn = fakeFetch(404, "{}");

    const result = await fetchSubscriberGrowth("https://test.substack.com", material, fetchFn);

    assert.equal(result.status, "not-found");
  });

  it("returns unauthenticated on 401", async () => {
    const fetchFn = fakeFetch(401, "{}");

    const result = await fetchSubscriberGrowth("https://test.substack.com", material, fetchFn);

    assert.equal(result.status, "unauthenticated");
  });
});

describe("fetchEmailPerformance", () => {
  it("returns email performance from array response", async () => {
    const fetchFn = fakeFetch(
      200,
      JSON.stringify([
        {
          post_id: 1,
          title: "Newsletter #1",
          sent_at: "2026-01-01T00:00:00Z",
          recipients: 1000,
          delivered: 980,
          opens: 400,
          open_rate: 0.408,
          clicks: 100,
          click_rate: 0.102,
          unsubscribes: 5,
        },
      ]),
    );

    const result = await fetchEmailPerformance("https://test.substack.com", material, fetchFn);

    assert.equal(result.status, "ok");
    assert.equal(result.emails?.length, 1);
    assert.equal(result.emails?.[0]?.postId, 1);
    assert.equal(result.emails?.[0]?.title, "Newsletter #1");
    assert.equal(result.emails?.[0]?.recipients, 1000);
    assert.equal(result.emails?.[0]?.openRate, 0.408);
  });

  it("skips malformed email performance entries", async () => {
    const fetchFn = fakeFetch(
      200,
      JSON.stringify([
        null,
        "bad",
        {
          post_id: 3,
          title: "Valid Email",
          recipients: 20,
          opens: 10,
          clicks: 2,
        },
      ]),
    );

    const result = await fetchEmailPerformance("https://test.substack.com", material, fetchFn);

    assert.equal(result.status, "ok");
    assert.equal(result.emails?.length, 1);
    assert.equal(result.emails?.[0]?.title, "Valid Email");
  });

  it("parses emails from nested object response", async () => {
    const fetchFn = fakeFetch(
      200,
      JSON.stringify({
        emails: [
          {
            post_id: 2,
            subject: "Nested Email",
            sentAt: "2026-02-01T00:00:00Z",
            recipients: 500,
            delivered: 490,
            opens: 200,
            openRate: 0.408,
            clicks: 50,
            clickRate: 0.102,
            unsubscribes: 2,
          },
        ],
      }),
    );

    const result = await fetchEmailPerformance("https://test.substack.com", material, fetchFn);

    assert.equal(result.status, "ok");
    assert.equal(result.emails?.length, 1);
    assert.equal(result.emails?.[0]?.title, "Nested Email");
  });

  it("applies limit parameter", async () => {
    const items = Array.from({ length: 5 }, (_, i) => ({
      post_id: i + 1,
      title: `Email ${i + 1}`,
      recipients: 100,
      delivered: 98,
      opens: 40,
      open_rate: 0.4,
      clicks: 10,
      click_rate: 0.1,
      unsubscribes: 0,
    }));

    const fetchFn = fakeFetch(200, JSON.stringify(items));

    const result = await fetchEmailPerformance("https://test.substack.com", material, fetchFn, 3);

    assert.equal(result.status, "ok");
    assert.equal(result.emails?.length, 3);
  });

  it("returns not-found when all endpoints return 404", async () => {
    const fetchFn = fakeFetch(404, "{}");

    const result = await fetchEmailPerformance("https://test.substack.com", material, fetchFn);

    assert.equal(result.status, "not-found");
  });
});

describe("fetchRevenueAnalytics", () => {
  it("returns revenue data from a valid response", async () => {
    const fetchFn = fakeFetch(
      200,
      JSON.stringify({
        period: "2026-05",
        new_paid_subscribers: 50,
        churned_paid_subscribers: 10,
        mrr: 5000,
        total_revenue: 25000,
      }),
    );

    const result = await fetchRevenueAnalytics("https://test.substack.com", material, fetchFn);

    assert.equal(result.status, "ok");
    assert.equal(result.revenue?.period, "2026-05");
    assert.equal(result.revenue?.newPaidSubscribers, 50);
    assert.equal(result.revenue?.churnedPaidSubscribers, 10);
    assert.equal(result.revenue?.mrr, 5000);
    assert.equal(result.revenue?.totalRevenue, 25000);
  });

  it("falls back to alternate field names", async () => {
    const fetchFn = fakeFetch(
      200,
      JSON.stringify({
        date_range: "last_30_days",
        new_paid: 30,
        churned_paid: 5,
        monthly_recurring_revenue: 3000,
        revenue: 15000,
      }),
    );

    const result = await fetchRevenueAnalytics("https://test.substack.com", material, fetchFn);

    assert.equal(result.status, "ok");
    assert.equal(result.revenue?.newPaidSubscribers, 30);
    assert.equal(result.revenue?.churnedPaidSubscribers, 5);
    assert.equal(result.revenue?.mrr, 3000);
    assert.equal(result.revenue?.totalRevenue, 15000);
  });

  it("handles null revenue values", async () => {
    const fetchFn = fakeFetch(
      200,
      JSON.stringify({
        period: "2026-05",
        new_paid_subscribers: 0,
        churned_paid_subscribers: 0,
      }),
    );

    const result = await fetchRevenueAnalytics("https://test.substack.com", material, fetchFn);

    assert.equal(result.status, "ok");
    assert.equal(result.revenue?.mrr, null);
    assert.equal(result.revenue?.totalRevenue, null);
  });

  it("returns not-found when all endpoints return 404", async () => {
    const fetchFn = fakeFetch(404, "{}");

    const result = await fetchRevenueAnalytics("https://test.substack.com", material, fetchFn);

    assert.equal(result.status, "not-found");
  });
});

describe("fetchAnalyticsInventory", () => {
  it("probes all analytics endpoints", async () => {
    const routes = new Map<string, unknown>([
      ["https://test.substack.com/api/v1/post/42/analytics", { views: 100, read_rate: 0.5 }],
      [
        "https://test.substack.com/api/v1/publication/analytics/subscribers",
        { total_subscribers: 5000, net_change: 100 },
      ],
      [
        "https://test.substack.com/api/v1/publication/analytics/emails",
        [{ post_id: 1, title: "Test", recipients: 100, opens: 50 }],
      ],
      [
        "https://test.substack.com/api/v1/publication/analytics/revenue",
        { new_paid_subscribers: 10, mrr: 1000 },
      ],
    ]);

    const result = await fetchAnalyticsInventory(
      "https://test.substack.com",
      material,
      fakeFetchRoutes(routes),
      42,
    );

    assert.equal(result.status, "ok");
    assert.equal(result.postAnalytics?.status, "ok");
    assert.equal(result.subscriberGrowth?.status, "ok");
    assert.equal(result.emailPerformance?.status, "ok");
    assert.equal(result.revenue?.status, "ok");
  });

  it("returns not-found when all endpoints are unavailable", async () => {
    const result = await fetchAnalyticsInventory(
      "https://test.substack.com",
      material,
      fakeFetch(404, "{}"),
    );

    assert.equal(result.status, "not-found");
  });

  it("includes endpoints list in result", async () => {
    const result = await fetchAnalyticsInventory(
      "https://test.substack.com",
      material,
      fakeFetch(404, "{}"),
      42,
    );

    assert.ok(result.endpoints.length > 0);
    assert.ok(result.endpoints.some((e) => e.includes("analytics")));
  });
});
