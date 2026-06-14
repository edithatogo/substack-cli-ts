import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import type { AnalyticsInventoryResult } from "../substack-api/analytics.js";
import type { CampaignPlan } from "./campaign.js";

export interface CreatorAnalyticsSnapshot {
  schemaVersion: 1;
  capturedAt: string;
  postUrl?: string | undefined;
  postId?: number | undefined;
  campaignId?: string | undefined;
  analytics: AnalyticsInventoryResult | null;
  diagnostics: string[];
}

export function buildAnalyticsSnapshot(input: {
  postUrl?: string | undefined;
  postId?: number | undefined;
  campaignId?: string | undefined;
  analytics?: AnalyticsInventoryResult | null | undefined;
}): CreatorAnalyticsSnapshot {
  const diagnostics: string[] = [];
  if (input.postUrl && input.postId === undefined) {
    diagnostics.push("postUrl was recorded, but post-level analytics require a numeric postId.");
  }
  if (!input.analytics) {
    diagnostics.push("No live analytics were fetched; this is a planning/dry-run snapshot.");
  }

  return {
    schemaVersion: 1,
    capturedAt: new Date().toISOString(),
    postUrl: input.postUrl,
    postId: input.postId,
    campaignId: input.campaignId,
    analytics: input.analytics ?? null,
    diagnostics,
  };
}

export async function writeAnalyticsSnapshot(
  snapshot: CreatorAnalyticsSnapshot,
  outFile: string,
): Promise<CreatorAnalyticsSnapshot> {
  await mkdir(dirname(outFile), { recursive: true });
  await writeFile(outFile, `${JSON.stringify(snapshot, null, 2)}\n`, "utf8");
  return snapshot;
}

export async function buildAnalyticsTrend(snapshotsDir: string) {
  const snapshots = await readSnapshots(snapshotsDir);
  const sorted = snapshots.sort((a, b) => a.capturedAt.localeCompare(b.capturedAt));
  const first = sorted[0] ?? null;
  const latest = sorted.at(-1) ?? null;

  return {
    status: "ok",
    snapshotsDir,
    snapshotCount: sorted.length,
    firstCapturedAt: first?.capturedAt,
    latestCapturedAt: latest?.capturedAt,
    subscriberDelta: metricDelta(first, latest, subscriberTotal),
    viewDelta: metricDelta(first, latest, postViews),
    diagnostics: sorted.flatMap((snapshot) => snapshot.diagnostics),
  };
}

export async function buildGrowthReport(input: {
  campaign: CampaignPlan;
  snapshotsDir?: string | undefined;
}) {
  const trend = input.snapshotsDir ? await buildAnalyticsTrend(input.snapshotsDir) : null;
  return {
    status: "ok",
    campaignId: input.campaign.campaignId,
    postTitle: input.campaign.post.title,
    channelCount: input.campaign.channels.length,
    noteCount: input.campaign.notes.length,
    assetCount: input.campaign.assets.length,
    trend,
    recommendations: [
      "Capture analytics before publish, 24 hours after publish, and 7 days after publish.",
      "Compare Notes and social channel tracking URLs by UTM source.",
      "Use comments triage to identify follow-up posts and reader questions.",
    ],
  };
}

async function readSnapshots(dir: string): Promise<CreatorAnalyticsSnapshot[]> {
  let files: string[];
  try {
    files = (await readdir(dir)).filter(
      (file) => file.endsWith(".json") || file.endsWith(".jsonl"),
    );
  } catch {
    return [];
  }
  const snapshots: CreatorAnalyticsSnapshot[] = [];
  for (const file of files) {
    let text: string;
    try {
      text = await readFile(join(dir, file), "utf8");
    } catch {
      continue;
    }
    if (file.endsWith(".json")) {
      try {
        addSnapshotJson(JSON.parse(text), snapshots);
        continue;
      } catch {}
    }
    for (const line of text.split(/\r?\n/).filter(Boolean)) {
      try {
        const parsed = JSON.parse(line) as CreatorAnalyticsSnapshot;
        if (parsed.schemaVersion === 1 && parsed.capturedAt) snapshots.push(parsed);
      } catch {}
    }
  }
  return snapshots;
}

function addSnapshotJson(value: unknown, snapshots: CreatorAnalyticsSnapshot[]): void {
  if (Array.isArray(value)) {
    for (const item of value) addSnapshotJson(item, snapshots);
    return;
  }
  const parsed = value as Partial<CreatorAnalyticsSnapshot>;
  if (parsed.schemaVersion === 1 && typeof parsed.capturedAt === "string") {
    snapshots.push(parsed as CreatorAnalyticsSnapshot);
  }
}

function metricDelta(
  first: CreatorAnalyticsSnapshot | null,
  latest: CreatorAnalyticsSnapshot | null,
  getMetric: (snapshot: CreatorAnalyticsSnapshot) => number | null,
): number | null {
  if (!first || !latest) return null;
  const firstValue = getMetric(first);
  const latestValue = getMetric(latest);
  return firstValue === null || latestValue === null ? null : latestValue - firstValue;
}

function subscriberTotal(snapshot: CreatorAnalyticsSnapshot): number | null {
  return snapshot.analytics?.subscriberGrowth?.growth?.totalSubscribers ?? null;
}

function postViews(snapshot: CreatorAnalyticsSnapshot): number | null {
  return snapshot.analytics?.postAnalytics?.analytics?.views ?? null;
}
