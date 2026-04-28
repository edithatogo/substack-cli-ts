import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { buildMcpPromptSurfaceDescriptors } from "./prompts.js";

describe("buildMcpPromptSurfaceDescriptors", () => {
  it("lists the redacted MCP prompts", () => {
    const prompts = buildMcpPromptSurfaceDescriptors();
    const promptNames = prompts.map((prompt) => prompt.name);

    assert.ok(promptNames.includes("mcp.surface.overview"));
    assert.ok(promptNames.includes("mcp.workflow.review"));
    assert.ok(prompts.every((prompt) => prompt.redacted));
  });
});
