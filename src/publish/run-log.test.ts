import assert from "node:assert/strict";
import { mkdtemp, readdir, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "vitest";
import type { DraftWritePlan, DraftWriteResult } from "../substack-api/draft-write.js";
import type { NoteWritePlan, NoteWriteResult } from "../substack-api/note-write.js";
import type { PublishWritePlan, PublishWriteResult } from "../substack-api/publish-write.js";
import type { PreparedPost } from "../types.js";
import {
  buildBrowserWorkflowRunLog,
  buildCreatorWorkflowRunLog,
  buildDraftWriteRunLog,
  buildDraftMutationRunLog,
  buildNoteWriteRunLog,
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

  it("uses safe fallbacks for sparse draft and publish write results", () => {
    const sparseDraftPlan: DraftWritePlan = {
      ...draftPlan(),
      resolvedSectionId: undefined,
    };
    const failedDraft = buildDraftWriteRunLog({
      publicationUrl: "https://rareinsights.substack.com/",
      prepared: { ...prepared, mode: "draft", scheduleAt: undefined },
      plan: sparseDraftPlan,
      result: {
        status: "failed",
        operation: "create",
        method: "POST",
        endpoint: "https://rareinsights.substack.com/api/v1/drafts",
        message: "Draft request failed.",
      },
    });

    assert.equal(failedDraft.sectionId, 42);
    assert.equal(failedDraft.error?.message, "Draft request failed.");
    assert.equal(failedDraft.error?.body, null);

    const sparsePublishPlan: PublishWritePlan = {
      ...publishPlan(),
      draftUrl: undefined,
    };
    const scheduled = buildPublishWriteRunLog({
      publicationUrl: "https://rareinsights.substack.com/",
      title: "Scheduled draft 123",
      plan: sparsePublishPlan,
      result: publishResult(),
      selectorSourceFile: "schedule.json",
    });

    assert.equal(scheduled.title, "Scheduled draft 123");
    assert.equal(scheduled.selectorSourceFile, "schedule.json");
    assert.equal(scheduled.draftUrl, undefined);
    assert.equal(scheduled.slug, "example");
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

  it("summarizes note schedule writes", () => {
    const artifact = buildNoteWriteRunLog({
      publicationUrl: "https://rareinsights.substack.com/",
      plan: notePlan(),
      result: noteResult(),
      title: "Example note",
      sourceFile: "notes/example.md",
      selectorSourceFile: "notes.json",
    });

    assert.equal(artifact.actionType, "note.schedule");
    assert.equal(artifact.status, "success");
    assert.equal(artifact.sourceFile, "notes/example.md");
    assert.equal(artifact.selectorSourceFile, "notes.json");
    assert.equal(artifact.scheduledTimeRequested, "2026-06-20T09:00:00Z");
    assert.equal(artifact.scheduledTimeReturned, "2026-06-20T09:00:00Z");
    assert.equal(artifact.apiResponseIds?.noteId, "456");
    assert.equal(artifact.apiResponseIds?.postUrl, "https://rareinsights.substack.com/p/example");
  });

  it("summarizes note create failures", () => {
    const artifact = buildNoteWriteRunLog({
      publicationUrl: "https://rareinsights.substack.com/",
      plan: {
        ...notePlan(),
        operation: "create",
        scheduledAt: undefined,
        postUrl: undefined,
      },
      result: {
        status: "failed",
        operation: "create",
        method: "POST",
        endpoint: "https://rareinsights.substack.com/comment/feed/",
        message: "Substack returned HTTP 500.",
      },
    });

    assert.equal(artifact.actionType, "note.create");
    assert.equal(artifact.status, "failure");
    assert.equal(artifact.scheduledTimeRequested, undefined);
    assert.equal(artifact.scheduledTimeReturned, undefined);
    assert.equal(artifact.apiResponseIds?.noteId, undefined);
    assert.equal(artifact.apiResponseIds?.postUrl, undefined);
    assert.equal(artifact.error?.message, "Substack returned HTTP 500.");
    assert.equal(artifact.error?.body, null);
  });

  it("classifies browser publish workflow logs", () => {
    const artifact = buildBrowserWorkflowRunLog({
      publicationUrl: "https://rareinsights.substack.com/",
      prepared: { ...prepared, mode: "publish", scheduleAt: undefined },
      result: {
        status: "published",
        operation: "create",
        mode: "publish",
        publishedUrl: "https://rareinsights.substack.com/p/example",
        metadata: { section: "Updates" },
        trace: [],
      },
    });

    assert.equal(artifact.actionType, "post.publish");
    assert.equal(artifact.status, "success");
    assert.equal(artifact.scheduledTimeRequested, undefined);
    assert.equal(artifact.apiResponseIds?.postUrl, "https://rareinsights.substack.com/p/example");
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

  it("builds Creator OS workflow logs", () => {
    const artifact = buildCreatorWorkflowRunLog({
      actionType: "campaign.plan",
      publicationUrl: "https://rareinsights.substack.com/",
      sourceFile: "posts/creator.md",
      title: "Creator",
      campaignId: "creator",
      channel: "notes",
      resultMessage: "Campaign plan generated.",
    });

    assert.equal(artifact.actionType, "campaign.plan");
    assert.equal(artifact.status, "success");
    assert.equal(artifact.campaignId, "creator");
    assert.equal(artifact.channel, "notes");
  });

  it("builds Creator OS workflow log defaults and errors", () => {
    const artifact = buildCreatorWorkflowRunLog({
      actionType: "live.plan",
      errorMessage: "Authorization=Bearer abcdef123456",
    });

    assert.equal(artifact.status, "success");
    assert.equal(artifact.publicationUrl, "local");
    assert.equal(artifact.error?.message, "Authorization=Bearer abcdef123456");
    assert.equal(artifact.error?.body?.includes("abcdef123456"), false);
  });

  it("builds roadmap operation logs with redacted diagnostics", async () => {
    const temp = await mkdtemp(join(tmpdir(), "substack-cli-coverage-run-log-"));
    const artifact = buildCreatorWorkflowRunLog({
      actionType: "coverage.audit",
      status: "failure",
      publicationUrl: "https://rareinsights.substack.com/",
      resultMessage: "Coverage audit found unsupported endpoints.",
      errorMessage: "Coverage audit failed.",
      unsupportedEndpoints: [
        "https://rareinsights.substack.com/api/private?token=secret-token",
        "Authorization=Bearer abcdef123456",
        "Cookie: session=header-secret",
      ],
      manualAdminGates: ["Substack admin dashboard owner approval"],
      staleDocs: ["docs/frontier-coverage-roadmap.md"],
    });

    try {
      const written = await writeRunLog(temp, artifact);
      assert.ok(written);
      const stored = JSON.parse(await readFile(written, "utf8")) as typeof artifact;

      assert.equal(stored.actionType, "coverage.audit");
      assert.equal(stored.status, "failure");
      assert.equal(stored.diagnostics?.unsupportedEndpoints?.length, 3);
      assert.equal(JSON.stringify(stored).includes("secret-token"), false);
      assert.equal(JSON.stringify(stored).includes("abcdef123456"), false);
      assert.equal(JSON.stringify(stored).includes("header-secret"), false);
      assert.deepEqual(stored.diagnostics?.manualAdminGates, [
        "Substack admin dashboard owner approval",
      ]);
      assert.deepEqual(stored.diagnostics?.staleDocs, ["docs/frontier-coverage-roadmap.md"]);
      assert.equal(stored.error?.body, "Coverage audit failed.");
    } finally {
      await rm(temp, { recursive: true, force: true });
    }
  });

  it("accepts all roadmap run-log action names", () => {
    for (const actionType of [
      "coverage.validate",
      "coverage.drift",
      "launch.check",
      "endpoint.capture.review",
      "decision.record",
    ] as const) {
      const artifact = buildCreatorWorkflowRunLog({
        actionType,
        resultMessage: `${actionType} recorded.`,
      });

      assert.equal(artifact.actionType, actionType);
      assert.equal(artifact.diagnostics, undefined);
    }
  });

  it("builds draft mutation run-log artifacts for unschedule and revise", () => {
    const source = {
      status: "success" as const,
      operation: "unschedule" as const,
      method: "POST" as const,
      draftId: "123",
      endpointTemplate: "/api/v1/drafts/{draftId}/unpublish",
      endpoint: "https://rareinsights.substack.com/api/v1/drafts/123/unpublish",
      statusCode: 204,
      message: "Unschedule mutation succeeded for draft 123.",
      sourceProbe: {
        operation: "unschedule",
        endpointTemplate: "/api/v1/drafts/{draftId}/unpublish",
        endpoint: "https://rareinsights.substack.com/api/v1/drafts/123/unpublish",
        probeMethod: "GET",
        status: 404,
        signal: "not-found",
        evidence: [],
      },
    };

    const unschedule = buildDraftMutationRunLog({
      publicationUrl: "https://rareinsights.substack.com/",
      plan: {
        operation: "unschedule",
        draftId: "123",
        draftUrl: "https://rareinsights.substack.com/publish/post/123",
        publicationUrl: "https://rareinsights.substack.com/",
        endpointTemplate: "/api/v1/drafts/{draftId}/unpublish",
        endpoint: "https://rareinsights.substack.com/api/v1/drafts/123/unpublish",
        method: "POST",
        sourceProbe: source.sourceProbe,
      },
      result: source,
    });

    assert.equal(unschedule.actionType, "draft.unschedule");
    assert.equal(unschedule.status, "success");

    const revise = buildDraftMutationRunLog({
      publicationUrl: "https://rareinsights.substack.com/",
      plan: {
        operation: "revise",
        draftId: "123",
        draftUrl: "https://rareinsights.substack.com/publish/post/123",
        publicationUrl: "https://rareinsights.substack.com/",
        endpointTemplate: "/api/v1/posts/{draftId}/revise",
        endpoint: "https://rareinsights.substack.com/api/v1/posts/123/revise",
        method: "POST",
        sourceProbe: source.sourceProbe,
      },
      result: {
        ...source,
        operation: "revise",
        message: "Revise mutation succeeded for draft 123.",
      },
    });

    assert.equal(revise.actionType, "draft.revise");
    assert.equal(revise.status, "success");
    assert.equal(revise.resultMessage, "Revise mutation succeeded for draft 123.");
    assert.equal(revise.draftId, "123");
  });

  it("records draft mutation failures and redacts failed-body material", () => {
    const failure = buildDraftMutationRunLog({
      publicationUrl: "https://rareinsights.substack.com/",
      plan: {
        operation: "revise",
        draftId: "456",
        draftUrl: "https://rareinsights.substack.com/publish/post/456",
        publicationUrl: "https://rareinsights.substack.com/",
        endpointTemplate: "/api/v1/posts/{draftId}/revise",
        endpoint: "https://rareinsights.substack.com/api/v1/posts/456/revise",
        method: "POST",
        sourceProbe: {
          operation: "revise",
          endpointTemplate: "/api/v1/posts/{draftId}/revise",
          endpoint: "https://rareinsights.substack.com/api/v1/posts/456/revise",
          probeMethod: "GET",
          status: 500,
          signal: "method-mismatch",
          evidence: ["probe"],
        },
      },
      result: {
        status: "failed",
        operation: "revise",
        method: "POST",
        draftId: "456",
        endpointTemplate: "/api/v1/posts/{draftId}/revise",
        endpoint: "https://rareinsights.substack.com/api/v1/posts/456/revise",
        statusCode: 500,
        error: "Authorization=Bearer abcdef123456; token=top-secret",
        message: "Substack returned HTTP 500.",
      },
    });

    assert.equal(failure.actionType, "draft.revise");
    assert.equal(failure.status, "failure");
    assert.equal(failure.error?.message, "Authorization=Bearer abcdef123456; token=top-secret");
    assert.equal(failure.error?.body?.includes("abcdef123456"), false);
    assert.equal(failure.error?.body?.includes("top-secret"), false);
    assert.equal(failure.resultMessage, "Substack returned HTTP 500.");
  });

  it("supports draft mutation run-log redaction fallbacks for missing URLs and errors", () => {
    const withoutDraftUrl = buildDraftMutationRunLog({
      publicationUrl: "https://rareinsights.substack.com/",
      plan: {
        operation: "unschedule",
        draftId: "789",
        draftUrl: undefined,
        publicationUrl: "https://rareinsights.substack.com/",
        endpointTemplate: "/api/v1/drafts/{draftId}/unpublish",
        endpoint: "https://rareinsights.substack.com/api/v1/drafts/789/unpublish",
        method: "POST",
        sourceProbe: {
          operation: "unschedule",
          endpointTemplate: "/api/v1/drafts/{draftId}/unpublish",
          endpoint: "https://rareinsights.substack.com/api/v1/drafts/789/unpublish",
          probeMethod: "GET",
          status: 404,
          signal: "not-found",
          evidence: [],
        },
      },
      result: {
        status: "failed",
        operation: "unschedule",
        method: "POST",
        draftId: "789",
        endpointTemplate: "/api/v1/drafts/{draftId}/unpublish",
        endpoint: "https://rareinsights.substack.com/api/v1/drafts/789/unpublish",
        statusCode: 500,
        message: "Draft mutation failed.",
      },
    });

    assert.equal(withoutDraftUrl.draftUrl, undefined);
    assert.equal(withoutDraftUrl.error?.message, "Draft mutation failed.");
  });

  it("records browser workflow draft failure details with fallback message/body values", () => {
    const failedBrowser = buildBrowserWorkflowRunLog({
      publicationUrl: "https://rareinsights.substack.com/",
      prepared: { ...prepared, mode: "publish", scheduleAt: "2026-06-20T09:00:00Z" },
      result: {
        status: "validation-failed",
        message: "",
        operation: "publish",
        mode: "publish",
        title: "Example",
        currentUrl: "https://rareinsights.substack.com/publish/post/999",
        trace: [],
      },
    });

    assert.equal(failedBrowser.status, "failure");
    assert.equal(failedBrowser.error?.message, "Workflow failed.");
    assert.equal(failedBrowser.error?.body, null);
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

function notePlan(): NoteWritePlan {
  return {
    status: "planned",
    operation: "schedule",
    method: "POST",
    endpoint: "https://rareinsights.substack.com/comment/feed/",
    text: "Read https://rareinsights.substack.com/p/example.",
    postUrl: "https://rareinsights.substack.com/p/example",
    scheduledAt: "2026-06-20T09:00:00Z",
    requestBody: {},
    message: "planned",
  };
}

function noteResult(): NoteWriteResult {
  return {
    status: "scheduled",
    operation: "schedule",
    method: "POST",
    endpoint: "https://rareinsights.substack.com/comment/feed/",
    noteId: "456",
    scheduledAt: "2026-06-20T09:00:00Z",
    message: "scheduled",
  };
}
