import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { buildMcpToolDescriptors } from "./catalog.js";

describe("mcp tool descriptors", () => {
  it("keeps the tool catalog redacted and aligned with the surface", () => {
    const descriptors = buildMcpToolDescriptors();
    const toolNames = descriptors.map((descriptor) => descriptor.name);

    assert.ok(toolNames.includes("api.inventory"));
    assert.ok(toolNames.includes("api.auth.status"));
    assert.ok(toolNames.includes("trace.review"));
    assert.ok(toolNames.includes("policy"));
    assert.ok(descriptors.every((descriptor) => descriptor.redacted));
  });
});
