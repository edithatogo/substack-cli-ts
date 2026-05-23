import { access, readFile } from "node:fs/promises";
import { dirname, extname, resolve } from "node:path";
import type { ApiAuthMaterial } from "./auth.js";
import {
  type FetchLike,
  apiHeaders,
  classifyFailure,
  requestJson,
  requestWrite,
} from "./client.js";

export type PodcastReadStatus =
  | "ok"
  | "unauthenticated"
  | "forbidden"
  | "not-found"
  | "schema-drift"
  | "network-error";

export interface PodcastSection {
  id: number;
  name: string;
  slug: string;
  rssFeedUrl: string | null;
  description: string | null;
}

export interface PodcastSectionResult {
  status: PodcastReadStatus;
  section?: PodcastSection | undefined;
  message: string;
}

export interface PodcastEpisode {
  id: number;
  title: string;
  draftTitle: string | null;
  audioUrl: string | null;
  duration: number | null;
  status: string;
  scheduledAt: string | null;
  publishedAt: string | null;
}

export interface PodcastEpisodeResult {
  status: PodcastReadStatus;
  episode?: PodcastEpisode | undefined;
  message: string;
}

export interface PodcastEpisodesListResult {
  status: PodcastReadStatus;
  episodes?: PodcastEpisode[] | undefined;
  message: string;
}

export interface PodcastDistributionSettings {
  spotifyUrl: string | null;
  applePodcastsUrl: string | null;
  googlePodcastsUrl: string | null;
  rssFeedUrl: string | null;
  playerEmbedEnabled: boolean | null;
}

export interface PodcastSettingsResult {
  status: PodcastReadStatus;
  settings?: PodcastDistributionSettings | undefined;
  message: string;
}

export interface VideoUploadResult {
  status: "ok" | "failed";
  url?: string | undefined;
  thumbnailUrl?: string | undefined;
  message: string;
}

export interface VideoSettings {
  postId: number;
  videoUrl: string | null;
  thumbnailUrl: string | null;
  playerEnabled: boolean | null;
}

export interface VideoSettingsResult {
  status: PodcastReadStatus;
  settings?: VideoSettings | undefined;
  message: string;
}

export interface PodcastEpisodeCreateResult {
  status: "ok" | "failed";
  draftId?: number | undefined;
  message: string;
}

export interface PodcastEpisodeScheduleResult {
  status: "ok" | "failed";
  draftId: number;
  message: string;
}

const AUDIO_EXTENSIONS = new Set([".mp3", ".m4a", ".wav", ".ogg", ".aac", ".flac"]);
const VIDEO_EXTENSIONS = new Set([".mp4", ".mov", ".webm", ".avi", ".mkv"]);

function mimeTypeForMediaExt(ext: string): string {
  if (ext === ".mp3") return "audio/mpeg";
  if (ext === ".m4a") return "audio/mp4";
  if (ext === ".wav") return "audio/wav";
  if (ext === ".ogg") return "audio/ogg";
  if (ext === ".aac") return "audio/aac";
  if (ext === ".flac") return "audio/flac";
  if (ext === ".mp4") return "video/mp4";
  if (ext === ".mov") return "video/quicktime";
  if (ext === ".webm") return "video/webm";
  if (ext === ".avi") return "video/x-msvideo";
  if (ext === ".mkv") return "video/x-matroska";
  return "application/octet-stream";
}

export async function fetchPodcastSection(
  publicationUrl: string,
  material: ApiAuthMaterial,
  fetchFn: FetchLike,
): Promise<PodcastSectionResult> {
  const headers = apiHeaders(material);
  const url = new URL("/api/v1/publication/sections", publicationUrl).toString();
  const response = await requestJson(fetchFn, url, headers);

  if (response.status !== 200) {
    const failure = classifyFailure(response.status, url);
    return { status: failure.status, message: failure.message };
  }

  const body = response.body;
  if (!Array.isArray(body)) {
    return { status: "schema-drift", message: "Sections response was not an array." };
  }

  for (const item of body) {
    const record = item as Record<string, unknown>;
    const isPodcast = typeof record.is_podcast === "boolean" && record.is_podcast;
    if (!isPodcast) continue;

    const id = typeof record.id === "number" ? record.id : 0;
    const name = typeof record.name === "string" ? record.name : "";
    const slug = typeof record.slug === "string" ? record.slug : "";
    const description = typeof record.description === "string" ? record.description : null;
    const rssFeedUrl =
      typeof record.rss_feed_url === "string"
        ? record.rss_feed_url
        : typeof record.rssFeedUrl === "string"
          ? record.rssFeedUrl
          : null;

    return {
      status: "ok",
      section: { id, name, slug, rssFeedUrl, description },
      message: `Podcast section "${name}" found.`,
    };
  }

  return {
    status: "not-found",
    message: "No podcast section found in publication sections.",
  };
}

export async function fetchPodcastEpisodes(
  publicationUrl: string,
  material: ApiAuthMaterial,
  fetchFn: FetchLike,
  limit = 20,
): Promise<PodcastEpisodesListResult> {
  const headers = apiHeaders(material);
  const endpoints = ["/api/v1/publication/podcast_episodes", "/api/v1/podcast/episodes"];

  for (const path of endpoints) {
    const url = new URL(path, publicationUrl).toString();
    const response = await requestJson(fetchFn, url, headers);
    if (response.status === 200) {
      const body = response.body;
      const episodes = parseEpisodes(body, limit);
      if (episodes) {
        return {
          status: "ok",
          episodes,
          message: `Podcast episodes retrieved from ${path}.`,
        };
      }
    }
    if (response.status !== 404) {
      const failure = classifyFailure(response.status, url);
      return { status: failure.status, message: failure.message };
    }
  }

  return {
    status: "not-found",
    message: "No podcast episodes endpoint found. Podcast management may use the draft API.",
  };
}

export async function fetchPodcastSettings(
  publicationUrl: string,
  material: ApiAuthMaterial,
  fetchFn: FetchLike,
): Promise<PodcastSettingsResult> {
  const headers = apiHeaders(material);
  const endpoints = [
    "/api/v1/publication/podcast_settings",
    "/api/v1/publication/settings/podcast",
    "/api/v1/podcast/settings",
  ];

  for (const path of endpoints) {
    const url = new URL(path, publicationUrl).toString();
    const response = await requestJson(fetchFn, url, headers);
    if (response.status === 200) {
      const body = response.body as Record<string, unknown> | undefined;
      if (body) {
        return {
          status: "ok",
          settings: mapPodcastSettings(body),
          message: `Podcast settings retrieved from ${path}.`,
        };
      }
    }
    if (response.status !== 404) {
      const failure = classifyFailure(response.status, url);
      return { status: failure.status, message: failure.message };
    }
  }

  return {
    status: "not-found",
    message: "No podcast settings endpoint found. Distribution settings may be dashboard-only.",
  };
}

export async function createPodcastEpisode(
  publicationUrl: string,
  audioFilePath: string,
  material: ApiAuthMaterial,
  fetchFn: FetchLike,
  options?: { title?: string; draftId?: number },
): Promise<PodcastEpisodeCreateResult> {
  const headers = apiHeaders(material);
  const ext = extname(audioFilePath).toLowerCase();

  if (!AUDIO_EXTENSIONS.has(ext)) {
    return {
      status: "failed",
      message: `Unsupported audio format: ${ext}. Supported: ${[...AUDIO_EXTENSIONS].join(", ")}`,
    };
  }

  let targetDraftId = options?.draftId;

  // If no existing draft, create a new podcast draft first
  if (!targetDraftId) {
    const createUrl = new URL("/api/v1/drafts", publicationUrl).toString();
    const createBody: Record<string, unknown> = {
      type: "podcast",
      title: options?.title ?? audioFilePath.split(/[/\\]/).pop() ?? "Podcast Episode",
    };

    const createResponse = await requestWrite(fetchFn, createUrl, "POST", headers, createBody);
    if (createResponse.status >= 400 || !createResponse.draftId) {
      const failure = classifyFailure(createResponse.status, createUrl);
      return {
        status: "failed",
        message: `Failed to create podcast draft: ${failure.message}`,
      };
    }
    targetDraftId = createResponse.draftId;
  }

  // Upload audio to the draft
  const uploadResult = await uploadAudioToDraft(
    publicationUrl,
    targetDraftId,
    audioFilePath,
    material,
    fetchFn,
  );

  if (uploadResult.status !== "ok" || !uploadResult.url) {
    return {
      status: "failed",
      draftId: targetDraftId,
      message: `Audio upload failed: ${uploadResult.message}. Draft ${targetDraftId} was created but has no audio.`,
    };
  }

  // Update the draft with the audio URL
  const updateUrl = new URL(
    `/api/v1/drafts/${encodeURIComponent(targetDraftId)}`,
    publicationUrl,
  ).toString();
  const updateResponse = await requestWrite(fetchFn, updateUrl, "PUT", headers, {
    draft_podcast_url: uploadResult.url,
  });

  if (updateResponse.status >= 400) {
    return {
      status: "failed",
      draftId: targetDraftId,
      message: `Audio uploaded but draft update failed (HTTP ${updateResponse.status}).`,
    };
  }

  return {
    status: "ok",
    draftId: targetDraftId,
    message: `Podcast episode draft ${options?.draftId ? "updated" : "created"} (ID: ${targetDraftId}).`,
  };
}

export async function schedulePodcastEpisode(
  publicationUrl: string,
  draftId: number,
  scheduleAt: string,
  material: ApiAuthMaterial,
  fetchFn: FetchLike,
): Promise<PodcastEpisodeScheduleResult> {
  const headers = apiHeaders(material);
  const url = new URL(`/api/v1/drafts/${draftId}/schedule`, publicationUrl).toString();

  const response = await requestWrite(fetchFn, url, "POST", headers, {
    draft_scheduled_at: scheduleAt,
  });

  if (response.status >= 400) {
    const failure = classifyFailure(response.status, url);
    return {
      status: "failed",
      draftId,
      message: failure.message,
    };
  }

  return {
    status: "ok",
    draftId,
    message: `Podcast episode ${draftId} scheduled for ${scheduleAt}.`,
  };
}

export async function uploadVideo(
  publicationUrl: string,
  videoFilePath: string,
  material: ApiAuthMaterial,
  fetchFn: FetchLike,
): Promise<VideoUploadResult> {
  const headers = apiHeaders(material);
  const ext = extname(videoFilePath).toLowerCase();

  if (!VIDEO_EXTENSIONS.has(ext)) {
    return {
      status: "failed",
      message: `Unsupported video format: ${ext}. Supported: ${[...VIDEO_EXTENSIONS].join(", ")}`,
    };
  }

  try {
    await access(videoFilePath);
  } catch {
    return { status: "failed", message: `File not found: ${videoFilePath}` };
  }

  const endpoints = [
    "/api/v1/video/upload",
    "/api/v1/publication/video/upload",
    "/api/v1/media/video",
  ];

  for (const path of endpoints) {
    const url = new URL(path, publicationUrl).toString();
    try {
      const buffer = await readFile(videoFilePath);
      const mimeType = mimeTypeForMediaExt(ext);
      const base64 = buffer.toString("base64");
      const dataUrl = `data:${mimeType};base64,${base64}`;

      const response = await fetchFn(url, {
        method: "POST",
        headers: { ...headers, "content-type": "application/json" },
        body: JSON.stringify({ video: dataUrl }),
      });
      const text = await response.text();

      if (response.status >= 400) {
        if (response.status === 404) continue;
        return {
          status: "failed",
          message: `Video upload failed with HTTP ${response.status}: ${text.substring(0, 200)}`,
        };
      }

      let parsed: Record<string, unknown>;
      try {
        parsed = JSON.parse(text) as Record<string, unknown>;
      } catch {
        return { status: "failed", message: "Video upload response was not JSON." };
      }

      const videoUrl =
        typeof parsed.url === "string"
          ? parsed.url
          : typeof parsed.video_url === "string"
            ? parsed.video_url
            : typeof parsed.data === "string"
              ? parsed.data
              : undefined;
      const thumbnailUrl =
        typeof parsed.thumbnail_url === "string"
          ? parsed.thumbnail_url
          : typeof parsed.thumbnail === "string"
            ? parsed.thumbnail
            : undefined;

      if (!videoUrl) {
        return {
          status: "failed",
          message: `No URL found in upload response: ${text.substring(0, 200)}`,
        };
      }

      return {
        status: "ok",
        url: videoUrl,
        thumbnailUrl,
        message: "Video uploaded successfully.",
      };
    } catch (err) {
      return {
        status: "failed",
        message: `Upload error: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  }

  return {
    status: "failed",
    message: "No video upload endpoint found. Video upload may be dashboard-only.",
  };
}

export async function fetchVideoSettings(
  publicationUrl: string,
  postId: number,
  material: ApiAuthMaterial,
  fetchFn: FetchLike,
): Promise<VideoSettingsResult> {
  const headers = apiHeaders(material);
  const endpoints = [`/api/v1/post/${postId}/video`, `/api/v1/posts/${postId}/video`];

  for (const path of endpoints) {
    const url = new URL(path, publicationUrl).toString();
    const response = await requestJson(fetchFn, url, headers);
    if (response.status === 200) {
      const body = response.body as Record<string, unknown> | undefined;
      if (body) {
        return {
          status: "ok",
          settings: {
            postId,
            videoUrl:
              typeof body.video_url === "string"
                ? body.video_url
                : typeof body.url === "string"
                  ? body.url
                  : null,
            thumbnailUrl:
              typeof body.thumbnail_url === "string"
                ? body.thumbnail_url
                : typeof body.thumbnail === "string"
                  ? body.thumbnail
                  : null,
            playerEnabled:
              typeof body.player_enabled === "boolean"
                ? body.player_enabled
                : typeof body.embed_enabled === "boolean"
                  ? body.embed_enabled
                  : null,
          },
          message: `Video settings retrieved from ${path}.`,
        };
      }
    }
    if (response.status !== 404) {
      const failure = classifyFailure(response.status, url);
      return { status: failure.status, message: failure.message };
    }
  }

  return {
    status: "not-found",
    message: "No video settings endpoint found. Video settings may be dashboard-only.",
  };
}

async function uploadAudioToDraft(
  publicationUrl: string,
  draftId: number,
  audioFilePath: string,
  material: ApiAuthMaterial,
  fetchFn: FetchLike,
): Promise<{ status: "ok" | "failed"; url?: string; message: string }> {
  const headers = apiHeaders(material);
  const endpoints = [`/api/v1/drafts/${draftId}/audio`, `/api/v1/drafts/${draftId}/podcast`];

  for (const path of endpoints) {
    const url = new URL(path, publicationUrl).toString();
    try {
      const buffer = await readFile(audioFilePath);
      const ext = extname(audioFilePath).toLowerCase();
      const mimeType = mimeTypeForMediaExt(ext);
      const base64 = buffer.toString("base64");
      const dataUrl = `data:${mimeType};base64,${base64}`;

      const response = await fetchFn(url, {
        method: "POST",
        headers: { ...headers, "content-type": "application/json" },
        body: JSON.stringify({ audio: dataUrl }),
      });
      const text = await response.text();

      if (response.status >= 400) {
        if (response.status === 404) continue;
        return {
          status: "failed",
          message: `Audio upload failed with HTTP ${response.status}: ${text.substring(0, 200)}`,
        };
      }

      let parsed: Record<string, unknown>;
      try {
        parsed = JSON.parse(text) as Record<string, unknown>;
      } catch {
        return { status: "failed", message: "Audio upload response was not JSON." };
      }

      const audioUrl =
        typeof parsed.url === "string"
          ? parsed.url
          : typeof parsed.audio_url === "string"
            ? parsed.audio_url
            : typeof parsed.data === "string"
              ? parsed.data
              : undefined;

      if (!audioUrl) {
        return {
          status: "failed",
          message: `No URL found in upload response: ${text.substring(0, 200)}`,
        };
      }

      return { status: "ok", url: audioUrl, message: "Audio uploaded successfully." };
    } catch (err) {
      return {
        status: "failed",
        message: `Upload error: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  }

  return {
    status: "failed",
    message: "No audio upload endpoint found for drafts.",
  };
}

function parseEpisodes(body: unknown, limit: number): PodcastEpisode[] | null {
  const items = Array.isArray(body)
    ? body
    : body && typeof body === "object" && Array.isArray((body as Record<string, unknown>).episodes)
      ? ((body as Record<string, unknown>).episodes as unknown[])
      : body && typeof body === "object" && Array.isArray((body as Record<string, unknown>).data)
        ? ((body as Record<string, unknown>).data as unknown[])
        : null;

  if (!items) return null;

  const episodes: PodcastEpisode[] = [];
  for (const item of items.slice(0, limit)) {
    const record = item as Record<string, unknown>;
    const id =
      typeof record.id === "number"
        ? record.id
        : typeof record.id === "string"
          ? Number(record.id)
          : 0;
    const title =
      typeof record.title === "string"
        ? record.title
        : typeof record.name === "string"
          ? record.name
          : "";
    const draftTitle =
      typeof record.draft_title === "string"
        ? record.draft_title
        : typeof record.draftTitle === "string"
          ? record.draftTitle
          : null;
    const audioUrl =
      typeof record.audio_url === "string"
        ? record.audio_url
        : typeof record.audioUrl === "string"
          ? record.audioUrl
          : typeof record.url === "string"
            ? record.url
            : null;
    const duration =
      typeof record.duration === "number"
        ? record.duration
        : typeof record.draft_podcast_duration === "number"
          ? record.draft_podcast_duration
          : null;
    const status = typeof record.status === "string" ? record.status : "unknown";
    const scheduledAt =
      typeof record.scheduled_at === "string"
        ? record.scheduled_at
        : typeof record.scheduledAt === "string"
          ? record.scheduledAt
          : null;
    const publishedAt =
      typeof record.published_at === "string"
        ? record.published_at
        : typeof record.publishedAt === "string"
          ? record.publishedAt
          : typeof record.post_date === "string"
            ? record.post_date
            : null;

    episodes.push({ id, title, draftTitle, audioUrl, duration, status, scheduledAt, publishedAt });
  }

  return episodes.length > 0 ? episodes : null;
}

function mapPodcastSettings(body: Record<string, unknown>): PodcastDistributionSettings {
  const spotifyUrl =
    typeof body.spotify_url === "string"
      ? body.spotify_url
      : typeof body.spotifyUrl === "string"
        ? body.spotifyUrl
        : null;
  const applePodcastsUrl =
    typeof body.apple_podcasts_url === "string"
      ? body.apple_podcasts_url
      : typeof body.applePodcastsUrl === "string"
        ? body.applePodcastsUrl
        : typeof body.apple_url === "string"
          ? body.apple_url
          : null;
  const googlePodcastsUrl =
    typeof body.google_podcasts_url === "string"
      ? body.google_podcasts_url
      : typeof body.googlePodcastsUrl === "string"
        ? body.googlePodcastsUrl
        : null;
  const rssFeedUrl =
    typeof body.rss_feed_url === "string"
      ? body.rss_feed_url
      : typeof body.rssFeedUrl === "string"
        ? body.rssFeedUrl
        : null;
  const playerEmbedEnabled =
    typeof body.player_embed_enabled === "boolean"
      ? body.player_embed_enabled
      : typeof body.embed_enabled === "boolean"
        ? body.embed_enabled
        : null;

  return { spotifyUrl, applePodcastsUrl, googlePodcastsUrl, rssFeedUrl, playerEmbedEnabled };
}
