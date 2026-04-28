import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { buildMcpSurfaceManifest } from "./surface.js";

describe("buildMcpSurfaceManifest", () => {
  it("lists redacted read and review tools for the planned MCP surface", () => {
    const manifest = buildMcpSurfaceManifest();
    const toolNames = manifest.groups.flatMap((group) =>
      group.tools.map((tool) => tool.name),
    );

    assert.equal(manifest.name, "substack-cli");
    assert.equal(manifest.transport, "stdio");
    assert.equal(manifest.status, "planned");
    assert.ok(toolNames.includes("api.inventory"));
    assert.ok(toolNames.includes("trace.review"));
    assert.ok(toolNames.includes("policy"));
    assert.ok(
      manifest.groups.every((group) =>
        group.tools.every((tool) => tool.redacted),
      ),
    );
  });
});
