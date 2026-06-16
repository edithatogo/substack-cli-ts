import assert from "node:assert/strict";
import { describe, it } from "vitest";
import {
  buildCoverageMatrixResource,
  buildCoverageRoadmapResource,
  buildDecisionRecordsResource,
  buildLaunchChecklistResource,
} from "./mcp-resources.js";

describe("frontier coverage MCP resources", () => {
  it("builds redacted coverage resource payloads", () => {
    const matrix = buildCoverageMatrixResource();
    const serialized = JSON.stringify(matrix);

    assert.match(serialized, /post-draft-publish-schedule/);
    assert.equal(serialized.includes("SUBSTACK_PASSWORD"), false);
    assert.equal(serialized.includes("cookie="), false);
  });

  it("builds roadmap and launch checklist markdown", () => {
    assert.match(buildCoverageRoadmapResource(), /^# Frontier Coverage Roadmap/);
    assert.match(buildLaunchChecklistResource(), /^# Frontier Launch and Admin Checklist/);
  });

  it("builds decision record and launch gate summaries", () => {
    const payload = buildDecisionRecordsResource() as {
      decisions: unknown[];
      launchSurfaces: unknown[];
    };

    assert.ok(payload.decisions.length > 0);
    assert.ok(payload.launchSurfaces.length > 0);
  });
});
