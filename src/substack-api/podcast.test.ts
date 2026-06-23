import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "vitest";
import { materialFromCookieHeader } from "./auth.js";
import type { FetchLike } from "./client.js";
import {
  createPodcastEpisode,
  fetchPodcastEpisodes,
  fetchPodcastSection,
  fetchPodcastSettings,
  fetchVideoSettings,
  schedulePodcastEpisode,
  uploadVideo,
} from "./podcast.js";

const material = materialFromCookieHeader(
  "substack.sid=fake-secret",
  "https://test.substack.com",
  "env",
);

function fakeFetch(status: number, body: unknown): FetchLike {
  return () =>
    Promise.resolve({
      status,
      text: () => Promise.resolve(typeof body === "string" ? body : JSON.stringify(body)),
    });
}

function fakeFetchRoutes(routes: Map<string, { status: number; body: unknown }>): FetchLike {
  return (input: string) => {
    const route = routes.get(input);
    if (!route) return Promise.resolve({ status: 404, text: () => Promise.resolve("{}") });
    return Promise.resolve({
      status: route.status,
      text: () =>
        Promise.resolve(typeof route.body === "string" ? route.body : JSON.stringify(route.body)),
    });
  };
}

describe("fetchPodcastSection", () => {
  it("finds podcast sections", async () => {
    const result = await fetchPodcastSection(
      "https://test.substack.com",
      material,
      fakeFetch(200, [
        { id: 1, name: "News", slug: "news" },
        {
          id: 2,
          name: "Podcast",
          slug: "podcast",
          is_podcast: true,
          rssFeedUrl: "https://example.com/rss",
          description: "Audio",
        },
      ]),
    );

    assert.equal(result.status, "ok");
    assert.equal(result.section?.id, 2);
    assert.equal(result.section?.rssFeedUrl, "https://example.com/rss");
  });

  it("reports schema drift for non-array section payloads", async () => {
    const result = await fetchPodcastSection(
      "https://test.substack.com",
      material,
      fakeFetch(200, { sections: [] }),
    );

    assert.equal(result.status, "schema-drift");
  });

  it("reports not-found when no podcast section exists", async () => {
    const result = await fetchPodcastSection(
      "https://test.substack.com",
      material,
      fakeFetch(200, [
        { id: 1, name: "News", slug: "news", is_podcast: false },
        { id: 2, name: "Essays", slug: "essays", is_podcast: false },
      ]),
    );

    assert.equal(result.status, "not-found");
    assert.match(result.message, /No podcast section found/);
  });

  it("classifies http errors", async () => {
    const result = await fetchPodcastSection(
      "https://test.substack.com",
      material,
      fakeFetch(401, { error: "unauthorized" }),
    );

    assert.equal(result.status, "unauthenticated");
  });
});

describe("fetchPodcastEpisodes", () => {
  it("parses episode lists", async () => {
    const result = await fetchPodcastEpisodes(
      "https://test.substack.com",
      material,
      fakeFetch(200, {
        episodes: [
          {
            id: "10",
            name: "Episode 1",
            draftTitle: "Draft title",
            audioUrl: "https://example.com/audio.mp3",
            duration: 120,
            status: "published",
            scheduledAt: "2026-01-01T00:00:00Z",
            post_date: "2026-01-02T00:00:00Z",
          },
        ],
      }),
    );

    assert.equal(result.status, "ok");
    assert.equal(result.episodes?.[0]?.id, 10);
    assert.equal(result.episodes?.[0]?.audioUrl, "https://example.com/audio.mp3");
  });

  it("parses episodes from flat array response", async () => {
    const result = await fetchPodcastEpisodes(
      "https://test.substack.com",
      material,
      fakeFetch(200, [
        {
          id: 1,
          title: "Flat Episode",
          audio_url: "https://example.com/audio.mp3",
          status: "draft",
        },
        {
          id: 2,
          title: "Flat Episode 2",
          audio_url: "https://example.com/audio2.mp3",
          status: "published",
        },
      ]),
    );

    assert.equal(result.status, "ok");
    assert.equal(result.episodes?.length, 2);
    assert.equal(result.episodes?.[0]?.id, 1);
    assert.equal(result.episodes?.[1]?.id, 2);
  });

  it("returns not-found when no endpoint responds", async () => {
    const result = await fetchPodcastEpisodes(
      "https://test.substack.com",
      material,
      fakeFetch(404, { error: "not found" }),
    );

    assert.equal(result.status, "not-found");
  });
});

describe("fetchPodcastSettings", () => {
  it("maps distribution settings", async () => {
    const result = await fetchPodcastSettings(
      "https://test.substack.com",
      material,
      fakeFetch(200, {
        spotifyUrl: "https://spotify.example",
        apple_url: "https://apple.example",
        google_podcasts_url: "https://google.example",
        rss_feed_url: "https://rss.example",
        embed_enabled: true,
      }),
    );

    assert.equal(result.status, "ok");
    assert.equal(result.settings?.spotifyUrl, "https://spotify.example");
    assert.equal(result.settings?.applePodcastsUrl, "https://apple.example");
    assert.equal(result.settings?.playerEmbedEnabled, true);
  });

  it("returns not-found when no settings endpoint responds", async () => {
    const result = await fetchPodcastSettings(
      "https://test.substack.com",
      material,
      fakeFetch(404, { error: "not found" }),
    );

    assert.equal(result.status, "not-found");
  });
});

describe("podcast write probes", () => {
  it("rejects unsupported audio formats before network calls", async () => {
    const result = await createPodcastEpisode(
      "https://test.substack.com",
      "episode.txt",
      material,
      fakeFetch(200, {}),
    );

    assert.equal(result.status, "failed");
    assert.match(result.message, /Unsupported audio format/);
  });

  it("creates a podcast episode with a real audio file", async () => {
    const temp = await mkdtemp(join(tmpdir(), "substack-cli-podcast-"));
    const file = join(temp, "episode.mp3");
    await writeFile(file, Buffer.from("audio"));

    try {
      const result = await createPodcastEpisode(
        "https://test.substack.com",
        file,
        material,
        fakeFetchRoutes(
          new Map([
            [
              "https://test.substack.com/api/v1/drafts",
              {
                status: 200,
                body: { id: 101, draft_url: "https://substack.com/p/101" },
              },
            ],
            [
              "https://test.substack.com/api/v1/drafts/101/audio",
              {
                status: 200,
                body: { url: "https://cdn.example/audio.mp3" },
              },
            ],
            [
              "https://test.substack.com/api/v1/drafts/101",
              {
                status: 200,
                body: { id: 101, draft_podcast_url: "https://cdn.example/audio.mp3" },
              },
            ],
          ]),
        ),
      );

      assert.equal(result.status, "ok");
      assert.equal(result.draftId, 101);
    } finally {
      await rm(temp, { recursive: true, force: true });
    }
  });

  it("uses existing draftId when provided", async () => {
    const temp = await mkdtemp(join(tmpdir(), "substack-cli-podcast-"));
    const file = join(temp, "episode.mp3");
    await writeFile(file, Buffer.from("audio"));

    try {
      const result = await createPodcastEpisode(
        "https://test.substack.com",
        file,
        material,
        fakeFetchRoutes(
          new Map([
            [
              "https://test.substack.com/api/v1/drafts/42/audio",
              {
                status: 200,
                body: { audio_url: "https://cdn.example/audio.mp3" },
              },
            ],
            [
              "https://test.substack.com/api/v1/drafts/42",
              {
                status: 200,
                body: { id: 42, draft_podcast_url: "https://cdn.example/audio.mp3" },
              },
            ],
          ]),
        ),
        { draftId: 42 },
      );

      assert.equal(result.status, "ok");
      assert.equal(result.draftId, 42);
    } finally {
      await rm(temp, { recursive: true, force: true });
    }
  });

  it("reports audio upload failure gracefully", async () => {
    const temp = await mkdtemp(join(tmpdir(), "substack-cli-podcast-"));
    const file = join(temp, "episode.mp3");
    await writeFile(file, Buffer.from("audio"));

    try {
      const result = await createPodcastEpisode(
        "https://test.substack.com",
        file,
        material,
        fakeFetchRoutes(
          new Map([
            [
              "https://test.substack.com/api/v1/drafts",
              {
                status: 200,
                body: { id: 200, draft_url: "https://substack.com/p/200" },
              },
            ],
            [
              "https://test.substack.com/api/v1/drafts/200/audio",
              {
                status: 500,
                body: { error: "server error" },
              },
            ],
          ]),
        ),
      );

      assert.equal(result.status, "failed");
      assert.ok(result.draftId);
      assert.match(result.message, /Audio upload failed/);
    } finally {
      await rm(temp, { recursive: true, force: true });
    }
  });

  it("schedules podcast episodes", async () => {
    const result = await schedulePodcastEpisode(
      "https://test.substack.com",
      42,
      "2026-01-01T00:00:00Z",
      material,
      fakeFetch(200, {}),
    );

    assert.equal(result.status, "ok");
    assert.equal(result.draftId, 42);
  });

  it("scheduling fails with http error", async () => {
    const result = await schedulePodcastEpisode(
      "https://test.substack.com",
      42,
      "2026-01-01T00:00:00Z",
      material,
      fakeFetch(400, { error: "bad request" }),
    );

    assert.equal(result.status, "failed");
  });
});

describe("video probes", () => {
  it("rejects unsupported video formats before file access", async () => {
    const result = await uploadVideo(
      "https://test.substack.com",
      "video.txt",
      material,
      fakeFetch(200, {}),
    );

    assert.equal(result.status, "failed");
    assert.match(result.message, /Unsupported video format/);
  });

  it("uploads supported video files and parses thumbnail fields", async () => {
    const temp = await mkdtemp(join(tmpdir(), "substack-cli-video-"));
    const file = join(temp, "clip.mp4");
    await writeFile(file, Buffer.from("video"));

    try {
      const result = await uploadVideo(
        "https://test.substack.com",
        file,
        material,
        fakeFetchRoutes(
          new Map([
            [
              "https://test.substack.com/api/v1/video/upload",
              {
                status: 200,
                body: {
                  video_url: "https://cdn.example/video.mp4",
                  thumbnail: "https://cdn.example/thumb.jpg",
                },
              },
            ],
          ]),
        ),
      );

      assert.equal(result.status, "ok");
      assert.equal(result.url, "https://cdn.example/video.mp4");
      assert.equal(result.thumbnailUrl, "https://cdn.example/thumb.jpg");
    } finally {
      await rm(temp, { recursive: true, force: true });
    }
  });

  it("reports file-not-found for missing video file", async () => {
    const result = await uploadVideo(
      "https://test.substack.com",
      "/tmp/nonexistent/video.mp4",
      material,
      fakeFetch(200, {}),
    );

    assert.equal(result.status, "failed");
    assert.match(result.message, /File not found/);
  });

  it("falls back to next endpoint when video upload endpoint returns 404", async () => {
    const temp = await mkdtemp(join(tmpdir(), "substack-cli-video-"));
    const file = join(temp, "clip.mp4");
    await writeFile(file, Buffer.from("video"));

    try {
      const result = await uploadVideo(
        "https://test.substack.com",
        file,
        material,
        fakeFetchRoutes(
          new Map([
            [
              "https://test.substack.com/api/v1/video/upload",
              { status: 404, body: { error: "not found" } },
            ],
            [
              "https://test.substack.com/api/v1/publication/video/upload",
              {
                status: 200,
                body: { url: "https://cdn.example/video.mp4" },
              },
            ],
          ]),
        ),
      );

      assert.equal(result.status, "ok");
      assert.equal(result.url, "https://cdn.example/video.mp4");
    } finally {
      await rm(temp, { recursive: true, force: true });
    }
  });

  it("fetches video settings", async () => {
    const result = await fetchVideoSettings(
      "https://test.substack.com",
      99,
      material,
      fakeFetch(200, {
        url: "https://cdn.example/video.mp4",
        thumbnail_url: "https://cdn.example/thumb.jpg",
        player_enabled: false,
      }),
    );

    assert.equal(result.status, "ok");
    assert.equal(result.settings?.postId, 99);
    assert.equal(result.settings?.playerEnabled, false);
  });

  it("returns not-found when video settings endpoint is missing", async () => {
    const result = await fetchVideoSettings(
      "https://test.substack.com",
      99,
      material,
      fakeFetch(404, { error: "not found" }),
    );

    assert.equal(result.status, "not-found");
  });
});
