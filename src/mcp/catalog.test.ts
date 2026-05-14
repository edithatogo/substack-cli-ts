import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { buildMcpToolDescriptors, buildMcpToolGroups, registerMcpTools } from "./catalog.js";

describe("McpToolDescriptors", () => {
  it("returns all 17 tool descriptors", () => {
    const descriptors = buildMcpToolDescriptors();
    assert.equal(descriptors.length, 17);
    assert.ok(descriptors.every((d) => d.redacted));
    assert.ok(descriptors.every((d) => d.name.length > 0));
    assert.ok(descriptors.every((d) => d.description.length > 0));
  });

  it("includes expected tools", () => {
    const descriptors = buildMcpToolDescriptors();
    const names = descriptors.map((d) => d.name);
    assert.ok(names.includes("api.inventory"));
    assert.ok(names.includes("api.auth.status"));
    assert.ok(names.includes("schema.validate"));
    assert.ok(names.includes("api.media"));
    assert.ok(names.includes("trace.review"));
    assert.ok(names.includes("trace.compare"));
    assert.ok(names.includes("policy"));
    assert.ok(names.includes("doctor"));
    assert.ok(names.includes("api.draft.contract"));
    assert.ok(names.includes("api.draft.contract.matrix"));
    assert.ok(names.includes("api.draft.contract.matrix.compare"));
    assert.ok(names.includes("api.draft.duplicates"));
    assert.ok(names.includes("api.draft.section"));
    assert.ok(names.includes("api.draft.inspect"));
    assert.ok(names.includes("api.draft.review"));
    assert.ok(names.includes("api.draft.compare"));
    assert.ok(names.includes("api.draft.fixture"));
  });

  it("groups tools correctly", () => {
    const descriptors = buildMcpToolDescriptors();
    const readTools = descriptors.filter((d) => d.group === "read");
    const reviewTools = descriptors.filter((d) => d.group === "review");
    const captureTools = descriptors.filter((d) => d.group === "capture");

    assert.equal(readTools.length, 2);
    assert.equal(reviewTools.length, 6);
    assert.equal(captureTools.length, 9);
  });

  it("has unique names across all descriptors", () => {
    const descriptors = buildMcpToolDescriptors();
    const names = descriptors.map((d) => d.name);
    assert.equal(new Set(names).size, names.length);
  });
});

describe("buildMcpToolGroups", () => {
  it("returns groups in order: read, review, capture", () => {
    const groups = buildMcpToolGroups();
    assert.equal(groups.length, 3);
    assert.equal(groups[0]?.name, "read");
    assert.equal(groups[1]?.name, "review");
    assert.equal(groups[2]?.name, "capture");
  });

  it("provides descriptions for each group", () => {
    const groups = buildMcpToolGroups();
    assert.ok(groups[0]?.description.length > 0);
    assert.ok(groups[1]?.description.length > 0);
    assert.ok(groups[2]?.description.length > 0);
  });

  it("includes the correct tools in each group", () => {
    const groups = buildMcpToolGroups();
    const readGroup = groups.find((g) => g.name === "read")!;
    assert.equal(readGroup.tools.length, 2);
    assert.ok(readGroup.tools.some((t) => t.name === "api.inventory"));
    assert.ok(readGroup.tools.some((t) => t.name === "api.auth.status"));
  });

  it("sets redacted to true on all tool surfaces", () => {
    const groups = buildMcpToolGroups();
    for (const group of groups) {
      assert.ok(group.tools.every((t) => t.redacted));
    }
  });
});

describe("registerMcpTools", () => {
  it("calls registerTool for each descriptor", () => {
    const registered: string[] = [];
    const mockServer = {
      registerTool: (name: string, _schema: unknown, _handler: unknown) => {
        registered.push(name);
      },
    };

    registerMcpTools(mockServer as Parameters<typeof registerMcpTools>[0]);
    assert.equal(registered.length, 17);
  });
});
