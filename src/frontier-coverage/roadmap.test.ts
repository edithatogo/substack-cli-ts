import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, it } from "vitest";
import { FRONTIER_COVERAGE_MATRIX } from "./matrix.js";
import { FRONTIER_COVERAGE_ROADMAP_PATH, renderCoverageRoadmap } from "./roadmap.js";
import type { CoverageMatrix } from "./schema.js";

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

  it("renders explicit empty states for decision records and launch gates", () => {
    const matrix: CoverageMatrix = {
      schemaVersion: 1,
      capabilities: [
        {
          id: "local-only",
          name: "Local-only inspection",
          domain: "creator-os",
          status: "implemented",
          paths: ["cli", "manual-admin"],
          primaryPath: "cli",
          fallbackPath: "manual-admin",
          manualPath: "manual-admin",
          safetyClass: "read-only",
          evidence: [{ kind: "test", label: "Local test", ref: "src/local-only.test.ts" }],
          nextAction: "Keep local fixture coverage current.",
        },
      ],
    };

    const markdown = renderCoverageRoadmap(matrix);

    assert.match(markdown, /No decision records are currently required\./);
    assert.match(markdown, /No external launch\/admin gates are currently recorded\./);
  });

  it("renders decision review dates and escapes launch gate table cells", () => {
    const matrix: CoverageMatrix = {
      schemaVersion: 1,
      capabilities: [
        {
          id: "publisher-gate",
          name: "Publisher | gate",
          domain: "distribution-agent",
          status: "probe-only",
          paths: ["api", "browser", "manual-admin"],
          primaryPath: "api",
          fallbackPath: "browser",
          manualPath: "manual-admin",
          safetyClass: "read-only",
          evidence: [{ kind: "doc", label: "Distribution docs", ref: "docs/distribution.md" }],
          nextAction: "Review | capture safely.",
          decisionRecord: {
            id: "DR-publisher-gate",
            reason: "Publisher endpoints need account-gated verification.",
            nextReview: "2026-09-01",
          },
          ownerDependency: "Publisher | admin access.",
        },
      ],
    };

    const markdown = renderCoverageRoadmap(matrix);

    assert.match(markdown, /- Next review: 2026-09-01/);
    assert.match(markdown, /Publisher \\| gate/);
    assert.match(markdown, /Publisher \\| admin access\./);
    assert.match(markdown, /Review \\| capture safely\./);
  });
});
