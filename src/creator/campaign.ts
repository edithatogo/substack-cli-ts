import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import type { PreparedPost } from "../types.js";
import { resolvePostTitle } from "../publish/title.js";
import type { RunLogArtifact } from "../publish/run-log.js";

export type CampaignChannel = "notes" | "linkedin" | "x" | "youtube";
export type CampaignStatus = "ready" | "blocked";

export interface CampaignUtm {
  source: string;
  medium: string;
  campaign: string;
}

export interface CampaignNotePlan {
  scheduledAt: string;
  postUrl: string;
  text: string;
  status: "planned";
}

export interface CampaignAssetPlan {
  kind: "video" | "audio" | "transcript" | "thumbnail" | "socialImage";
  file: string;
}

export interface CampaignChannelPlan {
  channel: CampaignChannel;
  trackingUrl?: string | undefined;
  plannedAction: string;
}

export interface CampaignIssue {
  code: string;
  severity: "error" | "warning";
  message: string;
}

export interface CampaignPlan {
  schemaVersion: 1;
  status: CampaignStatus;
  campaignId: string;
  createdAt: string;
  publicationUrl?: string | undefined;
  post: {
    filePath: string;
    title: string;
    slug?: string | undefined;
    plannedUrl?: string | undefined;
    seoTitle?: string | undefined;
    seoDescription?: string | undefined;
    canonicalUrl?: string | undefined;
  };
  publishAt?: string | undefined;
  notes: CampaignNotePlan[];
  channels: CampaignChannelPlan[];
  assets: CampaignAssetPlan[];
  utm: CampaignUtm;
  runLogDir?: string | undefined;
  issues: CampaignIssue[];
  nextCommands: string[];
}

export interface BuildCampaignPlanOptions {
  publicationUrl?: string | undefined;
  publishAt?: string | undefined;
  noteAt?: string[] | undefined;
  channels?: string[] | undefined;
  runLogDir?: string | undefined;
}

const CHANNELS = new Set<CampaignChannel>(["notes", "linkedin", "x", "youtube"]);

export function parseCampaignChannels(value: string | string[] | undefined): string[] {
  if (!value) return ["notes"];
  const raw = Array.isArray(value) ? value.join(",") : value;
  return raw
    .split(",")
    .map((part) => part.trim().toLowerCase())
    .filter(Boolean);
}

export function collectCampaignOption(value: string, previous: string[] = []): string[] {
  return [...previous, value];
}

export function buildCampaignPlan(
  prepared: PreparedPost,
  options: BuildCampaignPlanOptions = {},
): CampaignPlan {
  const title = resolvePostTitle(prepared.post);
  const metadata = prepared.post.metadata;
  const issues: CampaignIssue[] = [];
  const slug = metadata.slug ?? slugify(title);
  const plannedUrl = metadata.canonicalUrl
    ? safeUrl(metadata.canonicalUrl, "canonical-url-invalid", issues)
    : plannedPostUrl(options.publicationUrl, slug, issues);
  const campaignId = metadata.campaign ?? slug ?? safeId(title);
  const channels = parseCampaignChannels(options.channels);
  const utm = parseUtm(metadata.utm, campaignId);
  const assets = buildAssetPlans(metadata);

  if (!title.trim()) {
    issues.push({
      code: "title-required",
      severity: "error",
      message: "Campaign post needs a title.",
    });
  }
  if (options.publishAt && !isValidFutureTimestamp(options.publishAt)) {
    issues.push({
      code: "publish-at-invalid",
      severity: "error",
      message: "publishAt must be a valid future timestamp.",
    });
  }

  const channelPlans: CampaignChannelPlan[] = channels.map((channel) => {
    if (!CHANNELS.has(channel as CampaignChannel)) {
      issues.push({
        code: "channel-unsupported",
        severity: "error",
        message: `Unsupported channel "${channel}". Use notes, linkedin, x, or youtube.`,
      });
    }
    return {
      channel: channel as CampaignChannel,
      trackingUrl: plannedUrl ? buildUtmUrl(plannedUrl, { ...utm, source: channel }) : undefined,
      plannedAction: plannedActionForChannel(channel),
    };
  });

  const notes = (options.noteAt ?? []).map((scheduledAt) => ({
    scheduledAt,
    postUrl: plannedUrl ?? "",
    text: plannedUrl
      ? `New post: ${title} ${plannedUrl}`
      : `New post: ${title}. Add the post URL before scheduling this note.`,
    status: "planned" as const,
  }));
  validateNoteSchedule(notes, options.publishAt, issues);

  if (notes.length > 0 && !plannedUrl) {
    issues.push({
      code: "note-post-url-missing",
      severity: "error",
      message:
        "Scheduled campaign notes need a canonicalUrl, slug plus publication URL, or explicit post URL.",
    });
  }

  const errorCount = issues.filter((issue) => issue.severity === "error").length;
  const plan: CampaignPlan = {
    schemaVersion: 1,
    status: errorCount > 0 ? "blocked" : "ready",
    campaignId,
    createdAt: new Date().toISOString(),
    publicationUrl: options.publicationUrl,
    post: {
      filePath: prepared.post.filePath,
      title,
      slug,
      plannedUrl,
      seoTitle: metadata.seoTitle,
      seoDescription: metadata.seoDescription,
      canonicalUrl: metadata.canonicalUrl,
    },
    publishAt: options.publishAt,
    notes,
    channels: channelPlans,
    assets,
    utm,
    runLogDir: options.runLogDir,
    issues,
    nextCommands: [],
  };

  plan.nextCommands = buildNextCommands(plan);
  return plan;
}

export function validateCampaignPlan(plan: CampaignPlan): CampaignPlan {
  const issues: CampaignIssue[] = [];
  if (plan.schemaVersion !== 1) {
    issues.push({
      code: "schema-version",
      severity: "error",
      message: "Campaign plan schemaVersion must be 1.",
    });
  }
  if (!plan.post?.filePath) {
    issues.push({
      code: "post-file-required",
      severity: "error",
      message: "Campaign plan needs post.filePath.",
    });
  }
  if (!plan.post?.title) {
    issues.push({
      code: "post-title-required",
      severity: "error",
      message: "Campaign plan needs post.title.",
    });
  }
  if (plan.publishAt && !isValidFutureTimestamp(plan.publishAt)) {
    issues.push({
      code: "publish-at-invalid",
      severity: "error",
      message: "publishAt must be a valid future timestamp.",
    });
  }
  const channels = Array.isArray(plan.channels) ? plan.channels : [];
  if (!Array.isArray(plan.channels)) {
    issues.push({
      code: "channels-required",
      severity: "error",
      message: "Campaign plan needs channels[].",
    });
  }
  for (const channel of channels) {
    if (!CHANNELS.has(channel.channel)) {
      issues.push({
        code: "channel-unsupported",
        severity: "error",
        message: `Unsupported channel "${channel.channel}".`,
      });
    }
  }
  const notes = Array.isArray(plan.notes) ? plan.notes : [];
  if (!Array.isArray(plan.notes)) {
    issues.push({
      code: "notes-required",
      severity: "error",
      message: "Campaign plan needs notes[].",
    });
  }
  if (notes.some((note) => !note.postUrl)) {
    issues.push({
      code: "note-post-url-missing",
      severity: "error",
      message: "Scheduled campaign notes need a postUrl before validation or execution.",
    });
  }
  validateNoteSchedule(notes, plan.publishAt, issues);
  const status = issues.some((issue) => issue.severity === "error") ? "blocked" : "ready";

  return {
    ...plan,
    status,
    issues,
    notes,
    channels,
    nextCommands: buildNextCommands({ ...plan, status, issues, notes, channels }),
  };
}

export async function readCampaignPlan(file: string): Promise<CampaignPlan> {
  try {
    const parsed = JSON.parse(await readFile(file, "utf8")) as CampaignPlan;
    return validateCampaignPlan(parsed);
  } catch (error) {
    return blockedCampaignPlan(
      file,
      "plan-read-failed",
      `Failed to read campaign plan from ${file}: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

export function buildCampaignExecutionReport(plan: CampaignPlan, confirmed: boolean) {
  const validated = validateCampaignPlan(plan);
  if (!confirmed) {
    return {
      status: "blocked",
      operation: "campaign.execute",
      message: "Add --yes to confirm campaign execution readiness.",
      plan: validated,
    };
  }
  if (validated.status === "blocked") {
    return {
      status: "blocked",
      operation: "campaign.execute",
      message: "Campaign plan is blocked; fix issues before execution.",
      plan: validated,
    };
  }

  return {
    status: "ready",
    operation: "campaign.execute",
    message: "Campaign is execution-ready. Run the listed commands for live Substack mutations.",
    nextCommands: validated.nextCommands,
    plan: validated,
  };
}

export async function buildCampaignRunLogReport(runLogDir: string) {
  let files: string[];
  try {
    files = (await readdir(runLogDir)).filter((file) => file.endsWith(".json")).sort();
  } catch (error) {
    return {
      status: "ok",
      runLogDir,
      artifactCount: 0,
      byAction: {},
      latest: null,
      message: `No readable campaign run logs found: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
  const artifacts: RunLogArtifact[] = [];
  for (const file of files) {
    try {
      artifacts.push(JSON.parse(await readFile(join(runLogDir, file), "utf8")) as RunLogArtifact);
    } catch {}
  }
  const byAction: Record<string, number> = {};
  for (const artifact of artifacts) {
    byAction[artifact.actionType] = (byAction[artifact.actionType] ?? 0) + 1;
  }
  return {
    status: "ok",
    runLogDir,
    artifactCount: artifacts.length,
    byAction,
    latest: artifacts.at(-1) ?? null,
    message: `Read ${artifacts.length} campaign run-log artifact${artifacts.length === 1 ? "" : "s"}.`,
  };
}

function validateNoteSchedule(
  notes: CampaignNotePlan[],
  publishAt: string | undefined,
  issues: CampaignIssue[],
): void {
  const seen = new Set<string>();
  const publishTime = publishAt ? Date.parse(publishAt) : Number.NaN;
  for (const note of notes) {
    const noteTime = Date.parse(note.scheduledAt);
    if (!isValidFutureTimestamp(note.scheduledAt)) {
      issues.push({
        code: "note-at-invalid",
        severity: "error",
        message: `Note timestamp "${note.scheduledAt}" must be a valid future timestamp.`,
      });
    }
    if (seen.has(note.scheduledAt)) {
      issues.push({
        code: "schedule-collision",
        severity: "error",
        message: `Multiple campaign actions use ${note.scheduledAt}.`,
      });
    }
    seen.add(note.scheduledAt);
    if (!Number.isNaN(publishTime) && !Number.isNaN(noteTime) && noteTime < publishTime) {
      issues.push({
        code: "note-before-publish",
        severity: "error",
        message: `Note ${note.scheduledAt} is scheduled before publishAt ${publishAt}.`,
      });
    }
  }
}

function buildAssetPlans(metadata: PreparedPost["post"]["metadata"]): CampaignAssetPlan[] {
  return [
    metadata.video ? { kind: "video" as const, file: metadata.video } : null,
    metadata.audio ? { kind: "audio" as const, file: metadata.audio } : null,
    metadata.transcript ? { kind: "transcript" as const, file: metadata.transcript } : null,
    metadata.thumbnail ? { kind: "thumbnail" as const, file: metadata.thumbnail } : null,
    metadata.socialImage ? { kind: "socialImage" as const, file: metadata.socialImage } : null,
  ].filter((asset): asset is CampaignAssetPlan => Boolean(asset));
}

function buildNextCommands(plan: CampaignPlan): string[] {
  const commands = [
    `substack-cli preflight ${shellQuote(plan.post.filePath)} --mode ${plan.publishAt ? "schedule" : "publish"}${plan.publishAt ? ` --at ${shellQuote(plan.publishAt)}` : ""}`,
  ];
  if (plan.publishAt) {
    commands.push(
      `substack-cli schedule ${shellQuote(plan.post.filePath)} --at ${shellQuote(plan.publishAt)} --yes${plan.runLogDir ? ` --run-log-dir ${shellQuote(plan.runLogDir)}` : ""}`,
    );
  } else {
    commands.push(
      `substack-cli publish ${shellQuote(plan.post.filePath)} --yes${plan.runLogDir ? ` --run-log-dir ${shellQuote(plan.runLogDir)}` : ""}`,
    );
  }
  if (plan.notes.length > 0) {
    commands.push("substack-cli note batch --schedule-file notes.json --dry-run");
  }
  return commands;
}

function plannedActionForChannel(channel: string): string {
  if (channel === "notes") return "Schedule covering Notes around the post URL.";
  if (channel === "linkedin") return "Prepare a LinkedIn post using the tracking URL.";
  if (channel === "x") return "Prepare an X thread or post using the tracking URL.";
  if (channel === "youtube")
    return "Prepare YouTube description/pinned-comment traffic back to Substack.";
  return "Unsupported channel.";
}

function parseUtm(value: string | undefined, campaignId: string): CampaignUtm {
  const defaults = { source: "substack-cli", medium: "campaign", campaign: campaignId };
  if (!value) return defaults;
  const params = new URLSearchParams(value.includes("=") ? value : `campaign=${value}`);
  return {
    source: params.get("source") ?? params.get("utm_source") ?? defaults.source,
    medium: params.get("medium") ?? params.get("utm_medium") ?? defaults.medium,
    campaign: params.get("campaign") ?? params.get("utm_campaign") ?? defaults.campaign,
  };
}

function buildUtmUrl(url: string, utm: CampaignUtm): string | undefined {
  try {
    const parsed = new URL(url);
    parsed.searchParams.set("utm_source", utm.source);
    parsed.searchParams.set("utm_medium", utm.medium);
    parsed.searchParams.set("utm_campaign", utm.campaign);
    return parsed.toString();
  } catch {
    return undefined;
  }
}

function plannedPostUrl(
  publicationUrl: string | undefined,
  slug: string | undefined,
  issues: CampaignIssue[],
): string | undefined {
  if (!publicationUrl || !slug) return undefined;
  try {
    return new URL(`/p/${slug}`, publicationUrl).toString();
  } catch {
    issues.push({
      code: "publication-url-invalid",
      severity: "error",
      message: `publicationUrl is not a valid URL: ${publicationUrl}`,
    });
    return undefined;
  }
}

function safeUrl(
  value: string,
  code: "canonical-url-invalid",
  issues: CampaignIssue[],
): string | undefined {
  try {
    return new URL(value).toString();
  } catch {
    issues.push({
      code,
      severity: "error",
      message: `canonicalUrl is not a valid URL: ${value}`,
    });
    return undefined;
  }
}

function isValidFutureTimestamp(value: string): boolean {
  const parsed = Date.parse(value);
  return !Number.isNaN(parsed) && parsed > Date.now();
}

function slugify(value: string): string | undefined {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || undefined;
}

function safeId(value: string): string {
  return slugify(value) ?? "campaign";
}

function shellQuote(value: string): string {
  return `'${value.replace(/'/g, "'\"'\"'")}'`;
}

function blockedCampaignPlan(file: string, code: string, message: string): CampaignPlan {
  return {
    schemaVersion: 1,
    status: "blocked",
    campaignId: "invalid-campaign-plan",
    createdAt: new Date().toISOString(),
    post: {
      filePath: file,
      title: "Invalid campaign plan",
    },
    notes: [],
    channels: [],
    assets: [],
    utm: {
      source: "substack-cli",
      medium: "campaign",
      campaign: "invalid-campaign-plan",
    },
    issues: [{ code, severity: "error", message }],
    nextCommands: [],
  };
}
