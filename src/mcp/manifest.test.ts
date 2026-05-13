import assert from "node:assert/strict";
import { describe, it } from "vitest";
import {
  buildMcpSurfaceManifest,
  summarizeMcpSurface,
  buildMcpSummaryResource,
  buildMcpResourceDescriptors,
  buildMcpSurfaceGroups,
} from "./manifest.js";

describe("buildMcpSurfaceManifest", () => {
  it("returns a complete manifest with all sections", () => {
    const manifest = buildMcpSurfaceManifest();

    assert.equal(manifest.name, "substack-cli");
    assert.equal(manifest.version, "0.1.0");
    assert.equal(manifest.transport, "stdio");
    assert.equal(manifest.status, "ready");
    assert.ok(manifest.groups.length > 0);
    assert.equal(manifest.resources.length, 2);
    assert.equal(manifest.prompts.length, 2);
    assert.ok(manifest.note.length > 0);
  });
});

describe("summarizeMcpSurface", () => {
  it("returns the manifest unchanged", () => {
    const manifest = buildMcpSurfaceManifest();
    const summary = summarizeMcpSurface(manifest);
    assert.equal(summary, manifest);
    assert.deepEqual(summary, manifest);
  });
});

describe("buildMcpSummaryResource", () => {
  it("returns summary with correct counts", () => {
    const summary = buildMcpSummaryResource();

    assert.equal(summary.name, "substack-cli");
    assert.equal(summary.status, "ready");
    assert.equal(summary.toolCount, 17);
    assert.equal(summary.redactedToolCount, 17);
    assert.equal(summary.resourceCount, 2);
    assert.equal(summary.promptCount, 2);
    assert.deepEqual(summary.groups, ["capture", "read", "review"]);
    assert.ok(Array.isArray(summary.promptNames));
    assert.equal(summary.promptNames.length, 2);
  });
});

describe("buildMcpResourceDescriptors", () => {
  it("returns both resource descriptors", () => {
    const resources = buildMcpResourceDescriptors();
    assert.equal(resources.length, 2);
    assert.equal(resources[0]?.name, "mcp.surface");
    assert.equal(resources[1]?.name, "mcp.summary");
    assert.ok(resources.every((r) => r.redacted));
  });
});

describe("buildMcpSurfaceGroups", () => {
  it("delegates to buildMcpToolGroups for the group structure", () => {
    const groups = buildMcpSurfaceGroups();
    assert.equal(groups.length, 3);
    assert.ok(groups.some((g) => g.name === "read"));
    assert.ok(groups.some((g) => g.name === "review"));
    assert.ok(groups.some((g) => g.name === "capture"));
  });
});
