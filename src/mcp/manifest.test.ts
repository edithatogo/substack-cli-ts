import assert from "node:assert/strict";
import { describe, it } from "vitest";
import {
  buildMcpResourceDescriptors,
  buildMcpSummaryResource,
  buildMcpSurfaceGroups,
  buildMcpSurfaceManifest,
  summarizeMcpSurface,
} from "./manifest.js";

describe("buildMcpSurfaceManifest", () => {
  it("returns a complete manifest with all sections", () => {
    const manifest = buildMcpSurfaceManifest();

    assert.equal(manifest.name, "substack-cli");
    assert.equal(manifest.version, "0.1.0");
    assert.equal(manifest.transport, "stdio");
    assert.equal(manifest.status, "ready");
    assert.ok(manifest.groups.length > 0);
    assert.equal(manifest.resources.length, 7);
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
    assert.equal(summary.toolCount, 29);
    assert.equal(summary.redactedToolCount, 29);
    assert.equal(summary.resourceCount, 7);
    assert.equal(summary.promptCount, 2);
    assert.deepEqual(summary.groups, ["read", "review", "capture", "creator"]);
    assert.ok(Array.isArray(summary.promptNames));
    assert.equal(summary.promptNames.length, 2);
  });
});

describe("buildMcpResourceDescriptors", () => {
  it("returns all resource descriptors", () => {
    const resources = buildMcpResourceDescriptors();
    const names = resources.map((resource) => resource.name);

    assert.equal(resources.length, 7);
    assert.ok(names.includes("mcp.surface"));
    assert.ok(names.includes("mcp.summary"));
    assert.ok(names.includes("coverage.matrix"));
    assert.ok(names.includes("coverage.roadmap"));
    assert.ok(names.includes("launch.checklist"));
    assert.ok(names.includes("coverage.decisions"));
    assert.ok(names.includes("coverage.safe-surfaces"));
    assert.ok(resources.every((r) => r.redacted));
  });
});

describe("buildMcpSurfaceGroups", () => {
  it("delegates to buildMcpToolGroups for the group structure", () => {
    const groups = buildMcpSurfaceGroups();
    assert.equal(groups.length, 4);
    assert.ok(groups.some((g) => g.name === "read"));
    assert.ok(groups.some((g) => g.name === "review"));
    assert.ok(groups.some((g) => g.name === "capture"));
    assert.ok(groups.some((g) => g.name === "creator"));
  });
});
