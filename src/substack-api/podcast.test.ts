import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { materialFromCookieHeader } from "./auth.js";
import { type FetchLike } from "./client.js";
import {
  fetchPodcastSection,
  fetchPodcastEpisodes,
  fetchPodcastSettings,
  fetchVideoSettings,
} from "./podcast.js";

function fakeFetch(status: number, body: string): FetchLike {
  return () =>
    Promise.resolve({
      status,
      text: () => Promise.resolve(body),
    });
}

function fakeFetchRoutes(routes: Map<string, unknown>): FetchLike {
  return (input: string) => {
    const body = routes.get(input);
    if (body === undefined) {
      return Promise.resolve({ status: 404, text: () => Promise.resolve("{}") });
    }
    return Promise.resolve({
      status: 200,
      text: () => Promise.resolve(JSON.stringify(body)),
    });
  };
}

const material = materialFromCookieHeader(
  "substack.sid=fake-secret",
  "https://test.substack.com",
  "env",
);

describe("fetchPodcastSection", () => {
  it("returns podcast section from sections list", async () => {
    const fetchFn = fakeFetch(
      200,
      JSON.stringify([
        { id: 1, publication_id: 10, name: "Articles", slug: "articles", is_podcast: false },
        { id: 2, publication_id: 10, name: "Podcast", slug: "podcast", is_podcast: true, rss_feed_url: "https://feed.example.com/rss" },
      ]),
    );

    const result = await fetchPodcastSection(
      "https://test.substack.com",
      material,
      fetchFn,
    );

    assert.equal(result.status, "ok");
    assert.equal(result.section?.id, 2);
    assert.equal(result.section?.name, "Podcast");
    assert.equal(result.section?.slug, "podcast");
    assert.equal(result.section?.rssFeedUrl, "https://feed.example.com/rss");
  });

  it("returns not-found when no podcast section exists", async () => {
    const fetchFn = fakeFetch(
      200,
      JSON.stringify([
        { id: 1, publication_id: 10, name: "Articles", slug: "articles", is_podcast: false },
      ]),
    );

    const result = await fetchPodcastSection(
      "https://test.substack.com",
      material,
      fetchFn,
    );

    assert.equal(result.status, "not-found");
  });

  it("returns schema-drift for non-array response", async () => {
    const fetchFn = fakeFetch(200, JSON.stringify({ not: "array" }));

    const result = await fetchPodcastSection(
      "https://test.substack.com",
      material,
      fetchFn,
    );

    assert.equal(result.status, "schema-drift");
  });

  it("returns unauthenticated on 401", async () => {
    const fetchFn = fakeFetch(401, "{}");

    const result = await fetchPodcastSection(
      "https://test.substack.com",
      material,
      fetchFn,
    );

    assert.equal(result.status, "unauthenticated");
  });
});

describe("fetchPodcastEpisodes", () => {
  it("returns episodes from array response", async () => {
    const fetchFn = fakeFetch(
      200,
      JSON.stringify([
        {
          id: 1,
          title: "Episode 1",
          draft_title: "Episode 1 Draft",
          audio_url: "https://audio.example.com/ep1.mp3",
          duration: 3600,
          status: "published",
          scheduled_at: null,
          published_at: "2026-01-01T00:00:00Z",
        },
      ]),
    );

    const result = await fetchPodcastEpisodes(
      "https://test.substack.com",
      material,
      fetchFn,
    );

    assert.equal(result.status, "ok");
    assert.equal(result.episodes?.length, 1);
    assert.equal(result.episodes?.[0]?.title, "Episode 1");
    assert.equal(result.episodes?.[0]?.audioUrl, "https://audio.example.com/ep1.mp3");
    assert.equal(result.episodes?.[0]?.duration, 3600);
  });

  it("parses episodes from nested field", async () => {
    const fetchFn = fakeFetch(
      200,
      JSON.stringify({
        episodes: [
          { id: 2, title: "Ep 2", draftTitle: "Ep 2 Draft", status: "draft" },
        ],
      }),
    );

    const result = await fetchPodcastEpisodes(
      "https://test.substack.com",
      material,
      fetchFn,
    );

    assert.equal(result.status, "ok");
    assert.equal(result.episodes?.length, 1);
    assert.equal(result.episodes?.[0]?.draftTitle, "Ep 2 Draft");
  });

  it("applies limit parameter", async () => {
    const items = Array.from({ length: 5 }, (_, i) => ({
      id: i + 1,
      title: `Ep ${i + 1}`,
      status: "published",
    }));

    const fetchFn = fakeFetch(200, JSON.stringify(items));

    const result = await fetchPodcastEpisodes(
      "https://test.substack.com",
      material,
      fetchFn,
      3,
    );

    assert.equal(result.status, "ok");
    assert.equal(result.episodes?.length, 3);
  });

  it("returns not-found when all endpoints return 404", async () => {
    const fetchFn = fakeFetch(404, "{}");

    const result = await fetchPodcastEpisodes(
      "https://test.substack.com",
      material,
      fetchFn,
    );

    assert.equal(result.status, "not-found");
  });
});

describe("fetchPodcastSettings", () => {
  it("returns distribution settings from valid response", async () => {
    const fetchFn = fakeFetch(
      200,
      JSON.stringify({
        spotify_url: "https://open.spotify.com/show/abc",
        apple_podcasts_url: "https://podcasts.apple.com/show/abc",
        google_podcasts_url: "https://podcasts.google.com/abc",
        rss_feed_url: "https://feed.example.com/rss",
        player_embed_enabled: true,
      }),
    );

    const result = await fetchPodcastSettings(
      "https://test.substack.com",
      material,
      fetchFn,
    );

    assert.equal(result.status, "ok");
    assert.equal(result.settings?.spotifyUrl, "https://open.spotify.com/show/abc");
    assert.equal(result.settings?.applePodcastsUrl, "https://podcasts.apple.com/show/abc");
    assert.equal(result.settings?.googlePodcastsUrl, "https://podcasts.google.com/abc");
    assert.equal(result.settings?.rssFeedUrl, "https://feed.example.com/rss");
    assert.equal(result.settings?.playerEmbedEnabled, true);
  });

  it("falls back to alternate field names", async () => {
    const fetchFn = fakeFetch(
      200,
      JSON.stringify({
        spotifyUrl: "https://spotify.com/abc",
        applePodcastsUrl: "https://apple.com/abc",
        rssFeedUrl: "https://feed.example.com/rss",
        embed_enabled: false,
      }),
    );

    const result = await fetchPodcastSettings(
      "https://test.substack.com",
      material,
      fetchFn,
    );

    assert.equal(result.status, "ok");
    assert.equal(result.settings?.spotifyUrl, "https://spotify.com/abc");
    assert.equal(result.settings?.playerEmbedEnabled, false);
  });

  it("returns null for missing fields", async () => {
    const fetchFn = fakeFetch(200, JSON.stringify({}));

    const result = await fetchPodcastSettings(
      "https://test.substack.com",
      material,
      fetchFn,
    );

    assert.equal(result.status, "ok");
    assert.equal(result.settings?.spotifyUrl, null);
    assert.equal(result.settings?.playerEmbedEnabled, null);
  });

  it("returns not-found when all endpoints return 404", async () => {
    const fetchFn = fakeFetch(404, "{}");

    const result = await fetchPodcastSettings(
      "https://test.substack.com",
      material,
      fetchFn,
    );

    assert.equal(result.status, "not-found");
  });
});

describe("fetchVideoSettings", () => {
  it("returns video settings from valid response", async () => {
    const fetchFn = fakeFetch(
      200,
      JSON.stringify({
        video_url: "https://video.example.com/vid.mp4",
        thumbnail_url: "https://video.example.com/thumb.jpg",
        player_enabled: true,
      }),
    );

    const result = await fetchVideoSettings(
      "https://test.substack.com",
      42,
      material,
      fetchFn,
    );

    assert.equal(result.status, "ok");
    assert.equal(result.settings?.postId, 42);
    assert.equal(result.settings?.videoUrl, "https://video.example.com/vid.mp4");
    assert.equal(result.settings?.thumbnailUrl, "https://video.example.com/thumb.jpg");
    assert.equal(result.settings?.playerEnabled, true);
  });

  it("falls back to alternate field names", async () => {
    const fetchFn = fakeFetch(
      200,
      JSON.stringify({
        url: "https://video.example.com/vid2.mp4",
        thumbnail: "https://video.example.com/thumb2.jpg",
        embed_enabled: false,
      }),
    );

    const result = await fetchVideoSettings(
      "https://test.substack.com",
      42,
      material,
      fetchFn,
    );

    assert.equal(result.status, "ok");
    assert.equal(result.settings?.videoUrl, "https://video.example.com/vid2.mp4");
    assert.equal(result.settings?.playerEnabled, false);
  });

  it("returns not-found when all endpoints return 404", async () => {
    const fetchFn = fakeFetch(404, "{}");

    const result = await fetchVideoSettings(
      "https://test.substack.com",
      42,
      material,
      fetchFn,
    );

    assert.equal(result.status, "not-found");
  });

  it("returns unauthenticated on 401", async () => {
    const fetchFn = fakeFetch(401, "{}");

    const result = await fetchVideoSettings(
      "https://test.substack.com",
      42,
      material,
      fetchFn,
    );

    assert.equal(result.status, "unauthenticated");
  });
});
