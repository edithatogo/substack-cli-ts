import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { materialFromCookieHeader } from "./auth.js";
import type { FetchLike } from "./client.js";
import {
  buildDraftMutationApprovalToken,
  buildDraftMutationExecutionPlan,
  executeDraftMutation,
  makeDraftMutationProbeSignalSeed,
  probeDraftMutationEndpoints,
} from "./draft-operations.js";
import type {
  DraftMutationExecutionPlan,
  DraftMutationProbeCandidate,
} from "./draft-operations.js";
import { createHash } from "node:crypto";

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

function draftMutationPlan(operation: "unschedule" | "revise"): DraftMutationExecutionPlan {
  const probe: DraftMutationProbeCandidate = {
    operation,
    endpointTemplate:
      operation === "unschedule"
        ? "/api/v1/drafts/{draftId}/unpublish"
        : "/api/v1/posts/{draftId}/revise",
    endpoint: `https://rareinsights.substack.com${operation === "unschedule" ? "/api/v1/drafts/123/unpublish" : "/api/v1/posts/123/revise"}`,
    probeMethod: "GET",
    status: 405,
    signal: "method-mismatch",
    evidence: ["Probe evidence"],
  };

  return {
    operation,
    draftId: "123",
    draftUrl: `https://rareinsights.substack.com/publish/post/${operation === "unschedule" ? "123" : "456"}`,
    publicationUrl: "https://rareinsights.substack.com/",
    endpointTemplate: probe.endpointTemplate,
    endpoint: probe.endpoint,
    method: "POST",
    sourceProbe: probe,
  };
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

  it("derives deterministic approval tokens from normalized inputs", () => {
    const publicationUrl = "https://rareinsights.substack.com/blog";
    const seed = makeDraftMutationProbeSignalSeed([
      {
        operation: "revise",
        endpointTemplate: "/api/v1/posts/{draftId}/revise",
        endpoint: "https://rareinsights.substack.com/api/v1/posts/123/revise",
        probeMethod: "GET",
        status: 405,
        signal: "method-mismatch",
        evidence: [],
      },
    ]);
    const generatedAt = "2026-08-07T10:00:00.000Z";
    const token = buildDraftMutationApprovalToken(
      `${publicationUrl}/?utm=abc#anchor`,
      "123",
      generatedAt,
      seed,
    );
    const expected = createHash("sha256")
      .update(
        `https://rareinsights.substack.com/|123|${generatedAt}|/api/v1/posts/{draftId}/revise:method-mismatch`,
      )
      .digest("hex");

    assert.equal(token, expected);
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
    });

    assert.equal(plan?.endpointTemplate, "/api/v1/drafts/{draftId}/unpublish");
    assert.equal(plan?.endpoint, "https://rareinsights.substack.com/api/v1/drafts/123/unpublish");
  });

  it("returns null for an execution plan when probe evidence cannot be reconciled", () => {
    const plan = buildDraftMutationExecutionPlan({
      operation: "revise",
      publicationUrl: "https://rareinsights.substack.com/",
      draftId: "123",
      probeReport: {
        status: "probed" as const,
        operation: "draft.mutation-probe" as const,
        publicationUrl: "https://rareinsights.substack.com/",
        draftId: "123",
        endpointCount: 1,
        reportId: "report-123",
        generatedAt: "2026-08-07T10:00:00.000Z",
        approvalToken: "token",
        supportsUnschedule: true,
        supportsRevise: false,
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
        ],
      },
    });

    assert.equal(plan, null);
  });
});

describe("draft mutation execution", () => {
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
});
