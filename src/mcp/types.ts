import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

export type McpSurfaceStatus = "planned" | "ready";

export type McpToolGroup = "read" | "review" | "capture" | "creator";

export interface McpToolSurface {
  name: string;
  description: string;
  cliCommand: string;
  redacted: boolean;
}

export interface McpResourceSurface {
  name: string;
  description: string;
  uri: string;
  mimeType: string;
  redacted: boolean;
}

export interface McpPromptSurface {
  name: string;
  description: string;
  redacted: boolean;
}

export interface McpSurfaceGroup {
  name: McpToolGroup;
  description: string;
  tools: McpToolSurface[];
}

export interface McpSurfaceManifest {
  name: string;
  version: string;
  transport: "stdio";
  status: McpSurfaceStatus;
  groups: McpSurfaceGroup[];
  resources: McpResourceSurface[];
  prompts: McpPromptSurface[];
  note: string;
}

export interface McpToolDescriptor {
  group: McpToolGroup;
  name: string;
  description: string;
  cliCommand: string;
  redacted: boolean;
  register: (server: McpServer) => void;
}

export interface McpPromptDescriptor {
  name: string;
  description: string;
  redacted: boolean;
  register: (server: McpServer) => void;
}
