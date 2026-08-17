import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  buildCoverageMatrixResource,
  buildCoverageRoadmapResource,
  buildDecisionRecordsResource,
  buildLaunchChecklistResource,
  buildSafeSurfacesResource,
} from "../frontier-coverage/mcp-resources.js";
import { buildMcpSummaryResource, buildMcpSurfaceManifest } from "./manifest.js";

function registerMcpSurfaceResource(server: McpServer): void {
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
}

function registerMcpSummaryResource(server: McpServer): void {
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

function registerCoverageMatrixResource(server: McpServer): void {
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
}

function registerCoverageRoadmapResource(server: McpServer): void {
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
}

function registerLaunchChecklistResource(server: McpServer): void {
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
}

function registerCoverageDecisionsResource(server: McpServer): void {
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

function registerCoverageSafeSurfacesResource(server: McpServer): void {
  server.registerResource(
    "coverage.safe-surfaces",
    "substack-cli://coverage/safe-surfaces",
    {
      description: "Render safe frontier surface decisions and automation boundaries as JSON.",
      mimeType: "application/json",
    },
    () => ({
      contents: [
        {
          uri: "substack-cli://coverage/safe-surfaces",
          mimeType: "application/json",
          text: JSON.stringify(buildSafeSurfacesResource(), null, 2),
        },
      ],
    }),
  );
}

export function registerMcpResources(server: McpServer): void {
  registerMcpSurfaceResource(server);
  registerMcpSummaryResource(server);
  registerCoverageMatrixResource(server);
  registerCoverageRoadmapResource(server);
  registerLaunchChecklistResource(server);
  registerCoverageDecisionsResource(server);
  registerCoverageSafeSurfacesResource(server);
}
