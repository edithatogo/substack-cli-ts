import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "vitest";
import {
  buildAnalyticsSnapshot,
  buildAnalyticsTrend,
  buildGrowthReport,
  writeAnalyticsSnapshot,
} from "./growth.js";

describe("creator growth snapshots", () => {
  it("builds dry-run diagnostics when only a post URL is available", () => {
    const snapshot = buildAnalyticsSnapshot({
      postUrl: "https://example.substack.com/p/post",
    });

    assert.equal(snapshot.schemaVersion, 1);
    assert.equal(snapshot.analytics, null);
    assert.ok(snapshot.diagnostics.some((line) => line.includes("postId")));
  });

  it("summarizes subscriber and view deltas from snapshots", async () => {
    const temp = await mkdtemp(join(tmpdir(), "substack-growth-"));
    const first = buildAnalyticsSnapshot({
      postId: 1,
      analytics: analyticsInventory(10, 100),
    });
    const second = buildAnalyticsSnapshot({
      postId: 1,
      analytics: analyticsInventory(15, 175),
    });

    try {
      await writeFile(
        join(temp, "daily.jsonl"),
        `${JSON.stringify(first)}\n${JSON.stringify(second)}\n`,
      );
      const trend = await buildAnalyticsTrend(temp);
      assert.equal(trend.snapshotCount, 2);
      assert.equal(trend.subscriberDelta, 5);
      assert.equal(trend.viewDelta, 75);
    } finally {
      await rm(temp, { recursive: true, force: true });
    }
  });

  it("summarizes pretty JSON snapshot files", async () => {
    const temp = await mkdtemp(join(tmpdir(), "substack-growth-json-"));
    const snapshot = buildAnalyticsSnapshot({
      postId: 1,
      analytics: analyticsInventory(25, 250),
    });

    try {
      await writeFile(join(temp, "snapshot.json"), `${JSON.stringify(snapshot, null, 2)}\n`);
      const trend = await buildAnalyticsTrend(temp);
      assert.equal(trend.snapshotCount, 1);
      assert.equal(trend.subscriberDelta, 0);
      assert.equal(trend.viewDelta, 0);
    } finally {
      await rm(temp, { recursive: true, force: true });
    }
  });

  it("writes snapshots to nested paths and summarizes JSON arrays", async () => {
    const temp = await mkdtemp(join(tmpdir(), "substack-growth-array-"));
    const first = buildAnalyticsSnapshot({
      postId: 1,
      campaignId: "creator-os",
      analytics: analyticsInventory(25, 250),
    });
    const second = buildAnalyticsSnapshot({
      postId: 1,
      campaignId: "creator-os",
      analytics: analyticsInventory(30, 300),
    });

    try {
      await writeAnalyticsSnapshot(first, join(temp, "nested", "snapshot.json"));
      await writeFile(join(temp, "array.json"), JSON.stringify([first, second], null, 2));
      await writeFile(join(temp, "bad.jsonl"), "{bad-json\n");
      const trend = await buildAnalyticsTrend(temp);
      assert.equal(trend.snapshotCount, 2);
      assert.equal(trend.subscriberDelta, 5);
      assert.equal(trend.viewDelta, 50);
    } finally {
      await rm(temp, { recursive: true, force: true });
    }
  });

  it("summarizes empty trends and campaign growth reports", async () => {
    const temp = await mkdtemp(join(tmpdir(), "substack-growth-empty-"));
    try {
      const trend = await buildAnalyticsTrend(temp);
      assert.equal(trend.snapshotCount, 0);
      assert.equal(trend.subscriberDelta, null);
      assert.equal(trend.viewDelta, null);

      const report = await buildGrowthReport({
        campaign: {
          schemaVersion: 1,
          status: "ready",
          campaignId: "creator-os",
          createdAt: "2099-01-01T00:00:00Z",
          post: { filePath: "post.md", title: "Post" },
          notes: [
            {
              scheduledAt: "2099-01-01T01:00:00Z",
              postUrl: "https://e/p",
              text: "x",
              status: "planned",
            },
          ],
          channels: [
            { channel: "notes", plannedAction: "Schedule covering Notes around the post URL." },
          ],
          assets: [{ kind: "video", file: "video.mp4" }],
          utm: { source: "substack-cli", medium: "campaign", campaign: "creator-os" },
          issues: [],
          nextCommands: [],
        },
        snapshotsDir: temp,
      });
      assert.equal(report.channelCount, 1);
      assert.equal(report.trend?.snapshotCount, 0);
    } finally {
      await rm(temp, { recursive: true, force: true });
    }
  });

  it("treats missing snapshot directories as empty trends", async () => {
    const trend = await buildAnalyticsTrend(join(tmpdir(), "missing-substack-growth-dir"));
    assert.equal(trend.snapshotCount, 0);
    assert.equal(trend.subscriberDelta, null);
    assert.deepEqual(trend.diagnostics, []);
  });

  it("handles null analytics metrics and reports without snapshot directories", async () => {
    const temp = await mkdtemp(join(tmpdir(), "substack-growth-null-metrics-"));
    const missingMetrics = buildAnalyticsSnapshot({ postId: 1, analytics: null });
    const latest = buildAnalyticsSnapshot({
      postId: 1,
      analytics: analyticsInventory(15, 175),
    });

    try {
      await writeFile(
        join(temp, "mixed.json"),
        JSON.stringify([
          { schemaVersion: 2, capturedAt: "2099-01-01T00:00:00Z" },
          missingMetrics,
          latest,
        ]),
      );
      const trend = await buildAnalyticsTrend(temp);
      assert.equal(trend.snapshotCount, 2);
      assert.equal(trend.subscriberDelta, null);
      assert.equal(trend.viewDelta, null);

      const report = await buildGrowthReport({
        campaign: campaignPlan(),
      });
      assert.equal(report.trend, null);
    } finally {
      await rm(temp, { recursive: true, force: true });
    }
  });

  it("skips unreadable snapshot entries", async () => {
    const temp = await mkdtemp(join(tmpdir(), "substack-growth-unreadable-"));
    try {
      await mkdir(join(temp, "unreadable.json"));
      const trend = await buildAnalyticsTrend(temp);
      assert.equal(trend.snapshotCount, 0);
    } finally {
      await rm(temp, { recursive: true, force: true });
    }
  });
});

function analyticsInventory(totalSubscribers: number, views: number) {
  return {
    status: "ok" as const,
    endpoints: [],
    message: "ok",
    postAnalytics: {
      status: "ok" as const,
      message: "ok",
      analytics: {
        postId: 1,
        title: "Post",
        views,
        readRate: null,
        emailOpens: null,
        emailClicks: null,
        referrers: [],
      },
    },
    subscriberGrowth: {
      status: "ok" as const,
      message: "ok",
      growth: {
        period: "all",
        totalSubscribers,
        netChange: 0,
        freeSubscribers: totalSubscribers,
        paidSubscribers: 0,
        churned: 0,
      },
    },
    emailPerformance: null,
    revenue: null,
  };
}

function campaignPlan() {
  return {
    schemaVersion: 1 as const,
    status: "ready" as const,
    campaignId: "creator-os",
    createdAt: "2099-01-01T00:00:00Z",
    post: { filePath: "post.md", title: "Post" },
    notes: [],
    channels: [],
    assets: [],
    utm: { source: "substack-cli", medium: "campaign", campaign: "creator-os" },
    issues: [],
    nextCommands: [],
  };
}
