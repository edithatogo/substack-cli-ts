import { stat } from "node:fs/promises";
import { basename, extname } from "node:path";
import type { PreparedPost } from "../types.js";
import { resolvePostTitle } from "../publish/title.js";

export type MediaPlanKind = "video" | "audio";
export type LiveAudience = "everyone" | "subscribers" | "paid";

export interface CreatorMediaPlan {
  schemaVersion: 1;
  status: "ready" | "blocked";
  operation: "media.video.plan" | "media.audio.plan";
  file: string;
  postFile: string;
  title: string;
  sizeBytes: number;
  mimeType: string;
  issues: Array<{ code: string; severity: "error" | "warning"; message: string }>;
  nextSteps: string[];
}

export interface LivePlan {
  schemaVersion: 1;
  status: "ready" | "blocked";
  operation: "live.plan";
  title: string;
  scheduledAt: string;
  audience: LiveAudience;
  issues: Array<{ code: string; severity: "error" | "warning"; message: string }>;
  rtmpChecklist: string[];
}

const VIDEO_EXTENSIONS = new Set([".mp4", ".mov", ".webm", ".mkv"]);
const AUDIO_EXTENSIONS = new Set([".mp3", ".wav", ".aac", ".m4a"]);

export async function buildCreatorMediaPlan(
  kind: MediaPlanKind,
  file: string,
  prepared: PreparedPost,
): Promise<CreatorMediaPlan> {
  const issues: CreatorMediaPlan["issues"] = [];
  const ext = extname(file).toLowerCase();
  const allowed = kind === "video" ? VIDEO_EXTENSIONS : AUDIO_EXTENSIONS;
  if (!allowed.has(ext)) {
    issues.push({
      code: "extension-unsupported",
      severity: "error",
      message: `${kind} files must use one of: ${[...allowed].join(", ")}.`,
    });
  }

  let sizeBytes = 0;
  try {
    const stats = await stat(file);
    sizeBytes = stats.size;
    if (!stats.isFile()) {
      issues.push({
        code: "not-file",
        severity: "error",
        message: `${file} is not a regular file.`,
      });
    }
  } catch (error) {
    issues.push({
      code: "file-missing",
      severity: "error",
      message: `Could not read ${file}: ${error instanceof Error ? error.message : String(error)}`,
    });
  }

  if (kind === "video" && !prepared.post.metadata.thumbnail) {
    issues.push({
      code: "thumbnail-missing",
      severity: "warning",
      message: "Add thumbnail front matter for stronger video packaging.",
    });
  }
  if (kind === "audio" && !prepared.post.metadata.transcript) {
    issues.push({
      code: "transcript-missing",
      severity: "warning",
      message: "Add transcript front matter for accessibility and reuse.",
    });
  }

  return {
    schemaVersion: 1,
    status: issues.some((issue) => issue.severity === "error") ? "blocked" : "ready",
    operation: kind === "video" ? "media.video.plan" : "media.audio.plan",
    file,
    postFile: prepared.post.filePath,
    title: resolvePostTitle(prepared.post),
    sizeBytes,
    mimeType: mimeTypeForExt(ext, kind),
    issues,
    nextSteps: [
      `Open Substack ${kind === "video" ? "Video" : "Audio/Podcast"} composer.`,
      `Upload ${basename(file)}.`,
      `Use ${prepared.post.filePath} for title, body, show notes, and metadata.`,
      "Do not automate live upload until a redacted dashboard trace confirms the endpoint contract.",
    ],
  };
}

export function buildLivePlan(input: {
  title: string;
  scheduledAt: string;
  audience: LiveAudience;
}): LivePlan {
  const issues: LivePlan["issues"] = [];
  const scheduled = Date.parse(input.scheduledAt);
  const now = Date.now();
  const minLead = 15 * 60_000;
  const maxLead = 93 * 24 * 60 * 60_000;

  if (!input.title.trim()) {
    issues.push({
      code: "title-required",
      severity: "error",
      message: "Live video title is required.",
    });
  }
  if (Number.isNaN(scheduled)) {
    issues.push({
      code: "scheduled-at-invalid",
      severity: "error",
      message: "scheduledAt must be a valid timestamp.",
    });
  } else {
    if (scheduled - now < minLead) {
      issues.push({
        code: "lead-time-too-short",
        severity: "error",
        message: "Schedule live video at least 15 minutes ahead.",
      });
    }
    if (scheduled - now > maxLead) {
      issues.push({
        code: "lead-time-too-long",
        severity: "warning",
        message: "Substack live scheduling is usually bounded to roughly three months.",
      });
    }
  }

  return {
    schemaVersion: 1,
    status: issues.some((issue) => issue.severity === "error") ? "blocked" : "ready",
    operation: "live.plan",
    title: input.title,
    scheduledAt: input.scheduledAt,
    audience: input.audience,
    issues,
    rtmpChecklist: [
      "Create a live video in the Substack dashboard.",
      "Choose the matching audience.",
      "Generate a fresh RTMP stream key and server URL.",
      "Paste the stream key into OBS/Streamyard.",
      "Keep live chat open in a viewer tab for moderation.",
    ],
  };
}

function mimeTypeForExt(ext: string, kind: MediaPlanKind): string {
  if (ext === ".mp4") return "video/mp4";
  if (ext === ".mov") return "video/quicktime";
  if (ext === ".webm") return "video/webm";
  if (ext === ".mkv") return "video/x-matroska";
  if (ext === ".mp3") return "audio/mpeg";
  if (ext === ".wav") return "audio/wav";
  if (ext === ".aac") return "audio/aac";
  if (ext === ".m4a") return "audio/mp4";
  return kind === "video" ? "video/*" : "audio/*";
}
