export type McpSurfaceStatus = "planned" | "ready";

export interface McpToolSurface {
  name: string;
  description: string;
  cliCommand: string;
  redacted: boolean;
}

export interface McpSurfaceGroup {
  name: string;
  description: string;
  tools: McpToolSurface[];
}

export interface McpSurfaceManifest {
  name: string;
  version: string;
  transport: "stdio";
  status: McpSurfaceStatus;
  groups: McpSurfaceGroup[];
  note: string;
}

export function buildMcpSurfaceManifest(): McpSurfaceManifest {
  return {
    name: "substack-cli",
    version: "0.1.0",
    transport: "stdio",
    status: "planned",
    groups: [
      {
        name: "read",
        description: "Read-only inventory and auth summaries.",
        tools: [
          {
            name: "api.inventory",
            description:
              "Inspect the current publication and recent post inventory.",
            cliCommand: "api inventory --source local-profile",
            redacted: true,
          },
          {
            name: "api.auth.status",
            description:
              "Summarize the current local auth material without revealing cookie values.",
            cliCommand: "api auth status --source local-profile",
            redacted: true,
          },
        ],
      },
      {
        name: "review",
        description: "Schema, payload, and workflow review helpers.",
        tools: [
          {
            name: "schema.validate",
            description: "Validate a ProseMirror fixture or captured document.",
            cliCommand: "schema validate <file>",
            redacted: true,
          },
          {
            name: "trace.review",
            description: "Summarize a saved workflow trace artifact.",
            cliCommand: "trace review <file>",
            redacted: true,
          },
          {
            name: "trace.compare",
            description: "Compare two saved workflow trace artifacts.",
            cliCommand: "trace compare <expected-file> <actual-file>",
            redacted: true,
          },
          {
            name: "policy",
            description:
              "Review distribution and dependency hygiene for the repository.",
            cliCommand: "policy",
            redacted: true,
          },
        ],
      },
      {
        name: "capture",
        description: "Local capture and fixture helpers used during discovery.",
        tools: [
          {
            name: "api.draft.review",
            description: "Summarize a draft capture artifact.",
            cliCommand: "api draft review <file>",
            redacted: true,
          },
          {
            name: "api.draft.compare",
            description: "Compare two draft capture artifacts.",
            cliCommand: "api draft compare <expected-file> <actual-file>",
            redacted: true,
          },
          {
            name: "api.draft.fixture",
            description:
              "Normalize a draft capture artifact to a fixture file.",
            cliCommand: "api draft fixture <file> --out <file>",
            redacted: true,
          },
        ],
      },
    ],
    note: "This is a planned MCP surface definition. It intentionally exposes redacted summaries only.",
  };
}

export function summarizeMcpSurface(
  manifest: McpSurfaceManifest,
): McpSurfaceManifest {
  return manifest;
}
