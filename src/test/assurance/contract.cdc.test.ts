import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { buildMcpSurfaceManifest } from "../../mcp/manifest.js";
import { MCP_PROTOCOL_VERSION } from "../../mcp/protocol.js";

describe("MCP consumer-driven contract", () => {
  it("satisfies the local agent consumer contract", () => {
    const manifest = buildMcpSurfaceManifest();
    const tools = manifest.groups.flatMap((group) => group.tools);
    const names = tools.map((tool) => tool.name);
    assert.equal(manifest.protocolVersion, MCP_PROTOCOL_VERSION);
    assert.deepEqual(manifest.transports, ["stdio", "streamable-http"]);
    assert.equal(new Set(names).size, names.length);
    assert.ok(tools.length > 0);
    assert.ok(tools.every((tool) => tool.redacted && tool.cliCommand.length > 0));
    assert.equal(new Set(manifest.resources.map((resource) => resource.uri)).size, manifest.resources.length);
  });
});
