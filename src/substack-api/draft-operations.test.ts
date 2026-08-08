import assert from "node:assert/strict";
import { mkdtemp, rm, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "vitest";
import { materialFromCookieHeader } from "./auth.js";
import type { FetchLike } from "./client.js";
import {
  buildDraftMutationActionId,
  buildDraftMutationApprovalToken,
  buildDraftMutationExecutionPlan,
  buildDraftMutationPlanHash,
  consumeDraftMutationActionPlan,
  hasMatchingDraftMutationBeforeState,
  isDraftMutationPlanReplaySafe,
  isDraftMutationPlanExpired,
  makeDraftMutationProbeSignalSeed,
  probeDraftMutationEndpoints,
  executeDraftMutation,
} from "./draft-operations.js";
import type {
  DraftMutationExecutionPlan,
  DraftMutationProbeCandidate,
} from "./draft-operations.js";

function material() {
  return materialFromCookieHeader(
    "substack.sid=fake-long-secret-value",
    "https://rareinsights.substack.com",
    "env",
  );
}

function response(status: number): ReturnType<FetchLike> {
  return Promise.resolve({
    status,
    text: () => Promise.resolve("{}"),
  });
}

function responseWithText(status: number, body: string): ReturnType<FetchLike> {
  return Promise.resolve({
    status,
    text: () => Promise.resolve(body),
  });
}

function draftProbeReport(operation: "unschedule" | "revise", draftId = "123") {
  const endpointTemplate =
    operation === "unschedule"
      ? "/api/v1/drafts/{draftId}/unpublish"
      : "/api/v1/posts/{draftId}/revise";

  return {
    status: "probed" as const,
    operation: "draft.mutation-probe" as const,
    publicationUrl: "https://rareinsights.substack.com/",
    draftId,
    endpointCount: 1,
    reportId: "report-123",
    generatedAt: "2026-08-07T10:00:00.000Z",
    approvalToken: "token",
    supportsUnschedule: operation === "unschedule",
    supportsRevise: operation === "revise",
    message: "ok",
    probes: [
      {
        operation,
        endpointTemplate,
        endpoint: `https://rareinsights.substack.com${endpointTemplate.replaceAll(
          "{draftId}",
          draftId,
        )}`,
        probeMethod: "GET",
        status: 200,
        signal: "likely-route",
        evidence: [],
      },
    ],
  };
}

function draftMutationPlan(operation: "unschedule" | "revise"): DraftMutationExecutionPlan {
  const draftId = operation === "unschedule" ? "123" : "456";
  const plan = buildDraftMutationExecutionPlan({
    operation,
    publicationUrl: "https://rareinsights.substack.com/",
    draftId,
    probeReport: draftProbeReport(operation, draftId),
    actor: "tester@example.com",
    publicationId: 42,
    beforeState: {
      isPublished: operation === "revise",
      scheduledAt: null,
    },
    afterState: {
      isPublished: operation !== "unschedule",
      scheduledAt: null,
    },
    draftUpdatedAt: "2026-08-07T09:00:00.000Z",
  });
  if (!plan) {
    throw new Error("Failed to build plan in test");
  }
  return plan;
}

describe("draft mutation endpoint probing", () => {
  it("returns safe negative evidence when no candidates respond", async () => {
    const report = await probeDraftMutationEndpoints(material(), () => response(404), "123");

    assert.equal(report.status, "probed");
    assert.equal(report.endpointCount, 5);
    assert.equal(report.supportsUnschedule, false);
    assert.equal(report.supportsRevise, false);
    assert.equal(
      report.probes.every((probe) => probe.signal === "not-found"),
      true,
    );
    assert.equal(
      report.message,
      "No draft mutation endpoint shapes were confirmed. Use capture-in-loop methods to gather first-party evidence before attempting writes.",
    );
  });

  it("marks unschedule as likely when method mismatch indicates route existence", async () => {
    const fetchImpl: FetchLike = (url) => {
      if (url.includes("/api/v1/drafts/123/unpublish")) {
        return response(405);
      }
      return response(404);
    };
    const report = await probeDraftMutationEndpoints(material(), fetchImpl, "123");

    assert.equal(report.supportsUnschedule, true);
    assert.equal(report.supportsRevise, false);
    const unscheduleProbe = report.probes.find(
      (probe) => probe.endpointTemplate === "/api/v1/drafts/{draftId}/unpublish",
    );
    assert.equal(unscheduleProbe?.signal, "method-mismatch");
  });

  it("marks network failures as probe-level network errors", async () => {
    const fetchImpl: FetchLike = (url) => {
      if (url.includes("/api/v1/posts/123/revise")) {
        return Promise.resolve(response(500));
      }
      throw new Error("offline");
    };

    const report = await probeDraftMutationEndpoints(material(), fetchImpl, "123");

    const networkProbe = report.probes.find(
      (probe) => probe.endpointTemplate === "/api/v1/drafts/{draftId}/unpublish",
    );
    assert.equal(networkProbe?.signal, "network-error");
    assert.equal(report.supportsUnschedule, false);
    assert.equal(report.supportsRevise, false);
    assert.equal(
      report.message,
      "No draft mutation endpoint shapes were confirmed. Use capture-in-loop methods to gather first-party evidence before attempting writes.",
    );
  });

  it("marks revise as likely when endpoint responds with readable status", async () => {
    const fetchImpl: FetchLike = (url) => {
      if (url.includes("/api/v1/posts/123/revise")) {
        return response(200);
      }
      return response(404);
    };
    const report = await probeDraftMutationEndpoints(material(), fetchImpl, "123");

    assert.equal(report.supportsRevise, true);
    assert.equal(report.supportsUnschedule, false);
    assert.equal(
      report.message,
      "At least one mutation endpoint shape appears reachable under the current session.",
    );
    const reviseProbe = report.probes.find(
      (probe) => probe.endpointTemplate === "/api/v1/posts/{draftId}/revise",
    );
    assert.equal(reviseProbe?.signal, "likely-route");
    assert.equal(reviseProbe?.status, 200);
  });
});

describe("draft mutation execution planning", () => {
  it("derives reproducible probe seeds", () => {
    const probes: DraftMutationProbeCandidate[] = [
      {
        operation: "unschedule",
        endpointTemplate: "/api/v1/posts/{draftId}/unpublish",
        endpoint: "https://rareinsights.substack.com/api/v1/posts/123/unpublish",
        probeMethod: "GET",
        status: 404,
        signal: "not-found",
        evidence: [],
      },
      {
        operation: "unschedule",
        endpointTemplate: "/api/v1/drafts/{draftId}/unpublish",
        endpoint: "https://rareinsights.substack.com/api/v1/drafts/123/unpublish",
        probeMethod: "GET",
        status: 405,
        signal: "method-mismatch",
        evidence: [],
      },
    ];

    assert.equal(
      makeDraftMutationProbeSignalSeed(probes),
      "/api/v1/drafts/{draftId}/unpublish:method-mismatch|/api/v1/posts/{draftId}/unpublish:not-found",
    );
  });

  it("builds a mutation execution plan with deterministic probe priority", () => {
    const report = {
      status: "probed" as const,
      operation: "draft.mutation-probe" as const,
      publicationUrl: "https://rareinsights.substack.com/",
      draftId: "123",
      endpointCount: 2,
      reportId: "report-123",
      generatedAt: "2026-08-07T10:00:00.000Z",
      approvalToken: "token",
      supportsUnschedule: true,
      supportsRevise: true,
      message: "",
      probes: [
        {
          operation: "unschedule",
          endpointTemplate: "/api/v1/posts/{draftId}/unpublish",
          endpoint: "https://rareinsights.substack.com/api/v1/posts/123/unpublish",
          probeMethod: "GET",
          status: 200,
          signal: "likely-route",
          evidence: [],
        },
        {
          operation: "unschedule",
          endpointTemplate: "/api/v1/drafts/{draftId}/unpublish",
          endpoint: "https://rareinsights.substack.com/api/v1/drafts/123/unpublish",
          probeMethod: "GET",
          status: 405,
          signal: "method-mismatch",
          evidence: [],
        },
      ],
    };

    const plan = buildDraftMutationExecutionPlan({
      operation: "unschedule",
      publicationUrl: report.publicationUrl,
      draftId: "123",
      probeReport: report,
      actor: "tester@example.com",
      publicationId: 99,
      beforeState: {
        isPublished: true,
        scheduledAt: "2026-08-07T09:00:00.000Z",
      },
      afterState: {
        isPublished: false,
        scheduledAt: null,
      },
      draftUpdatedAt: "2026-08-07T09:00:00.000Z",
    });

    assert.equal(plan?.endpointTemplate, "/api/v1/drafts/{draftId}/unpublish");
    assert.equal(plan?.endpoint, "https://rareinsights.substack.com/api/v1/drafts/123/unpublish");
    assert.equal(plan?.planSchemaVersion, 1);
    assert.equal(plan?.actor, "tester@example.com");
    assert.equal(plan?.publicationId, 99);
    assert.equal(plan?.beforeState.isPublished, true);
  });

  it("derives immutable approval artifacts from plan inputs", () => {
    const plan = buildDraftMutationExecutionPlan({
      operation: "revise",
      publicationUrl: "https://rareinsights.substack.com/blog",
      draftId: "999",
      probeReport: draftProbeReport("revise", "999"),
      actor: "revise@example.com",
      publicationId: 101,
      beforeState: { isPublished: true, scheduledAt: null },
      afterState: { isPublished: true, scheduledAt: null },
      draftUpdatedAt: "2026-08-07T11:00:00.000Z",
      ttlSeconds: 60,
    });

    assert.ok(plan);
    const expectedToken = buildDraftMutationApprovalToken(
      plan.planHash,
      plan.actor,
      plan.expiresAt,
    );
    assert.equal(plan?.approvalToken, expectedToken);
    assert.equal(plan?.planHash, buildDraftMutationPlanHash(plan));
    assert.equal(
      plan?.actionId,
      buildDraftMutationActionId(
        "https://rareinsights.substack.com/blog",
        "revise@example.com",
        "revise",
        "999",
        101,
      ),
    );
  });

  it("rejects malformed probe evidence when building execution plans", () => {
    const report = {
      status: "probed" as const,
      operation: "draft.mutation-probe" as const,
      publicationUrl: "https://rareinsights.substack.com/",
      draftId: "123",
      endpointCount: 1,
      reportId: "report-123",
      generatedAt: "2026-08-07T10:00:00.000Z",
      approvalToken: "token",
      supportsUnschedule: false,
      supportsRevise: true,
      message: "",
      probes: [
        {
          operation: "unschedule",
          endpointTemplate: "/api/v1/drafts/{draftId}/revise",
          endpoint: "https://rareinsights.substack.com/api/v1/drafts/123/revise",
          probeMethod: "GET",
          status: 200,
          signal: "likely-route",
          evidence: [],
        },
      ],
    };

    const plan = buildDraftMutationExecutionPlan({
      operation: "revise",
      publicationUrl: report.publicationUrl,
      draftId: "123",
      probeReport: report,
      actor: "tester@example.com",
      publicationId: 42,
      beforeState: {},
      afterState: {},
    });

    assert.equal(plan, null);
  });
});

describe("draft mutation execution", () => {
  it("supports replay and reuse safety checks with deterministic action IDs", async () => {
    const temp = await mkdtemp(join(tmpdir(), "substack-cli-draft-mutation-"));
    const state = join(temp, "actions.json");
    const plan = draftMutationPlan("unschedule");

    const firstCheck = await isDraftMutationPlanReplaySafe(plan, state);
    assert.equal(firstCheck.status, "ok");

    const consumed = await consumeDraftMutationActionPlan(plan, state);
    assert.equal(consumed.status, "ok");

    const secondCheck = await consumeDraftMutationActionPlan(plan, state);
    assert.equal(secondCheck.status, "consumed");

    const payload = JSON.parse(await readFile(state, "utf8"));
    assert.equal(payload.actions.length, 1);
    assert.equal(payload.actions[0].actionId, plan.actionId);
    assert.equal(payload.actions[0].planHash, plan.planHash);

    await rm(temp, { recursive: true, force: true });
  });

  it("detects hash mismatch for action replay", async () => {
    const temp = await mkdtemp(join(tmpdir(), "substack-cli-draft-mutation-"));
    const state = join(temp, "actions.json");
    const plan = draftMutationPlan("unschedule");

    const consumed = await consumeDraftMutationActionPlan(plan, state);
    assert.equal(consumed.status, "ok");

    const mutatedPlan = {
      ...plan,
      beforeState: { isPublished: true, scheduledAt: "changed" },
    };
    const replayPlanHash = buildDraftMutationPlanHash({
      ...mutatedPlan,
      planHash: "",
    });
    const mutatedPlanWithHash = {
      ...mutatedPlan,
      planHash: replayPlanHash,
      approvalToken: buildDraftMutationApprovalToken(
        replayPlanHash,
        mutatedPlan.actor,
        plan.expiresAt,
      ),
    };
    const replay = await isDraftMutationPlanReplaySafe(mutatedPlanWithHash, state);
    assert.equal(replay.status, "hash-mismatch");
    assert.equal(replay.existingPlanHash, plan.planHash);

    await rm(temp, { recursive: true, force: true });
  });

  it("checks before-state expectations", () => {
    assert.equal(
      hasMatchingDraftMutationBeforeState(
        { isPublished: true, scheduledAt: null },
        { isPublished: true, scheduledAt: null },
      ),
      true,
    );
    assert.equal(
      hasMatchingDraftMutationBeforeState(
        { isPublished: true, scheduledAt: null },
        { isPublished: false, scheduledAt: null },
      ),
      false,
    );
  });

  it("flags expired plans", () => {
    const plan = {
      ...draftMutationPlan("revise"),
      expiresAt: "2000-01-01T00:00:00.000Z",
    };
    assert.equal(isDraftMutationPlanExpired(plan, new Date("2000-01-02T00:00:00.000Z")), true);
  });

  it("treats write-network errors as failed mutation results", async () => {
    const plan = draftMutationPlan("unschedule");
    const result = await executeDraftMutation(plan, material(), () => responseWithText(0, "{}"));

    assert.equal(result.status, "failed");
    assert.equal(
      result.message,
      "Network error: failed to reach Substack while attempting draft mutation.",
    );
    assert.equal(result.error, "Network error");
    assert.equal(result.statusCode, 0);
  });

  it("treats write HTTP errors as failed mutation results", async () => {
    const plan = draftMutationPlan("revise");
    const result = await executeDraftMutation(plan, material(), () => responseWithText(500, "{}"));

    assert.equal(result.status, "failed");
    assert.equal(result.message, "Substack returned HTTP 500.");
    assert.equal(result.error, "HTTP 500");
    assert.equal(result.statusCode, 500);
  });

  it("extracts publish URLs from successful mutation responses", async () => {
    const plan = draftMutationPlan("unschedule");
    const result = await executeDraftMutation(plan, material(), () =>
      responseWithText(204, '{"post_url":"https://rareinsights.substack.com/p/example"}'),
    );

    assert.equal(result.status, "success");
    assert.equal(result.statusCode, 204);
    assert.equal(result.publishedUrl, "https://rareinsights.substack.com/p/example");
    assert.equal(result.message, "Unschedule mutation succeeded for draft 123.");
  });

  it("executes and reports successful delete-style mutations", async () => {
    const plan = {
      ...draftMutationPlan("unschedule"),
      method: "DELETE" as const,
      endpointTemplate: "/api/v1/drafts/{draftId}",
      endpoint: "https://rareinsights.substack.com/api/v1/drafts/123",
    };

    const result = await executeDraftMutation(plan, material(), () => responseWithText(200, "{}"));

    assert.equal(result.status, "success");
    assert.equal(result.method, "DELETE");
    assert.equal(result.error, undefined);
    assert.equal(result.message, "Unschedule mutation succeeded for draft 123.");
  });

  it("accepts publish URL from `url` fallback field", async () => {
    const plan = draftMutationPlan("unschedule");
    const result = await executeDraftMutation(plan, material(), () =>
      responseWithText(204, '{"url":"https://rareinsights.substack.com/p/fallback"}'),
    );

    assert.equal(result.status, "success");
    assert.equal(result.statusCode, 204);
    assert.equal(result.publishedUrl, "https://rareinsights.substack.com/p/fallback");
    assert.equal(result.message, "Unschedule mutation succeeded for draft 123.");
  });

  it("reports delete-path network failures as failed mutations", async () => {
    const plan = {
      ...draftMutationPlan("unschedule"),
      method: "DELETE" as const,
      endpointTemplate: "/api/v1/drafts/{draftId}",
      endpoint: "https://rareinsights.substack.com/api/v1/drafts/123",
    };

    const result = await executeDraftMutation(plan, material(), () => responseWithText(0, "{}"));

    assert.equal(result.status, "failed");
    assert.equal(result.error, "Network error");
    assert.equal(
      result.message,
      "Network error: failed to reach Substack while attempting draft mutation.",
    );
    assert.equal(result.statusCode, 0);
  });

  it("classifies and reports all status families from probe candidates", async () => {
    const fetchImpl: FetchLike = (url) => {
      if (url.includes("/api/v1/drafts/321/unpublish")) {
        return response(405);
      }
      if (url.includes("/api/v1/posts/321/unpublish")) {
        return response(403);
      }
      if (url.includes("/api/v1/drafts/321/schedule")) {
        return response(404);
      }
      if (url.includes("/api/v1/posts/321/revise")) {
        return response(199);
      }
      if (url.includes("/api/v1/drafts/321/revise")) {
        return response(401);
      }
      throw new Error("offline");
    };

    const report = await probeDraftMutationEndpoints(material(), fetchImpl, "321");

    const probeSignals = new Map(
      report.probes.map((probe) => [probe.endpointTemplate, probe.signal]),
    );
    assert.equal(report.probes.length, 5);
    assert.equal(probeSignals.get("/api/v1/drafts/{draftId}/unpublish"), "method-mismatch");
    assert.equal(probeSignals.get("/api/v1/posts/{draftId}/unpublish"), "forbidden");
    assert.equal(probeSignals.get("/api/v1/drafts/{draftId}/schedule"), "not-found");
    assert.equal(probeSignals.get("/api/v1/posts/{draftId}/revise"), "unexpected");
    assert.equal(probeSignals.get("/api/v1/drafts/{draftId}/revise"), "unauthorized");
  });

  it("reports delete-path failures as failed mutations", async () => {
    const plan = {
      ...draftMutationPlan("unschedule"),
      method: "DELETE" as const,
      endpointTemplate: "/api/v1/drafts/{draftId}",
      endpoint: "https://rareinsights.substack.com/api/v1/drafts/123",
    };

    const result = await executeDraftMutation(plan, material(), () => responseWithText(500, "{}"));

    assert.equal(result.status, "failed");
    assert.equal(result.error, "HTTP 500");
    assert.equal(result.message, "Substack returned HTTP 500.");
    assert.equal(result.statusCode, 500);
  });
});
