import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, it } from "vitest";
import { FRONTIER_COVERAGE_MATRIX } from "./matrix.js";
import { FRONTIER_COVERAGE_ROADMAP_PATH, renderCoverageRoadmap } from "./roadmap.js";

describe("frontier coverage roadmap renderer", () => {
  it("renders a stable human-readable roadmap", () => {
    const markdown = renderCoverageRoadmap();

    assert.match(markdown, /^# Frontier Coverage Roadmap/);
    assert.match(markdown, /## Status Summary/);
    assert.match(markdown, /## Domain Coverage/);
    assert.match(markdown, /## Capability Matrix/);
    assert.match(markdown, /## Decision Records/);
    assert.match(markdown, /## Launch\/Admin Gates/);
    assert.ok(markdown.includes("| Capabilities | 20 |"));
  });

  it("renders every matrix capability", () => {
    const markdown = renderCoverageRoadmap(FRONTIER_COVERAGE_MATRIX);

    for (const capability of FRONTIER_COVERAGE_MATRIX.capabilities) {
      assert.ok(markdown.includes(capability.name), `${capability.id} should render`);
    }
  });

  it("includes fallback, manual, and decision-record evidence", () => {
    const markdown = renderCoverageRoadmap();

    assert.match(markdown, /browser/);
    assert.match(markdown, /manual-admin/);
    assert.match(markdown, /DR-live-video-capture/);
    assert.match(markdown, /DR-analytics-dashboard/);
  });

  it("exports the expected docs path", () => {
    assert.equal(FRONTIER_COVERAGE_ROADMAP_PATH, "docs/frontier-coverage-roadmap.md");
  });

  it("keeps the checked-in roadmap synchronized with the renderer", async () => {
    const checkedIn = await readFile(FRONTIER_COVERAGE_ROADMAP_PATH, "utf8");

    assert.equal(checkedIn, renderCoverageRoadmap());
  });
});
