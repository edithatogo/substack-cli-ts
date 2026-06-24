import assert from "node:assert/strict";
import { describe, it } from "vitest";
import {
  assertCoverageMatrixReady,
  FRONTIER_COVERAGE_MATRIX,
  getCoverageCapabilitiesByDomain,
  getCoverageMatrix,
} from "./matrix.js";
import {
  COVERAGE_DOMAINS,
  type CoverageMatrix,
  summarizeCoverageMatrix,
  validateCoverageMatrix,
} from "./schema.js";

describe("frontier coverage matrix", () => {
  it("is valid against the strict coverage schema", () => {
    const report = validateCoverageMatrix(FRONTIER_COVERAGE_MATRIX);

    assert.equal(report.status, "ready");
    assert.equal(report.issueCount, 0);
    assert.doesNotThrow(() => assertCoverageMatrixReady());
  });

  it("covers every required Substack domain", () => {
    const summary = summarizeCoverageMatrix(getCoverageMatrix());

    for (const domain of COVERAGE_DOMAINS) {
      assert.ok(summary.byDomain[domain] > 0, `${domain} should have at least one row`);
    }
  });

  it("keeps capture-first and unsupported areas backed by decision records", () => {
    const guarded = FRONTIER_COVERAGE_MATRIX.capabilities.filter((capability) =>
      ["probe-only", "planning-only", "manual-admin", "unsupported"].includes(capability.status),
    );

    assert.ok(guarded.length >= 6);
    assert.ok(guarded.every((capability) => capability.decisionRecord?.id));
  });

  it("includes major implemented, read-only, planning, probe, and unsupported statuses", () => {
    const summary = summarizeCoverageMatrix(FRONTIER_COVERAGE_MATRIX);

    assert.ok(summary.byStatus.implemented > 0);
    assert.ok(summary.byStatus["read-only"] > 0);
    assert.ok(summary.byStatus["planning-only"] > 0);
    assert.ok(summary.byStatus["probe-only"] > 0);
    assert.ok(summary.byStatus.unsupported > 0);
  });

  it("keeps implemented helper defaults when optional inputs are omitted", () => {
    const postWorkflow = FRONTIER_COVERAGE_MATRIX.capabilities.find(
      (capability) => capability.id === "post-draft-publish-schedule",
    );

    assert.equal(postWorkflow?.primaryPath, "cli");
    assert.equal(postWorkflow?.fallbackPath, "browser");
    assert.equal(postWorkflow?.safetyClass, "write-with-confirmation");
  });

  it("lists capabilities by domain", () => {
    const media = getCoverageCapabilitiesByDomain("native-media");

    assert.ok(media.some((capability) => capability.id === "image-media-upload"));
    assert.ok(media.some((capability) => capability.id === "native-video-posts"));
  });

  it("throws with capability diagnostics when a supplied matrix is blocked", () => {
    const blocked: CoverageMatrix = {
      schemaVersion: 1,
      capabilities: [
        {
          ...FRONTIER_COVERAGE_MATRIX.capabilities[0],
          id: "broken-capability",
          fallbackPath: undefined,
        },
      ],
    };

    assert.throws(
      () => assertCoverageMatrixReady(blocked),
      /broken-capability: Covered capabilities need a fallback path\./,
    );
  });
});
