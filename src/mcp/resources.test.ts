import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { buildMcpResourceDescriptors } from "./manifest.js";

describe("buildMcpResourceDescriptors", () => {
  it("lists the redacted MCP resources", () => {
    const resources = buildMcpResourceDescriptors();
    const resourceNames = resources.map((resource) => resource.name);

    assert.ok(resourceNames.includes("mcp.surface"));
    assert.ok(resourceNames.includes("mcp.summary"));
    assert.ok(resourceNames.includes("coverage.matrix"));
    assert.ok(resourceNames.includes("coverage.roadmap"));
    assert.ok(resourceNames.includes("launch.checklist"));
    assert.ok(resourceNames.includes("coverage.decisions"));
    assert.ok(resourceNames.includes("coverage.safe-surfaces"));
    assert.ok(resources.every((resource) => resource.redacted));
  });
});
