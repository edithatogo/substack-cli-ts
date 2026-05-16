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
});
