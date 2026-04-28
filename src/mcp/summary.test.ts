import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { buildMcpSummaryResource } from "./manifest.js";

describe("buildMcpSummaryResource", () => {
  it("summarizes the redacted MCP surface", () => {
    const summary = buildMcpSummaryResource();

    assert.equal(summary.name, "substack-cli");
    assert.equal(summary.status, "ready");
    assert.equal(summary.toolCount, 13);
    assert.equal(summary.resourceCount, 2);
    assert.equal(summary.promptCount, 2);
    assert.ok(Array.isArray(summary.promptNames));
  });
});
