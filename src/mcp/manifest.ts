import { buildMcpToolGroups, buildMcpToolDescriptors } from "./catalog.js";
import type {
  McpResourceSurface,
  McpSurfaceManifest,
  McpSurfaceGroup,
} from "./types.js";

const MCP_RESOURCE_DESCRIPTORS: McpResourceSurface[] = [
  {
    name: "mcp.surface",
    description: "Render the redacted MCP surface manifest as JSON.",
    uri: "substack-cli://mcp/surface",
    mimeType: "application/json",
    redacted: true,
  },
  {
    name: "mcp.summary",
    description: "Render a redacted summary of the available MCP tools.",
    uri: "substack-cli://mcp/summary",
    mimeType: "application/json",
    redacted: true,
  },
];

export function buildMcpResourceDescriptors(): McpResourceSurface[] {
  return MCP_RESOURCE_DESCRIPTORS;
}

export function buildMcpSurfaceGroups(): McpSurfaceGroup[] {
  return buildMcpToolGroups();
}

export function buildMcpSurfaceManifest(): McpSurfaceManifest {
  return {
    name: "substack-cli",
    version: "0.1.0",
    transport: "stdio",
    status: "ready",
    groups: buildMcpSurfaceGroups(),
    resources: buildMcpResourceDescriptors(),
    note: "This MCP surface is backed by a stdio server and intentionally exposes redacted summaries only.",
  };
}

export function summarizeMcpSurface(
  manifest: McpSurfaceManifest,
): McpSurfaceManifest {
  return manifest;
}

export function buildMcpSummaryResource(): Record<string, unknown> {
  const tools = buildMcpToolDescriptors();

  return {
    name: "substack-cli",
    status: "ready",
    toolCount: tools.length,
    redactedToolCount: tools.filter((tool) => tool.redacted).length,
    resourceCount: MCP_RESOURCE_DESCRIPTORS.length,
    groups: [...new Set(tools.map((tool) => tool.group))],
    note: "This summary is redacted and intended for local agent inspection only.",
  };
}
