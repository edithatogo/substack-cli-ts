import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { McpPromptSurface } from "./types.js";
import type { McpPromptDescriptor } from "./types.js";

const MCP_PROMPT_DESCRIPTORS: McpPromptDescriptor[] = [
  {
    name: "mcp.surface.overview",
    description: "Describe the current MCP surface and how to use the read-only tools.",
    redacted: true,
    register(server) {
      server.registerPrompt(
        "mcp.surface.overview",
        {
          description: "Describe the current MCP surface and how to use the read-only tools.",
        },
        () => ({
          messages: [
            {
              role: "user",
              content: {
                type: "text",
                text: "Review the current substack-cli MCP surface. Focus on the redacted read, review, capture, and resource surfaces. Do not request or expose secrets, cookies, or session URLs. Use the manifest and summary resources to orient yourself before taking any action.",
              },
            },
          ],
        }),
      );
    },
  },
  {
    name: "mcp.workflow.review",
    description: "Provide a redacted review checklist for Substack workflow artifacts.",
    redacted: true,
    register(server) {
      server.registerPrompt(
        "mcp.workflow.review",
        {
          description: "Provide a redacted review checklist for Substack workflow artifacts.",
        },
        () => ({
          messages: [
            {
              role: "user",
              content: {
                type: "text",
                text: "Review a captured Substack workflow artifact. Check the trace, compare, fixture, and policy commands first. Keep the result redacted, and call out any next validation steps without exposing browser session material or content secrets.",
              },
            },
          ],
        }),
      );
    },
  },
];

export function buildMcpPromptDescriptors(): McpPromptDescriptor[] {
  return MCP_PROMPT_DESCRIPTORS;
}

export function registerMcpPrompts(server: McpServer): void {
  for (const prompt of MCP_PROMPT_DESCRIPTORS) {
    prompt.register(server);
  }
}

export function buildMcpPromptSurfaceDescriptors(): McpPromptSurface[] {
  return MCP_PROMPT_DESCRIPTORS.map((prompt) => ({
    name: prompt.name,
    description: prompt.description,
    redacted: prompt.redacted,
  }));
}
