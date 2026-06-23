import assert from "node:assert/strict";
import { describe, it } from "vitest";
import {
  type CoverageMatrix,
  parseCoverageMatrix,
  summarizeCoverageMatrix,
  validateCoverageMatrix,
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

  it("reports top-level schema failures without a nested path", () => {
    const report = validateCoverageMatrix(undefined);

    assert.equal(report.status, "blocked");
    assert.ok(report.issues.some((issue) => issue.message.startsWith("matrix:")));
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

  it("requires declared primary, fallback, and manual paths to be listed", () => {
    const bad = matrix({
      primaryPath: "api",
      fallbackPath: "browser",
      manualPath: "manual-admin",
      paths: ["cli"],
    });

    const report = validateCoverageMatrix(bad);

    assert.equal(report.status, "blocked");
    assert.ok(report.issues.some((issue) => issue.code === "primary-path-missing"));
    assert.ok(report.issues.some((issue) => issue.code === "fallback-path-missing"));
    assert.ok(report.issues.some((issue) => issue.code === "manual-path-missing"));
  });

  it("requires a primary path for partial coverage statuses", () => {
    const bad = matrix({
      status: "probe-only",
      safetyClass: "read-only",
      paths: ["api", "browser", "manual-admin"],
      primaryPath: undefined,
      fallbackPath: "browser",
      manualPath: "manual-admin",
      decisionRecord: {
        id: "DR-probe",
        reason: "Capture-first until the endpoint contract is verified.",
      },
    });

    const report = validateCoverageMatrix(bad);

    assert.equal(report.status, "blocked");
    assert.ok(report.issues.some((issue) => issue.code === "primary-path-required"));
  });

  it("requires evidence for claimed coverage", () => {
    const bad = matrix({ evidence: [] });

    const report = validateCoverageMatrix(bad);

    assert.equal(report.status, "blocked");
    assert.ok(report.issues.some((issue) => issue.code === "evidence-required"));
  });

  it("blocks duplicate capability IDs", () => {
    const duplicate = matrix();
    duplicate.capabilities.push({ ...duplicate.capabilities[0] });

    const report = validateCoverageMatrix(duplicate);

    assert.equal(report.status, "blocked");
    assert.ok(report.issues.some((issue) => issue.code === "duplicate-capability-id"));
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

  it("requires unsupported capabilities to use the unsupported safety class", () => {
    const bad = matrix({
      status: "unsupported",
      safetyClass: "read-only",
      paths: ["manual-admin"],
      primaryPath: undefined,
      fallbackPath: undefined,
      manualPath: undefined,
      evidence: [{ kind: "official-doc", label: "App-only surface", ref: "https://example.com" }],
      decisionRecord: {
        id: "DR-unsupported",
        reason: "No safe CLI path exists.",
      },
    });

    const report = validateCoverageMatrix(bad);

    assert.equal(report.status, "blocked");
    assert.ok(report.issues.some((issue) => issue.code === "unsupported-safety-class"));
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

function matrix(override: Partial<CoverageMatrix["capabilities"][number]> = {}): CoverageMatrix {
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
