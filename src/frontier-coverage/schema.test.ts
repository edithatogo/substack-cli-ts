import assert from "node:assert/strict";
import { describe, it } from "vitest";
import {
  parseCoverageMatrix,
  summarizeCoverageMatrix,
  validateCoverageMatrix,
  type CoverageMatrix,
} from "./schema.js";

describe("coverage schema", () => {
  it("accepts a fully evidenced implemented capability", () => {
    const report = validateCoverageMatrix(matrix());

    assert.equal(report.status, "ready");
    assert.equal(report.issueCount, 0);
    assert.equal(summarizeCoverageMatrix(matrix()).byStatus.implemented, 1);
  });

  it("blocks invalid enum values at the schema boundary", () => {
    const bad = matrix({
      status: "done",
    } as unknown as Partial<CoverageMatrix["capabilities"][number]>);

    const report = validateCoverageMatrix(bad);

    assert.equal(report.status, "blocked");
    assert.ok(report.issues.some((issue) => issue.code === "schema-invalid"));
    assert.throws(() => parseCoverageMatrix(bad));
  });

  it("requires fallback and manual paths for covered capabilities", () => {
    const bad = matrix({
      fallbackPath: undefined,
      manualPath: undefined,
    });

    const report = validateCoverageMatrix(bad);

    assert.equal(report.status, "blocked");
    assert.ok(report.issues.some((issue) => issue.code === "fallback-path-required"));
    assert.ok(report.issues.some((issue) => issue.code === "manual-path-required"));
  });

  it("requires evidence for claimed coverage", () => {
    const bad = matrix({ evidence: [] });

    const report = validateCoverageMatrix(bad);

    assert.equal(report.status, "blocked");
    assert.ok(report.issues.some((issue) => issue.code === "evidence-required"));
  });

  it("requires decision records for unsupported and capture-first gaps", () => {
    const unsupported = matrix({
      status: "unsupported",
      safetyClass: "unsupported",
      paths: ["manual-admin"],
      primaryPath: undefined,
      fallbackPath: undefined,
      manualPath: undefined,
      evidence: [{ kind: "official-doc", label: "App-only surface", ref: "https://example.com" }],
      decisionRecord: undefined,
    });
    const probeOnly = matrix({
      id: "analytics-probe",
      status: "probe-only",
      safetyClass: "read-only",
      primaryPath: "api",
      fallbackPath: "browser",
      manualPath: "manual-admin",
      paths: ["api", "browser", "manual-admin"],
      decisionRecord: undefined,
    });

    assert.ok(
      validateCoverageMatrix(unsupported).issues.some(
        (issue) => issue.code === "decision-record-required",
      ),
    );
    assert.ok(
      validateCoverageMatrix(probeOnly).issues.some(
        (issue) => issue.code === "decision-record-required",
      ),
    );
  });

  it("summarizes matrix status and domain counts", () => {
    const summary = summarizeCoverageMatrix({
      schemaVersion: 1,
      capabilities: [
        matrix().capabilities[0],
        {
          ...matrix().capabilities[0],
          id: "live-rtmp",
          name: "Live RTMP",
          domain: "live",
          status: "planning-only",
          safetyClass: "planning-only",
          decisionRecord: {
            id: "DR-live-rtmp",
            reason: "Capture-first until live dashboard endpoints are verified.",
          },
        },
      ],
    });

    assert.equal(summary.total, 2);
    assert.equal(summary.byStatus.implemented, 1);
    assert.equal(summary.byStatus["planning-only"], 1);
    assert.equal(summary.byDomain.live, 1);
  });
});

function matrix(
  override: Partial<CoverageMatrix["capabilities"][number]> = {},
): CoverageMatrix {
  return {
    schemaVersion: 1,
    capabilities: [
      {
        id: "draft-publish",
        name: "Draft and publish workflow",
        domain: "post-editor",
        status: "implemented",
        paths: ["cli", "api", "browser", "manual-admin"],
        primaryPath: "cli",
        fallbackPath: "browser",
        manualPath: "manual-admin",
        safetyClass: "write-with-confirmation",
        evidence: [
          { kind: "source", label: "CLI publish command", ref: "src/cli.ts" },
          { kind: "test", label: "Publish tests", ref: "src/substack-api/publish-write.test.ts" },
        ],
        missingEvidence: [],
        nextAction: "Keep endpoint fixtures current.",
        ...override,
      },
    ],
  };
}
