import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { buildMcpSurfaceManifest } from "./surface.js";

describe("buildMcpSurfaceManifest", () => {
  it("lists redacted read and review tools for the MCP surface", () => {
    const manifest = buildMcpSurfaceManifest();
    const toolNames = manifest.groups.flatMap((group) =>
      group.tools.map((tool) => tool.name),
    );
    const resourceNames = manifest.resources.map((resource) => resource.name);
    const promptNames = manifest.prompts.map((prompt) => prompt.name);

    assert.equal(manifest.name, "substack-cli");
    assert.equal(manifest.transport, "stdio");
    assert.equal(manifest.status, "ready");
    assert.ok(toolNames.includes("api.inventory"));
    assert.ok(toolNames.includes("trace.review"));
    assert.ok(toolNames.includes("policy"));
    assert.ok(resourceNames.includes("mcp.surface"));
    assert.ok(resourceNames.includes("mcp.summary"));
    assert.ok(promptNames.includes("mcp.surface.overview"));
    assert.ok(promptNames.includes("mcp.workflow.review"));
    assert.ok(
      manifest.groups.every((group) =>
        group.tools.every((tool) => tool.redacted),
      ),
    );
    assert.ok(manifest.resources.every((resource) => resource.redacted));
    assert.ok(manifest.prompts.every((prompt) => prompt.redacted));
  });
});
