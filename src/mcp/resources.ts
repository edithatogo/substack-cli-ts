import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  buildCoverageMatrixResource,
  buildCoverageRoadmapResource,
  buildDecisionRecordsResource,
  buildLaunchChecklistResource,
} from "../frontier-coverage/mcp-resources.js";
import { buildMcpSummaryResource, buildMcpSurfaceManifest } from "./manifest.js";

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

  server.registerResource(
    "coverage.matrix",
    "substack-cli://coverage/matrix",
    {
      description: "Render the redacted canonical Substack frontier coverage matrix as JSON.",
      mimeType: "application/json",
    },
    () => ({
      contents: [
        {
          uri: "substack-cli://coverage/matrix",
          mimeType: "application/json",
          text: JSON.stringify(buildCoverageMatrixResource(), null, 2),
        },
      ],
    }),
  );

  server.registerResource(
    "coverage.roadmap",
    "substack-cli://coverage/roadmap",
    {
      description: "Render the generated frontier coverage roadmap as Markdown.",
      mimeType: "text/markdown",
    },
    () => ({
      contents: [
        {
          uri: "substack-cli://coverage/roadmap",
          mimeType: "text/markdown",
          text: buildCoverageRoadmapResource(),
        },
      ],
    }),
  );

  server.registerResource(
    "launch.checklist",
    "substack-cli://launch/checklist",
    {
      description: "Render the external launch and admin checklist as Markdown.",
      mimeType: "text/markdown",
    },
    () => ({
      contents: [
        {
          uri: "substack-cli://launch/checklist",
          mimeType: "text/markdown",
          text: buildLaunchChecklistResource(),
        },
      ],
    }),
  );

  server.registerResource(
    "coverage.decisions",
    "substack-cli://coverage/decisions",
    {
      description: "Render frontier coverage decision records and launch gate summaries as JSON.",
      mimeType: "application/json",
    },
    () => ({
      contents: [
        {
          uri: "substack-cli://coverage/decisions",
          mimeType: "application/json",
          text: JSON.stringify(buildDecisionRecordsResource(), null, 2),
        },
      ],
    }),
  );
}
