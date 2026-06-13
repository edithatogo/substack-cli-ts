import assert from "node:assert/strict";
import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "vitest";
import type { PreparedPost } from "../types.js";
import type { DraftWritePlan, DraftWriteResult } from "../substack-api/draft-write.js";
import type { PublishWritePlan, PublishWriteResult } from "../substack-api/publish-write.js";
import {
  buildBrowserWorkflowRunLog,
  buildDraftWriteRunLog,
  buildPublishWriteRunLog,
  writeRunLog,
} from "./run-log.js";

const prepared: PreparedPost = {
  mode: "schedule",
  scheduleAt: "2026-06-20T09:00:00Z",
  post: {
    filePath: "posts/example.md",
    metadata: {
      title: "Example",
      subtitle: "Subtitle",
      slug: "example",
      tags: ["ops", "release"],
      audience: "everyone",
      section: "Updates",
      sectionId: 42,
    },
    markdown: "# Example",
    html: "<h1>Example</h1>",
    document: { type: "doc" },
    media: { assets: [], localCount: 0, remoteCount: 0, dataCount: 0 },
    warnings: [],
  },
};

describe("run log artifacts", () => {
  it("writes a durable JSON artifact with a stable audit shape", async () => {
    const temp = await mkdtemp(join(tmpdir(), "substack-cli-run-log-"));
    const artifact = buildPublishWriteRunLog({
      publicationUrl: "https://rareinsights.substack.com/",
      prepared,
      plan: publishPlan(),
      result: publishResult(),
    });

    try {
      const written = await writeRunLog(temp, artifact);
      assert.ok(written?.startsWith(temp));

      const files = await readdir(temp);
      assert.equal(files.length, 1);
      assert.match(files[0], /post\.schedule-success-/);

      const stored = JSON.parse(await readFile(join(temp, files[0]), "utf8")) as Record<
        string,
        unknown
      >;
      assert.equal(stored.schemaVersion, 1);
      assert.equal(stored.actionType, "post.schedule");
      assert.equal(stored.status, "success");
      assert.equal(stored.sourceFile, "posts/example.md");
      assert.equal(stored.draftId, "123");
      assert.equal(stored.sectionName, "Updates");
      assert.equal(stored.sectionId, 42);
      assert.equal(stored.slug, "example");
      assert.deepEqual(stored.tags, ["ops", "release"]);
      assert.equal(stored.scheduledTimeRequested, "2026-06-20T09:00:00Z");
      assert.equal(stored.scheduledTimeReturned, "2026-06-20T09:00:00Z");
    } finally {
      await rm(temp, { recursive: true, force: true });
    }
  });

  it("summarizes draft write failures and redacts sensitive error fragments", () => {
    const result: DraftWriteResult = {
      status: "failed",
      operation: "create",
      method: "POST",
      endpoint: "https://rareinsights.substack.com/api/v1/drafts",
      draftUrl: "https://rareinsights.substack.com/publish/post",
      message: "Substack returned HTTP 401.",
      error: "Authorization=Bearer abcdef123456; cookie=session-secret",
    };

    const artifact = buildDraftWriteRunLog({
      publicationUrl: "https://rareinsights.substack.com/",
      prepared: { ...prepared, mode: "draft", scheduleAt: undefined },
      plan: draftPlan(),
      result,
    });

    assert.equal(artifact.actionType, "draft.create");
    assert.equal(artifact.status, "failure");
    assert.equal(artifact.error?.message, result.error);
    assert.equal(artifact.error?.body?.includes("session-secret"), false);
    assert.equal(artifact.error?.body?.includes("abcdef123456"), false);
  });

  it("skips writing when no run log directory is configured", async () => {
    const artifact = buildPublishWriteRunLog({
      publicationUrl: "https://rareinsights.substack.com/",
      prepared,
      plan: publishPlan(),
      result: publishResult(),
    });

    assert.equal(await writeRunLog(undefined, artifact), undefined);
  });

  it("summarizes draft updates and empty failure bodies", () => {
    const plan = { ...draftPlan(), operation: "update" as const };
    const result: DraftWriteResult = {
      status: "updated",
      operation: "update",
      method: "PUT",
      endpoint: "https://rareinsights.substack.com/api/v1/drafts/123",
      draftUrl: "https://rareinsights.substack.com/publish/post/123",
      draftId: 123,
      message: "Draft updated (ID: 123).",
    };

    const updateArtifact = buildDraftWriteRunLog({
      publicationUrl: "https://rareinsights.substack.com/",
      prepared: { ...prepared, mode: "draft", scheduleAt: undefined },
      plan,
      result,
    });

    assert.equal(updateArtifact.actionType, "draft.update");
    assert.equal(updateArtifact.status, "success");
    assert.equal(updateArtifact.error, undefined);

    const failureArtifact = buildPublishWriteRunLog({
      publicationUrl: "https://rareinsights.substack.com/",
      plan: { ...publishPlan(), operation: "publish", scheduleAt: undefined },
      result: {
        status: "failed",
        operation: "publish",
        method: "POST",
        endpoint: "https://rareinsights.substack.com/api/v1/drafts/123/publish",
        draftId: "123",
        message: "Substack returned HTTP 500.",
      },
    });

    assert.equal(failureArtifact.actionType, "post.publish");
    assert.equal(failureArtifact.status, "failure");
    assert.equal(failureArtifact.error?.body, null);
  });

  it("builds browser workflow logs without exposing session URLs", () => {
    const artifact = buildBrowserWorkflowRunLog({
      publicationUrl: "https://rareinsights.substack.com/",
      prepared,
      result: {
        status: "scheduled",
        operation: "create",
        mode: "schedule",
        title: "Example",
        currentUrl: "https://rareinsights.substack.com/publish/post/123",
        finalUrl: "https://rareinsights.substack.com/publish/post/123",
        finalState: "scheduled",
        draftId: "123",
        draftUrl: "https://rareinsights.substack.com/publish/post/123",
        scheduleAt: "2026-06-20T09:00:00Z",
        transport: { requested: "auto", selected: "browser" },
        metadata: { section: "Updates", tags: ["ops", "release"] },
        browserbaseDebugUrl: "https://debug.example/session-secret",
        trace: [],
      },
    });

    assert.equal(artifact.actionType, "post.schedule");
    assert.equal(artifact.status, "success");
    assert.equal(artifact.draftUrl, "https://rareinsights.substack.com/publish/post/123");
    assert.equal(JSON.stringify(artifact).includes("session-secret"), false);
  });

  it("summarizes browser draft updates and validation failures", () => {
    const draftPrepared = { ...prepared, mode: "draft" as const, scheduleAt: undefined };
    const updateArtifact = buildBrowserWorkflowRunLog({
      publicationUrl: "https://rareinsights.substack.com/",
      prepared: draftPrepared,
      result: {
        status: "draft-updated",
        operation: "update",
        mode: "draft",
        title: "",
        currentUrl: "https://rareinsights.substack.com/publish/post/123",
        finalUrl: "https://rareinsights.substack.com/publish/post/123",
        finalState: "draft-updated",
        draftId: "123",
        draftUrl: "not-a-url",
        transport: { requested: "auto", selected: "browser" },
        metadata: [],
        trace: [],
      },
    });

    assert.equal(updateArtifact.actionType, "draft.update");
    assert.equal(updateArtifact.title, "Example");
    assert.equal(updateArtifact.draftUrl, "not-...-url");
    assert.equal(updateArtifact.sectionName, "Updates");

    const failedArtifact = buildBrowserWorkflowRunLog({
      publicationUrl: "https://rareinsights.substack.com/",
      prepared: draftPrepared,
      result: {
        status: "validation-failed",
        message: "Could not insert body",
        error: "Bearer abcdef123456",
      },
    });

    assert.equal(failedArtifact.actionType, "draft.create");
    assert.equal(failedArtifact.status, "failure");
    assert.equal(failedArtifact.error?.body?.includes("abcdef123456"), false);
  });
});

function draftPlan(): DraftWritePlan {
  return {
    status: "planned",
    operation: "create",
    method: "POST",
    endpoint: "https://rareinsights.substack.com/api/v1/drafts",
    draftUrl: "https://rareinsights.substack.com/publish/post",
    payload: {
      title: "Example",
      subtitle: "Subtitle",
      body: { type: "doc" },
      audience: "everyone",
      slug: "example",
      section: "Updates",
      sectionId: 42,
      tags: ["ops", "release"],
    },
    sectionResolutionApplied: true,
    resolvedSectionId: 42,
    duplicateKey: {
      title: "Example",
      slug: "example",
      sourceFile: "posts/example.md",
    },
    message: "planned",
  };
}

function publishPlan(): PublishWritePlan {
  return {
    status: "planned",
    operation: "schedule",
    method: "POST",
    endpoint: "https://rareinsights.substack.com/api/v1/drafts/123/schedule",
    draftId: "123",
    draftUrl: "https://rareinsights.substack.com/publish/post/123",
    scheduleAt: "2026-06-20T09:00:00Z",
    existingDraft: {
      sourceFile: "posts/example.md",
      publicationUrl: "https://rareinsights.substack.com/",
      draftId: "123",
      draftUrl: "https://rareinsights.substack.com/publish/post/123",
      title: "Example",
      slug: "example",
      updatedAt: "2026-06-13T00:00:00.000Z",
    },
    message: "planned",
  };
}

function publishResult(): PublishWriteResult {
  return {
    status: "scheduled",
    operation: "schedule",
    method: "POST",
    endpoint: "https://rareinsights.substack.com/api/v1/drafts/123/schedule",
    draftId: "123",
    postUrl: "https://rareinsights.substack.com/p/example",
    message: "scheduled",
  };
}
