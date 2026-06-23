import assert from "node:assert/strict";
import { describe, it } from "vitest";
import {
  formatEmailPerformance,
  formatPostAnalytics,
  formatRevenueAnalytics,
  formatSubscriberGrowth,
} from "./analytics-format.js";
import type {
  EmailPerformanceResult,
  PostAnalyticsResult,
  RevenueAnalyticsResult,
  SubscriberGrowthResult,
} from "./analytics.js";

const postResult: PostAnalyticsResult = {
  status: "ok",
  analytics: {
    postId: 42,
    title: "Test Post",
    views: 1000,
    readRate: 0.65,
    emailOpens: 200,
    emailClicks: 50,
    referrers: [
      { source: "Twitter", views: 300 },
      { source: "Direct", views: 700 },
    ],
  },
  message: "Post analytics retrieved.",
};

const subscriberResult: SubscriberGrowthResult = {
  status: "ok",
  growth: {
    period: "2026-05",
    totalSubscribers: 5000,
    netChange: 100,
    freeSubscribers: 4000,
    paidSubscribers: 1000,
    churned: 20,
  },
  message: "Subscriber growth retrieved.",
};

const emailResult: EmailPerformanceResult = {
  status: "ok",
  emails: [
    {
      postId: 1,
      title: "Newsletter #1",
      sentAt: "2026-01-01T00:00:00Z",
      recipients: 1000,
      delivered: 980,
      opens: 400,
      openRate: 0.408,
      clicks: 100,
      clickRate: 0.102,
      unsubscribes: 5,
    },
  ],
  message: "Email performance retrieved.",
};

const revenueResult: RevenueAnalyticsResult = {
  status: "ok",
  revenue: {
    period: "2026-05",
    newPaidSubscribers: 50,
    churnedPaidSubscribers: 10,
    mrr: 5000,
    totalRevenue: 25000,
  },
  message: "Revenue analytics retrieved.",
};

describe("formatPostAnalytics", () => {
  it("returns JSON for json format", () => {
    const output = formatPostAnalytics(postResult, { format: "json" });
    const parsed = JSON.parse(output);
    assert.equal(parsed.status, "ok");
    assert.equal(parsed.analytics.views, 1000);
  });

  it("returns CSV for csv format", () => {
    const output = formatPostAnalytics(postResult, { format: "csv" });
    const lines = output.split("\n");
    assert.ok(lines[0].includes("postId"));
    assert.ok(lines[1].includes("42"));
    assert.ok(lines[1].includes("Test Post"));
    assert.ok(lines[1].includes("1000"));
    assert.ok(lines[3].includes("referrerSource"));
    assert.ok(lines[4].includes("Twitter"));
  });

  it("returns table for table format", () => {
    const output = formatPostAnalytics(postResult, { format: "table" });
    assert.ok(output.includes("Post Analytics"));
    assert.ok(output.includes("42"));
    assert.ok(output.includes("Test Post"));
    assert.ok(output.includes("1000"));
    assert.ok(output.includes("65.0%"));
    assert.ok(output.includes("Twitter"));
    assert.ok(output.includes("Direct"));
  });

  it("falls back to JSON when status is not ok", () => {
    const notFound: PostAnalyticsResult = {
      status: "not-found",
      message: "Not available.",
    };
    const output = formatPostAnalytics(notFound, { format: "table" });
    const parsed = JSON.parse(output);
    assert.equal(parsed.status, "not-found");
  });

  it("falls back to JSON when analytics is undefined", () => {
    const empty: PostAnalyticsResult = {
      status: "ok",
      message: "No data.",
    };
    const output = formatPostAnalytics(empty, { format: "table" });
    const parsed = JSON.parse(output);
    assert.equal(parsed.status, "ok");
  });
});

describe("formatSubscriberGrowth", () => {
  it("returns JSON for json format", () => {
    const output = formatSubscriberGrowth(subscriberResult, { format: "json" });
    const parsed = JSON.parse(output);
    assert.equal(parsed.status, "ok");
    assert.equal(parsed.growth.totalSubscribers, 5000);
  });

  it("returns CSV for csv format", () => {
    const output = formatSubscriberGrowth(subscriberResult, { format: "csv" });
    const lines = output.split("\n");
    assert.ok(lines[0].includes("period"));
    assert.ok(lines[1].includes("2026-05"));
    assert.ok(lines[1].includes("5000"));
  });

  it("returns table for table format", () => {
    const output = formatSubscriberGrowth(subscriberResult, { format: "table" });
    assert.ok(output.includes("Subscriber Growth"));
    assert.ok(output.includes("5000"));
    assert.ok(output.includes("100"));
    assert.ok(output.includes("20"));
  });

  it("falls back to JSON on error status", () => {
    const err: SubscriberGrowthResult = {
      status: "forbidden",
      message: "Access denied.",
    };
    const output = formatSubscriberGrowth(err, { format: "csv" });
    const parsed = JSON.parse(output);
    assert.equal(parsed.status, "forbidden");
  });
});

describe("formatEmailPerformance", () => {
  it("returns JSON for json format", () => {
    const output = formatEmailPerformance(emailResult, { format: "json" });
    const parsed = JSON.parse(output);
    assert.equal(parsed.status, "ok");
    assert.equal(parsed.emails[0].title, "Newsletter #1");
  });

  it("returns CSV for csv format", () => {
    const output = formatEmailPerformance(emailResult, { format: "csv" });
    const lines = output.split("\n");
    assert.ok(lines[0].includes("postId"));
    assert.ok(lines[1].includes("1"));
    assert.ok(lines[1].includes("Newsletter #1"));
    assert.ok(lines[1].includes("0.408"));
  });

  it("returns table for table format", () => {
    const output = formatEmailPerformance(emailResult, { format: "table" });
    assert.ok(output.includes("Email Performance"));
    assert.ok(output.includes("Newsletter #1"));
    assert.ok(output.includes("40.8%"));
    assert.ok(output.includes("10.2%"));
    assert.ok(output.includes("5"));
  });

  it("handles empty email list", () => {
    const empty: EmailPerformanceResult = {
      status: "ok",
      emails: [],
      message: "No emails.",
    };
    const output = formatEmailPerformance(empty, { format: "table" });
    assert.ok(output.includes("No email performance data"));
  });
});

describe("formatRevenueAnalytics", () => {
  it("returns JSON for json format", () => {
    const output = formatRevenueAnalytics(revenueResult, { format: "json" });
    const parsed = JSON.parse(output);
    assert.equal(parsed.status, "ok");
    assert.equal(parsed.revenue.mrr, 5000);
  });

  it("returns CSV for csv format", () => {
    const output = formatRevenueAnalytics(revenueResult, { format: "csv" });
    const lines = output.split("\n");
    assert.ok(lines[0].includes("period"));
    assert.ok(lines[1].includes("2026-05"));
    assert.ok(lines[1].includes("5000"));
  });

  it("returns table for table format", () => {
    const output = formatRevenueAnalytics(revenueResult, { format: "table" });
    assert.ok(output.includes("Revenue Analytics"));
    assert.ok(output.includes("5000.00"));
    assert.ok(output.includes("25000.00"));
    assert.ok(output.includes("50"));
  });

  it("handles null monetary values", () => {
    const noMoney: RevenueAnalyticsResult = {
      status: "ok",
      revenue: {
        period: "2026-05",
        newPaidSubscribers: 0,
        churnedPaidSubscribers: 0,
        mrr: null,
        totalRevenue: null,
      },
      message: "Revenue data.",
    };
    const output = formatRevenueAnalytics(noMoney, { format: "table" });
    assert.ok(output.includes("N/A"));
    assert.ok(output.includes("0"));
  });
});
