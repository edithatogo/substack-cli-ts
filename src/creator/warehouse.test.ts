import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "vitest";
import { buildAnalyticsSnapshot } from "./growth.js";
import { buildAttributionReport, buildWarehouseExport, writeWarehouseExport } from "./warehouse.js";

describe("creator warehouse exports", () => {
  it("normalizes campaigns, analytics probes, referrers, revenue, and run logs", async () => {
    const temp = await mkdtemp(join(tmpdir(), "substack-warehouse-"));
    try {
      const campaignFile = join(temp, "campaign.json");
      const analyticsDir = join(temp, "analytics");
      const runLogDir = join(temp, "run-log");
      await writeFile(campaignFile, JSON.stringify(campaignPlan(), null, 2));
      await mkdir(analyticsDir);
      await writeFile(
        join(analyticsDir, "snapshot.json"),
        JSON.stringify(
          buildAnalyticsSnapshot({
            postId: 7,
            campaignId: "creator-os",
            analytics: analyticsInventory(),
          }),
          null,
          2,
        ),
      );
      await mkdir(runLogDir);
      await writeFile(
        join(runLogDir, "run.json"),
        JSON.stringify({
          schemaVersion: 1,
          timestamp: "2099-01-01T00:00:00Z",
          actionType: "campaign.plan",
          status: "success",
          publicationUrl: "local",
          sourceFile: "post.md",
          title: "Post",
          campaignId: "creator-os",
          resultMessage: "ok",
        }),
      );
      await writeFile(
        join(runLogDir, "minimal.json"),
        JSON.stringify({
          schemaVersion: 1,
          timestamp: "2099-01-01T01:00:00Z",
          actionType: "analytics.snapshot",
          status: "success",
          publicationUrl: "local",
        }),
      );

      const warehouse = await buildWarehouseExport({
        campaignFiles: [campaignFile],
        analyticsDir,
        runLogDir,
      });
      assert.equal(warehouse.tables.campaigns.length, 1);
      assert.equal(warehouse.tables.notes.length, 1);
      assert.equal(warehouse.tables.referrers.length, 1);
      assert.equal(warehouse.tables.subscribers.length, 1);
      assert.equal(warehouse.tables.revenue.length, 1);
      assert.equal(warehouse.tables.run_logs.length, 2);

      const report = buildAttributionReport(warehouse);
      assert.equal(report.campaigns[0]?.campaignId, "creator-os");
      assert.equal(report.campaigns[0]?.views, 42);
      assert.equal(report.campaigns[0]?.revenue, 123);

      warehouse.tables.referrers.push({
        campaign_id: null,
        post_id: 999,
        source: "external",
        views: 50,
        captured_at: "2099-01-01T00:00:00Z",
      });
      const reportWithUnattributed = buildAttributionReport(warehouse);
      assert.equal(reportWithUnattributed.campaigns[0]?.campaignId, "unattributed");
      assert.equal(reportWithUnattributed.campaigns[0]?.referrals, 1);

      const written = await writeWarehouseExport(warehouse, join(temp, "out"), "both");
      assert.ok(written.files.some((file) => file.endsWith("warehouse.json")));
      assert.match(await readFile(join(temp, "out", "referrers.csv"), "utf8"), /reader/);
    } finally {
      await rm(temp, { recursive: true, force: true });
    }
  });

  it("records diagnostics and still writes empty or escaped tables", async () => {
    const temp = await mkdtemp(join(tmpdir(), "substack-warehouse-diagnostics-"));
    try {
      const campaignFile = join(temp, "bad-campaign.json");
      const analyticsDir = join(temp, "analytics");
      await writeFile(campaignFile, "{");
      await mkdir(analyticsDir);
      await writeFile(
        join(analyticsDir, "snapshots.jsonl"),
        `  \n ${JSON.stringify([
          buildAnalyticsSnapshot({
            campaignId: "quoted,campaign",
            analytics: analyticsInventory(),
          }),
        ])}\n\t\n`,
      );
      await writeFile(join(analyticsDir, "bad.json"), "{");

      const warehouse = await buildWarehouseExport({
        campaignFiles: [campaignFile, join(temp, "missing.json")],
        analyticsDir: join(temp, "missing-analytics"),
        runLogDir: join(temp, "missing-runlogs"),
      });

      assert.ok(
        warehouse.diagnostics.some((diagnostic) => diagnostic.startsWith("json-parse-failed")),
      );
      assert.ok(
        warehouse.diagnostics.some((diagnostic) => diagnostic.startsWith("file-unreadable")),
      );
      assert.ok(
        warehouse.diagnostics.some((diagnostic) => diagnostic.startsWith("run-log-dir-unreadable")),
      );

      const parsedWarehouse = await buildWarehouseExport({
        campaignFiles: [],
        analyticsDir,
      });
      assert.ok(
        warehouse.diagnostics.some((diagnostic) =>
          diagnostic.startsWith("analytics-dir-unreadable"),
        ),
      );
      assert.ok(
        parsedWarehouse.diagnostics.some((diagnostic) =>
          diagnostic.startsWith("analytics-snapshot-parse-failed"),
        ),
      );
      assert.equal(parsedWarehouse.tables.referrers[0]?.campaign_id, "quoted,campaign");

      const written = await writeWarehouseExport(parsedWarehouse, join(temp, "csv-only"), "csv");
      assert.ok(written.files.every((file) => file.endsWith(".csv")));
      assert.match(
        await readFile(join(temp, "csv-only", "referrers.csv"), "utf8"),
        /"quoted,campaign"/,
      );

      const empty = await writeWarehouseExport(
        {
          ...warehouse,
          tables: {
            campaigns: [],
            posts: [],
            notes: [],
            referrers: [],
            subscribers: [],
            revenue: [],
            run_logs: [],
          },
        },
        join(temp, "empty"),
        "csv",
      );
      assert.ok(empty.files.some((file) => file.endsWith("campaigns.csv")));
      assert.equal(await readFile(join(temp, "empty", "campaigns.csv"), "utf8"), "\n");
    } finally {
      await rm(temp, { recursive: true, force: true });
    }
  });

  it("sorts attribution ties by campaign id", () => {
    const warehouse = {
      schemaVersion: 1 as const,
      generatedAt: "2099-01-01T00:00:00Z",
      source: { campaignFiles: [] },
      diagnostics: [],
      tables: {
        campaigns: [{ campaign_id: "z-campaign" }, { campaign_id: "a-campaign" }],
        posts: [],
        notes: [],
        referrers: [],
        subscribers: [],
        revenue: [],
        run_logs: [],
      },
    };

    const report = buildAttributionReport(warehouse);

    assert.deepEqual(
      report.campaigns.map((campaign) => campaign.campaignId),
      ["a-campaign", "z-campaign"],
    );
  });

  it("handles empty inputs and sparse campaign plans", async () => {
    const temp = await mkdtemp(join(tmpdir(), "substack-warehouse-sparse-"));
    try {
      const sparseCampaignFile = join(temp, "sparse-campaign.json");
      await writeFile(
        sparseCampaignFile,
        JSON.stringify({
          ...campaignPlan(),
          publishAt: undefined,
          post: {
            filePath: "post.md",
            title: "Post",
          },
        }),
      );

      const empty = await buildWarehouseExport({});
      const sparse = await buildWarehouseExport({ campaignFiles: [sparseCampaignFile] });

      assert.equal(empty.source.analyticsDir, undefined);
      assert.equal(empty.tables.campaigns.length, 0);
      assert.equal(sparse.tables.campaigns[0]?.publish_at, null);
      assert.equal(sparse.tables.posts[0]?.slug, null);
      assert.equal(sparse.tables.posts[0]?.planned_url, null);
    } finally {
      await rm(temp, { recursive: true, force: true });
    }
  });

  it("handles analytics snapshots with unavailable sub-results", async () => {
    const temp = await mkdtemp(join(tmpdir(), "substack-warehouse-null-analytics-"));
    try {
      const analyticsDir = join(temp, "analytics");
      await mkdir(analyticsDir);
      await writeFile(
        join(analyticsDir, "snapshot.json"),
        JSON.stringify({
          schemaVersion: 1,
          capturedAt: "2099-01-01T00:00:00Z",
          campaignId: null,
          analytics: {
            status: "ok",
            endpoints: [],
            message: "partial",
            postAnalytics: { status: "blocked", message: "missing", analytics: null },
            subscriberGrowth: { status: "blocked", message: "missing", growth: null },
            emailPerformance: null,
            revenue: { status: "blocked", message: "missing", revenue: null },
          },
        }),
      );

      const warehouse = await buildWarehouseExport({ analyticsDir });

      assert.equal(warehouse.tables.posts.length, 0);
      assert.equal(warehouse.tables.referrers.length, 0);
      assert.equal(warehouse.tables.subscribers.length, 0);
      assert.equal(warehouse.tables.revenue.length, 0);
    } finally {
      await rm(temp, { recursive: true, force: true });
    }
  });
});

function campaignPlan() {
  return {
    schemaVersion: 1,
    status: "ready",
    campaignId: "creator-os",
    createdAt: "2099-01-01T00:00:00Z",
    post: {
      filePath: "post.md",
      title: "Post",
      slug: "post",
      plannedUrl: "https://example.substack.com/p/post",
    },
    publishAt: "2099-01-02T00:00:00Z",
    notes: [
      {
        scheduledAt: "2099-01-02T01:00:00Z",
        postUrl: "https://example.substack.com/p/post",
        text: "New post https://example.substack.com/p/post",
        status: "planned",
      },
    ],
    channels: [{ channel: "notes", plannedAction: "Schedule covering Notes around the post URL." }],
    assets: [],
    utm: { source: "substack-cli", medium: "campaign", campaign: "creator-os" },
    issues: [],
    nextCommands: [],
  };
}

function analyticsInventory() {
  return {
    status: "ok" as const,
    endpoints: [],
    message: "ok",
    postAnalytics: {
      status: "ok" as const,
      message: "ok",
      analytics: {
        postId: 7,
        title: "Post",
        views: 100,
        readRate: 0.6,
        emailOpens: 80,
        emailClicks: 20,
        referrers: [{ source: "reader", views: 42 }],
      },
    },
    subscriberGrowth: {
      status: "ok" as const,
      message: "ok",
      growth: {
        period: "week",
        totalSubscribers: 1000,
        netChange: 50,
        freeSubscribers: 900,
        paidSubscribers: 100,
        churned: 2,
      },
    },
    emailPerformance: null,
    revenue: {
      status: "ok" as const,
      message: "ok",
      revenue: {
        period: "week",
        newPaidSubscribers: 5,
        churnedPaidSubscribers: 1,
        mrr: 456,
        totalRevenue: 123,
      },
    },
  };
}
