import assert from "node:assert/strict";
import { describe, it } from "vitest";
import {
  FRONTIER_COVERAGE_MATRIX,
  assertCoverageMatrixReady,
  getCoverageCapabilitiesByDomain,
  getCoverageMatrix,
} from "./matrix.js";
import { COVERAGE_DOMAINS, summarizeCoverageMatrix, validateCoverageMatrix } from "./schema.js";

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

  it("lists capabilities by domain", () => {
    const media = getCoverageCapabilitiesByDomain("native-media");

    assert.ok(media.some((capability) => capability.id === "image-media-upload"));
    assert.ok(media.some((capability) => capability.id === "native-video-posts"));
  });
});
