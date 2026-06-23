import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "vitest";
import type { PreparedPost } from "../types.js";
import { buildCreatorMediaPlan, buildLivePlan } from "./media-plan.js";

describe("creator media planning", () => {
  it("plans a video package from a local file", async () => {
    const temp = await mkdtemp(join(tmpdir(), "substack-media-plan-"));
    const video = join(temp, "video.mp4");
    await writeFile(video, "fake video");

    try {
      const plan = await buildCreatorMediaPlan("video", video, preparedPost());
      assert.equal(plan.status, "ready");
      assert.equal(plan.operation, "media.video.plan");
      assert.equal(plan.mimeType, "video/mp4");
      assert.ok(plan.nextSteps.some((step) => step.includes("Upload")));
    } finally {
      await rm(temp, { recursive: true, force: true });
    }
  });

  it("blocks unsupported media extensions", async () => {
    const plan = await buildCreatorMediaPlan("audio", "notes.txt", preparedPost());
    assert.equal(plan.status, "blocked");
    assert.ok(plan.issues.some((issue) => issue.code === "extension-unsupported"));
  });

  it("warns on missing optional media metadata", async () => {
    const temp = await mkdtemp(join(tmpdir(), "substack-media-warnings-"));
    const video = join(temp, "video.webm");
    const audio = join(temp, "episode.mp3");
    await writeFile(video, "fake video");
    await writeFile(audio, "fake audio");

    try {
      const videoPlan = await buildCreatorMediaPlan(
        "video",
        video,
        preparedPost({ thumbnail: undefined }),
      );
      const audioPlan = await buildCreatorMediaPlan(
        "audio",
        audio,
        preparedPost({ transcript: undefined }),
      );
      assert.equal(videoPlan.mimeType, "video/webm");
      assert.ok(videoPlan.issues.some((issue) => issue.code === "thumbnail-missing"));
      assert.equal(audioPlan.mimeType, "audio/mpeg");
      assert.ok(audioPlan.issues.some((issue) => issue.code === "transcript-missing"));
    } finally {
      await rm(temp, { recursive: true, force: true });
    }
  });

  it("blocks missing files and directories", async () => {
    const temp = await mkdtemp(join(tmpdir(), "substack-media-dir-"));
    try {
      const directoryPlan = await buildCreatorMediaPlan("video", temp, preparedPost());
      const missingPlan = await buildCreatorMediaPlan(
        "audio",
        join(temp, "missing.m4a"),
        preparedPost(),
      );
      assert.ok(directoryPlan.issues.some((issue) => issue.code === "not-file"));
      assert.ok(missingPlan.issues.some((issue) => issue.code === "file-missing"));
      assert.equal(missingPlan.mimeType, "audio/mp4");
    } finally {
      await rm(temp, { recursive: true, force: true });
    }
  });

  it("maps remaining supported media mime types", async () => {
    const temp = await mkdtemp(join(tmpdir(), "substack-media-mime-"));
    const files = ["clip.mov", "clip.mkv", "episode.wav", "episode.aac"];
    for (const file of files) await writeFile(join(temp, file), "fake media");

    try {
      const mov = await buildCreatorMediaPlan("video", join(temp, "clip.mov"), preparedPost());
      const mkv = await buildCreatorMediaPlan("video", join(temp, "clip.mkv"), preparedPost());
      const wav = await buildCreatorMediaPlan("audio", join(temp, "episode.wav"), preparedPost());
      const aac = await buildCreatorMediaPlan("audio", join(temp, "episode.aac"), preparedPost());

      assert.equal(mov.mimeType, "video/quicktime");
      assert.equal(mkv.mimeType, "video/x-matroska");
      assert.equal(wav.mimeType, "audio/wav");
      assert.equal(aac.mimeType, "audio/aac");
    } finally {
      await rm(temp, { recursive: true, force: true });
    }
  });

  it("plans live events with lead-time validation", () => {
    const ready = buildLivePlan({
      title: "Live launch",
      scheduledAt: "2099-01-01T09:00:00Z",
      audience: "paid",
    });
    const blocked = buildLivePlan({
      title: "",
      scheduledAt: "not-a-date",
      audience: "everyone",
    });

    assert.equal(ready.status, "ready");
    assert.equal(blocked.status, "blocked");
    assert.ok(ready.issues.some((issue) => issue.code === "lead-time-too-long"));
  });

  it("blocks live events with insufficient lead time", () => {
    const soon = buildLivePlan({
      title: "Soon",
      scheduledAt: new Date(Date.now() + 5 * 60_000).toISOString(),
      audience: "everyone",
    });

    assert.equal(soon.status, "blocked");
    assert.ok(soon.issues.some((issue) => issue.code === "lead-time-too-short"));
  });
});

function preparedPost(metadata: Partial<PreparedPost["post"]["metadata"]> = {}): PreparedPost {
  return {
    mode: "draft",
    post: {
      filePath: "post.md",
      metadata: {
        title: "Video Post",
        tags: [],
        thumbnail: "thumb.png",
        transcript: "transcript.md",
        ...metadata,
      },
      markdown: "# Video Post",
      html: "<h1>Video Post</h1>",
      document: { type: "doc" },
      media: { assets: [], localCount: 0, remoteCount: 0, dataCount: 0 },
      warnings: [],
    },
  };
}
