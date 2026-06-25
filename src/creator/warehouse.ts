import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { RunLogArtifact } from "../publish/run-log.js";
import type { AnalyticsInventoryResult } from "../substack-api/analytics.js";
import type { CampaignPlan } from "./campaign.js";
import type { CreatorAnalyticsSnapshot } from "./growth.js";

export type WarehouseTableName =
  | "campaigns"
  | "posts"
  | "notes"
  | "referrers"
  | "subscribers"
  | "revenue"
  | "run_logs";

export interface WarehouseExport {
  schemaVersion: 1;
  generatedAt: string;
  source: {
    campaignFiles: string[];
    analyticsDir?: string | undefined;
    runLogDir?: string | undefined;
  };
  tables: Record<WarehouseTableName, Array<Record<string, string | number | boolean | null>>>;
  diagnostics: string[];
}

export async function buildWarehouseExport(input: {
  campaignFiles?: string[] | undefined;
  analyticsDir?: string | undefined;
  runLogDir?: string | undefined;
}): Promise<WarehouseExport> {
  const diagnostics: string[] = [];
  const tables = emptyTables();

  for (const file of input.campaignFiles ?? []) {
    const plan = await readJson<CampaignPlan>(file, diagnostics);
    if (!plan) continue;
    tables.campaigns.push({
      campaign_id: plan.campaignId,
      status: plan.status,
      created_at: plan.createdAt,
      publish_at: plan.publishAt ?? null,
      channel_count: plan.channels.length,
      note_count: plan.notes.length,
      asset_count: plan.assets.length,
      issue_count: plan.issues.length,
      source_file: file,
    });
    tables.posts.push({
      campaign_id: plan.campaignId,
      file_path: plan.post.filePath,
      title: plan.post.title,
      slug: plan.post.slug ?? null,
      planned_url: plan.post.plannedUrl ?? null,
      canonical_url: plan.post.canonicalUrl ?? null,
      seo_title: plan.post.seoTitle ?? null,
      seo_description: plan.post.seoDescription ?? null,
    });
    for (const note of plan.notes) {
      tables.notes.push({
        campaign_id: plan.campaignId,
        scheduled_at: note.scheduledAt,
        post_url: note.postUrl,
        text_length: note.text.length,
        status: note.status,
      });
    }
  }

  for (const snapshot of await readAnalyticsSnapshots(input.analyticsDir, diagnostics)) {
    addAnalyticsRows(snapshot, tables);
  }

  for (const runLog of await readRunLogs(input.runLogDir, diagnostics)) {
    tables.run_logs.push({
      timestamp: runLog.timestamp,
      action_type: runLog.actionType,
      status: runLog.status,
      publication_url: runLog.publicationUrl,
      source_file: runLog.sourceFile ?? null,
      title: runLog.title ?? null,
      campaign_id: runLog.campaignId ?? null,
      scheduled_time_requested: runLog.scheduledTimeRequested ?? null,
      result_message: runLog.resultMessage ?? null,
    });
  }

  return {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    source: {
      campaignFiles: input.campaignFiles ?? [],
      analyticsDir: input.analyticsDir,
      runLogDir: input.runLogDir,
    },
    tables,
    diagnostics,
  };
}

export async function writeWarehouseExport(
  warehouse: WarehouseExport,
  outDir: string,
  format: "json" | "csv" | "both",
): Promise<{ outputDir: string; files: string[] }> {
  await mkdir(outDir, { recursive: true });
  const files: string[] = [];
  if (format === "json" || format === "both") {
    const file = join(outDir, "warehouse.json");
    await writeFile(file, `${JSON.stringify(warehouse, null, 2)}\n`, "utf8");
    files.push(file);
  }
  if (format === "csv" || format === "both") {
    for (const [name, rows] of Object.entries(warehouse.tables)) {
      const file = join(outDir, `${name}.csv`);
      await writeFile(file, renderCsv(rows), "utf8");
      files.push(file);
    }
  }
  return { outputDir: outDir, files };
}

export function buildAttributionReport(warehouse: WarehouseExport) {
  const byCampaign: Record<string, { views: number; referrals: number; revenue: number }> = {};
  for (const campaign of warehouse.tables.campaigns) {
    const id = String(campaign.campaign_id);
    byCampaign[id] ??= { views: 0, referrals: 0, revenue: 0 };
  }
  for (const referrer of warehouse.tables.referrers) {
    const id = String(referrer.campaign_id ?? "unattributed");
    byCampaign[id] ??= { views: 0, referrals: 0, revenue: 0 };
    byCampaign[id].views += Number(referrer.views ?? 0);
    byCampaign[id].referrals += 1;
  }
  for (const revenue of warehouse.tables.revenue) {
    const id = String(revenue.campaign_id ?? "unattributed");
    byCampaign[id] ??= { views: 0, referrals: 0, revenue: 0 };
    byCampaign[id].revenue += Number(revenue.total_revenue ?? 0);
  }

  return {
    status: "ok",
    generatedAt: new Date().toISOString(),
    campaignCount: Object.keys(byCampaign).length,
    campaigns: Object.entries(byCampaign)
      .map(([campaignId, metrics]) => ({ campaignId, ...metrics }))
      .sort((a, b) => b.views - a.views || a.campaignId.localeCompare(b.campaignId)),
  };
}

export function buildFunnelReport(warehouse: WarehouseExport) {
  const byCampaign: Record<
    string,
    {
      plannedPosts: number;
      observedPosts: number;
      scheduledNotes: number;
      successfulRunLogs: number;
      views: number;
      readRateTotal: number;
      readRateSamples: number;
      emailOpens: number;
      emailClicks: number;
      subscriberNetChange: number;
      revenue: number;
    }
  > = {};

  for (const campaign of warehouse.tables.campaigns) {
    funnelMetricsFor(byCampaign, campaign.campaign_id);
  }
  for (const post of warehouse.tables.posts) {
    const metrics = funnelMetricsFor(byCampaign, post.campaign_id);
    if (typeof post.file_path === "string") metrics.plannedPosts += 1;
    if (post.post_id !== null && post.post_id !== undefined) metrics.observedPosts += 1;
    metrics.views += numeric(post.views);
    metrics.emailOpens += numeric(post.email_opens);
    metrics.emailClicks += numeric(post.email_clicks);
    const readRate = optionalNumeric(post.read_rate);
    if (readRate !== null) {
      metrics.readRateTotal += readRate;
      metrics.readRateSamples += 1;
    }
  }
  for (const note of warehouse.tables.notes) {
    const metrics = funnelMetricsFor(byCampaign, note.campaign_id);
    metrics.scheduledNotes += 1;
  }
  for (const runLog of warehouse.tables.run_logs) {
    const metrics = funnelMetricsFor(byCampaign, runLog.campaign_id);
    if (runLog.status === "success") metrics.successfulRunLogs += 1;
  }
  for (const subscribers of warehouse.tables.subscribers) {
    const metrics = funnelMetricsFor(byCampaign, subscribers.campaign_id);
    metrics.subscriberNetChange += numeric(subscribers.net_change);
  }
  for (const revenue of warehouse.tables.revenue) {
    const metrics = funnelMetricsFor(byCampaign, revenue.campaign_id);
    metrics.revenue += numeric(revenue.total_revenue);
  }

  return {
    status: "ok",
    generatedAt: new Date().toISOString(),
    campaignCount: Object.keys(byCampaign).length,
    campaigns: Object.entries(byCampaign)
      .map(([id, metrics]) => ({
        campaignId: id,
        plannedPosts: metrics.plannedPosts,
        observedPosts: metrics.observedPosts,
        scheduledNotes: metrics.scheduledNotes,
        successfulRunLogs: metrics.successfulRunLogs,
        views: metrics.views,
        averageReadRate:
          metrics.readRateSamples === 0 ? null : metrics.readRateTotal / metrics.readRateSamples,
        emailOpens: metrics.emailOpens,
        emailClicks: metrics.emailClicks,
        clickThroughRate:
          metrics.emailOpens === 0 ? null : metrics.emailClicks / metrics.emailOpens,
        subscriberNetChange: metrics.subscriberNetChange,
        revenue: metrics.revenue,
      }))
      .sort(
        (a, b) =>
          b.views - a.views || b.revenue - a.revenue || a.campaignId.localeCompare(b.campaignId),
      ),
  };
}

function emptyTables(): WarehouseExport["tables"] {
  return {
    campaigns: [],
    posts: [],
    notes: [],
    referrers: [],
    subscribers: [],
    revenue: [],
    run_logs: [],
  };
}

function campaignId(value: unknown): string {
  return value === null || value === undefined || value === "" ? "unattributed" : String(value);
}

function funnelMetricsFor(
  byCampaign: Record<string, ReturnType<typeof emptyFunnelMetrics>>,
  rawCampaignId: unknown,
): ReturnType<typeof emptyFunnelMetrics> {
  const id = campaignId(rawCampaignId);
  byCampaign[id] ??= emptyFunnelMetrics();
  return byCampaign[id];
}

function emptyFunnelMetrics() {
  return {
    plannedPosts: 0,
    observedPosts: 0,
    scheduledNotes: 0,
    successfulRunLogs: 0,
    views: 0,
    readRateTotal: 0,
    readRateSamples: 0,
    emailOpens: 0,
    emailClicks: 0,
    subscriberNetChange: 0,
    revenue: 0,
  };
}

function numeric(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function optionalNumeric(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

async function readAnalyticsSnapshots(
  dir: string | undefined,
  diagnostics: string[],
): Promise<CreatorAnalyticsSnapshot[]> {
  if (!dir) return [];
  let files: string[];
  try {
    files = (await readdir(dir)).filter(
      (file) => file.endsWith(".json") || file.endsWith(".jsonl"),
    );
  } catch (error) {
    diagnostics.push(`analytics-dir-unreadable: ${message(error)}`);
    return [];
  }
  const snapshots: CreatorAnalyticsSnapshot[] = [];
  for (const file of files) {
    const text = await readText(join(dir, file), diagnostics);
    if (!text) continue;
    try {
      if (file.endsWith(".jsonl")) {
        for (const line of text
          .split(/\r?\n/)
          .map((entry) => entry.trim())
          .filter(Boolean)) {
          addSnapshot(JSON.parse(line), snapshots);
        }
      } else {
        addSnapshot(JSON.parse(text), snapshots);
      }
    } catch (error) {
      diagnostics.push(`analytics-snapshot-parse-failed: ${join(dir, file)}: ${message(error)}`);
    }
  }
  return snapshots;
}

async function readRunLogs(
  dir: string | undefined,
  diagnostics: string[],
): Promise<RunLogArtifact[]> {
  if (!dir) return [];
  let files: string[];
  try {
    files = (await readdir(dir)).filter((file) => file.endsWith(".json"));
  } catch (error) {
    diagnostics.push(`run-log-dir-unreadable: ${message(error)}`);
    return [];
  }
  const runLogs: RunLogArtifact[] = [];
  for (const file of files) {
    const artifact = await readJson<RunLogArtifact>(join(dir, file), diagnostics);
    if (artifact?.schemaVersion === 1) runLogs.push(artifact);
  }
  return runLogs;
}

function addAnalyticsRows(
  snapshot: CreatorAnalyticsSnapshot,
  tables: WarehouseExport["tables"],
): void {
  const campaignId = snapshot.campaignId ?? null;
  const analytics: AnalyticsInventoryResult | null = snapshot.analytics;
  const post = analytics?.postAnalytics?.analytics;
  if (post) {
    tables.posts.push({
      campaign_id: campaignId,
      post_id: post.postId,
      title: post.title,
      views: post.views,
      read_rate: post.readRate,
      email_opens: post.emailOpens,
      email_clicks: post.emailClicks,
      captured_at: snapshot.capturedAt,
    });
    for (const referrer of post.referrers) {
      tables.referrers.push({
        campaign_id: campaignId,
        post_id: post.postId,
        source: referrer.source,
        views: referrer.views,
        captured_at: snapshot.capturedAt,
      });
    }
  }
  const subscribers = analytics?.subscriberGrowth?.growth;
  if (subscribers) {
    tables.subscribers.push({
      campaign_id: campaignId,
      captured_at: snapshot.capturedAt,
      period: subscribers.period,
      total_subscribers: subscribers.totalSubscribers,
      net_change: subscribers.netChange,
      free_subscribers: subscribers.freeSubscribers,
      paid_subscribers: subscribers.paidSubscribers,
      churned: subscribers.churned,
    });
  }
  const revenue = analytics?.revenue?.revenue;
  if (revenue) {
    tables.revenue.push({
      campaign_id: campaignId,
      captured_at: snapshot.capturedAt,
      period: revenue.period,
      new_paid_subscribers: revenue.newPaidSubscribers,
      churned_paid_subscribers: revenue.churnedPaidSubscribers,
      mrr: revenue.mrr,
      total_revenue: revenue.totalRevenue,
    });
  }
}

function addSnapshot(value: unknown, snapshots: CreatorAnalyticsSnapshot[]): void {
  if (Array.isArray(value)) {
    for (const item of value) addSnapshot(item, snapshots);
    return;
  }
  const snapshot = value as Partial<CreatorAnalyticsSnapshot>;
  if (snapshot.schemaVersion === 1 && typeof snapshot.capturedAt === "string") {
    snapshots.push(snapshot as CreatorAnalyticsSnapshot);
  }
}

async function readJson<T>(file: string, diagnostics: string[]): Promise<T | null> {
  const text = await readText(file, diagnostics);
  if (!text) return null;
  try {
    return JSON.parse(text) as T;
  } catch (error) {
    diagnostics.push(`json-parse-failed: ${file}: ${message(error)}`);
    return null;
  }
}

async function readText(file: string, diagnostics: string[]): Promise<string | null> {
  try {
    return await readFile(file, "utf8");
  } catch (error) {
    diagnostics.push(`file-unreadable: ${file}: ${message(error)}`);
    return null;
  }
}

function renderCsv(rows: Array<Record<string, string | number | boolean | null>>): string {
  const columns = Array.from(new Set(rows.flatMap((row) => Object.keys(row)))).sort();
  if (columns.length === 0) return "\n";
  return `${columns.join(",")}\n${rows
    .map((row) => columns.map((column) => csvCell(row[column])).join(","))
    .join("\n")}\n`;
}

function csvCell(value: string | number | boolean | null | undefined): string {
  if (value === null || value === undefined) return "";
  const text = String(value);
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function message(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
