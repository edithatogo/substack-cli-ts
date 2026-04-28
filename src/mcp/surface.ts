import { buildMcpToolGroups } from "./catalog.js";
import type { McpSurfaceManifest } from "./types.js";

export function buildMcpSurfaceManifest(): McpSurfaceManifest {
  return {
    name: "substack-cli",
    version: "0.1.0",
    transport: "stdio",
    status: "ready",
    groups: buildMcpToolGroups(),
    note: "This MCP surface is backed by a stdio server and intentionally exposes redacted summaries only.",
  };
}

export function summarizeMcpSurface(
  manifest: McpSurfaceManifest,
): McpSurfaceManifest {
  return manifest;
}
