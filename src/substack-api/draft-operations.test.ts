import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { materialFromCookieHeader } from "./auth.js";
import type { FetchLike } from "./client.js";
import { probeDraftMutationEndpoints } from "./draft-operations.js";

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
