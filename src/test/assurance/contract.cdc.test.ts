import assert from "node:assert/strict";
import { resolve } from "node:path";
import { describe, it } from "vitest";
import { buildMcpSurfaceManifest } from "../../mcp/manifest.js";
import { compareFixture } from "../../schema/fixtures.js";

const root = resolve(import.meta.dirname, "../../..");

describe("MCP consumer-driven contract", () => {
  it("satisfies the local agent consumer contract", () => {
    const manifest = buildMcpSurfaceManifest();
    const tools = manifest.groups.flatMap((group) => group.tools);
    const names = tools.map((tool) => tool.name);
    assert.equal(manifest.status, "ready");
    assert.equal(new Set(names).size, names.length);
    assert.ok(tools.length > 0);
    assert.ok(tools.every((tool) => tool.redacted && tool.cliCommand.length > 0));
    assert.equal(
      new Set(manifest.resources.map((resource) => resource.uri)).size,
      manifest.resources.length,
    );
  });

  it("keeps the basic ProseMirror fixture frozen against the parser", async () => {
    const result = await compareFixture(
      resolve(root, "examples/basic.md"),
      resolve(root, "fixtures/prosemirror/basic.json"),
    );
    assert.equal(
      result.equal,
      true,
      "Re-capture with: node dist/cli.js schema capture examples/basic.md --out fixtures/prosemirror/basic.json",
    );
  });
});
