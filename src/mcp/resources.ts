import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  buildMcpSurfaceManifest,
  buildMcpSummaryResource,
} from "./manifest.js";

export function registerMcpResources(server: McpServer): void {
  server.registerResource(
    "mcp.surface",
    "substack-cli://mcp/surface",
    {
      description: "Render the redacted MCP surface manifest as JSON.",
      mimeType: "application/json",
    },
    () => {
      const manifest = buildMcpSurfaceManifest();
      return {
        contents: [
          {
            uri: "substack-cli://mcp/surface",
            mimeType: "application/json",
            text: JSON.stringify(manifest, null, 2),
          },
        ],
      };
    },
  );

  server.registerResource(
    "mcp.summary",
    "substack-cli://mcp/summary",
    {
      description: "Render a redacted summary of the available MCP tools.",
      mimeType: "application/json",
    },
    () => {
      const summary = buildMcpSummaryResource();
      return {
        contents: [
          {
            uri: "substack-cli://mcp/summary",
            mimeType: "application/json",
            text: JSON.stringify(summary, null, 2),
          },
        ],
      };
    },
  );
}
