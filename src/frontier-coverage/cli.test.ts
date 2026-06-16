import assert from "node:assert/strict";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "vitest";
import {
  buildCoverageDecisionOutput,
  buildCoverageGapOutput,
  buildCoverageInspectOutput,
  buildCoverageReportOutput,
  buildCoverageValidationOutput,
  loadCoverageMatrix,
  loadCoverageMatrixInput,
  renderCoverageReport,
} from "./cli.js";
import { FRONTIER_COVERAGE_MATRIX } from "./matrix.js";
import type { CoverageMatrix } from "./schema.js";

describe("frontier coverage CLI helpers", () => {
  it("validates the canonical matrix", () => {
    const output = buildCoverageValidationOutput(FRONTIER_COVERAGE_MATRIX);

    assert.equal(output.operation, "coverage.validate");
    assert.equal(output.status, "ready");
    assert.equal(output.issueCount, 0);
    assert.ok(output.summary.total > 0);
  });

  it("loads a matrix fixture from disk", async () => {
    const dir = await mkdtemp(join(tmpdir(), "coverage-matrix-"));
    const file = join(dir, "matrix.json");
    await writeFile(file, JSON.stringify(FRONTIER_COVERAGE_MATRIX), "utf8");

    const matrix = await loadCoverageMatrix(file);

    assert.equal(matrix.capabilities.length, FRONTIER_COVERAGE_MATRIX.capabilities.length);
  });

  it("loads raw matrix input for structured schema validation", async () => {
    const dir = await mkdtemp(join(tmpdir(), "coverage-matrix-invalid-"));
    const file = join(dir, "matrix.json");
    await writeFile(file, JSON.stringify({ schemaVersion: 1, capabilities: [{}] }), "utf8");

    const input = await loadCoverageMatrixInput(file);
    const output = buildCoverageValidationOutput(input);

    assert.equal(output.status, "blocked");
    assert.equal(output.summary, undefined);
    assert.ok(output.issues.some((issue) => issue.code === "schema-invalid"));
  });

  it("builds report, gap, and decision outputs", () => {
    const report = buildCoverageReportOutput(FRONTIER_COVERAGE_MATRIX);
    const gaps = buildCoverageGapOutput(FRONTIER_COVERAGE_MATRIX, { status: "probe-only" });
    const decisions = buildCoverageDecisionOutput(
      FRONTIER_COVERAGE_MATRIX,
      "DR-analytics-dashboard",
    );

    assert.equal(report.operation, "coverage.report");
    assert.equal(report.status, "ready");
    assert.ok(gaps.gaps.every((gap) => gap.status === "probe-only"));
    assert.equal(decisions.count, 1);
    assert.equal(decisions.decisions[0]?.decisionRecord.id, "DR-analytics-dashboard");
  });

  it("blocks missing decision ID lookups in the JSON payload", () => {
    const output = buildCoverageDecisionOutput(FRONTIER_COVERAGE_MATRIX, "DR-does-not-exist");

    assert.equal(output.status, "blocked");
    assert.equal(output.count, 0);
    assert.match(output.message, /not found/i);
  });

  it("inspects coverage capabilities by ID", () => {
    const output = buildCoverageInspectOutput(
      FRONTIER_COVERAGE_MATRIX,
      "post-draft-publish-schedule",
    );
    const missing = buildCoverageInspectOutput(FRONTIER_COVERAGE_MATRIX, "missing-capability");

    assert.equal(output.status, "ready");
    assert.equal(output.capability?.id, "post-draft-publish-schedule");
    assert.equal(missing.status, "blocked");
    assert.match(missing.message, /not found/i);
  });

  it("filters gaps by domain and renders markdown reports", () => {
    const gaps = buildCoverageGapOutput(FRONTIER_COVERAGE_MATRIX, {
      domain: "analytics-revenue",
    });
    const markdown = renderCoverageReport(FRONTIER_COVERAGE_MATRIX, "markdown");
    const json = JSON.parse(renderCoverageReport(FRONTIER_COVERAGE_MATRIX, "json")) as {
      operation: string;
    };

    assert.ok(gaps.gaps.every((gap) => gap.domain === "analytics-revenue"));
    assert.match(markdown, /^# Frontier Coverage Roadmap/);
    assert.equal(json.operation, "coverage.report");
  });

  it("reports validation blockers for supplied matrices", () => {
    const blocked: CoverageMatrix = {
      schemaVersion: 1,
      capabilities: [
        {
          ...FRONTIER_COVERAGE_MATRIX.capabilities[0],
          evidence: [],
        },
      ],
    };

    const output = buildCoverageValidationOutput(blocked);

    assert.equal(output.status, "blocked");
    assert.ok(output.issues.some((issue) => issue.code === "evidence-required"));
  });
});
