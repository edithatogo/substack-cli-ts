import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { loadEffectiveConfig, requirePublicationUrl } from "../config/store.js";
import {
  resolveApiAuthMaterial,
  summarizeApiAuthMaterial,
  validateApiAuthMaterial,
} from "../substack-api/auth.js";
import { readApiInventory } from "../substack-api/read-model.js";
import { evaluateDistributionPolicy } from "../policy/distribution.js";
import {
  compareDraftCaptureArtifacts,
  reviewDraftCaptureArtifact,
  writeDraftCaptureFixture,
} from "../browser/draft-capture.js";
import { inferDraftContract } from "../browser/draft-contract.js";
import {
  buildDraftContractMatrix,
  compareDraftContractMatrixArtifacts,
} from "../browser/draft-contract-matrix.js";
import { preparePost } from "../publish/prepare.js";
import { buildDraftDuplicateLookupReport } from "../substack-api/draft-lookup.js";
import { buildDraftInspectionReport } from "../substack-api/draft-inspect.js";
import { loadDraftMappings } from "../substack-api/draft-mappings.js";
import { buildDraftSectionResolutionReport } from "../substack-api/draft-section.js";
import {
  compareWorkflowTraceArtifacts,
  reviewWorkflowTraceArtifact,
} from "../publish/workflow-trace.js";
import { validateSchemaFile } from "../schema/fixtures.js";
import type { McpSurfaceGroup, McpToolDescriptor } from "./types.js";

type JsonToolResult = {
  content: Array<{ type: "text"; text: string }>;
  structuredContent: Record<string, unknown>;
};

const ReadInventoryArgs = {
  postLimit: z.number().int().positive().max(100).optional(),
};

const FileArg = {
  file: z.string().min(1),
};

const CompareFileArgs = {
  expectedFile: z.string().min(1),
  actualFile: z.string().min(1),
};

const FixtureArgs = {
  file: z.string().min(1),
  out: z.string().min(1),
};

const MCP_TOOL_DESCRIPTORS: McpToolDescriptor[] = [
  {
    group: "read",
    name: "api.inventory",
    description: "Inspect the current publication and recent post inventory.",
    cliCommand: "api inventory --source local-profile",
    redacted: true,
    register(server) {
      server.registerTool(
        "api.inventory",
        {
          description:
            "Inspect the current publication and recent post inventory.",
          inputSchema: ReadInventoryArgs,
          annotations: {
            title: "API Inventory",
            readOnlyHint: true,
            openWorldHint: true,
          },
        },
        async ({ postLimit }) => {
          const config = await loadEffectiveConfig();
          const material = await resolveApiAuthMaterial(config, "auto");
          const inventory = await readApiInventory(material, fetch, {
            postLimit: postLimit ?? 10,
          });

          return jsonResult(
            toJsonRecord(inventory),
            "Read-only API inventory completed.",
          );
        },
      );
    },
  },
  {
    group: "read",
    name: "api.auth.status",
    description:
      "Summarize the current local auth material without revealing cookie values.",
    cliCommand: "api auth status --source local-profile",
    redacted: true,
    register(server) {
      server.registerTool(
        "api.auth.status",
        {
          description:
            "Summarize the current local auth material without revealing cookie values.",
          annotations: {
            title: "API Auth Status",
            readOnlyHint: true,
            openWorldHint: false,
          },
        },
        async () => {
          const config = await loadEffectiveConfig();
          const material = await resolveApiAuthMaterial(config, "auto");
          const validation = await validateApiAuthMaterial(material, fetch);

          return jsonResult(
            toJsonRecord({
              material: summarizeApiAuthMaterial(material),
              validation,
            }),
            "Authenticated session summary completed.",
          );
        },
      );
    },
  },
  {
    group: "review",
    name: "schema.validate",
    description: "Validate a ProseMirror fixture or captured document.",
    cliCommand: "schema validate <file>",
    redacted: true,
    register(server) {
      server.registerTool(
        "schema.validate",
        {
          description: "Validate a ProseMirror fixture or captured document.",
          inputSchema: FileArg,
          annotations: {
            title: "Schema Validate",
            readOnlyHint: true,
            openWorldHint: false,
          },
        },
        async ({ file }) => {
          const summary = await validateSchemaFile(String(file));
          return jsonResult(
            toJsonRecord(summary),
            "Schema validation completed.",
          );
        },
      );
    },
  },
  {
    group: "review",
    name: "trace.review",
    description: "Summarize a saved workflow trace artifact.",
    cliCommand: "trace review <file>",
    redacted: true,
    register(server) {
      server.registerTool(
        "trace.review",
        {
          description: "Summarize a saved workflow trace artifact.",
          inputSchema: FileArg,
          annotations: {
            title: "Trace Review",
            readOnlyHint: true,
            openWorldHint: false,
          },
        },
        async ({ file }) => {
          const review = await reviewWorkflowTraceArtifact(String(file));
          return jsonResult(
            toJsonRecord(review),
            "Workflow trace review completed.",
          );
        },
      );
    },
  },
  {
    group: "review",
    name: "trace.compare",
    description: "Compare two saved workflow trace artifacts.",
    cliCommand: "trace compare <expected-file> <actual-file>",
    redacted: true,
    register(server) {
      server.registerTool(
        "trace.compare",
        {
          description: "Compare two saved workflow trace artifacts.",
          inputSchema: CompareFileArgs,
          annotations: {
            title: "Trace Compare",
            readOnlyHint: true,
            openWorldHint: false,
          },
        },
        async ({ expectedFile, actualFile }) => {
          const comparison = await compareWorkflowTraceArtifacts(
            String(expectedFile),
            String(actualFile),
          );
          return jsonResult(
            toJsonRecord(comparison),
            comparison.equal
              ? "Workflow trace comparison completed with no differences."
              : "Workflow trace comparison completed with differences.",
          );
        },
      );
    },
  },
  {
    group: "review",
    name: "policy",
    description:
      "Review distribution and dependency hygiene for the repository.",
    cliCommand: "policy",
    redacted: true,
    register(server) {
      server.registerTool(
        "policy",
        {
          description:
            "Review distribution and dependency hygiene for the repository.",
          annotations: {
            title: "Distribution Policy",
            readOnlyHint: true,
            openWorldHint: false,
          },
        },
        async () => {
          const policy = await evaluateDistributionPolicy();
          return jsonResult(
            toJsonRecord(policy),
            "Distribution policy review completed.",
          );
        },
      );
    },
  },
  {
    group: "capture",
    name: "api.draft.contract",
    description:
      "Infer likely draft create/update/fetch endpoints from a saved draft capture artifact.",
    cliCommand: "api draft contract <file>",
    redacted: true,
    register(server) {
      server.registerTool(
        "api.draft.contract",
        {
          description:
            "Infer likely draft create/update/fetch endpoints from a saved draft capture artifact.",
          inputSchema: FileArg,
          annotations: {
            title: "Draft Contract Inference",
            readOnlyHint: true,
            openWorldHint: false,
          },
        },
        async ({ file }) => {
          const review = await reviewDraftCaptureArtifact(String(file));
          const report = inferDraftContract(review);
          return jsonResult(
            toJsonRecord(report),
            "Draft contract inference completed.",
          );
        },
      );
    },
  },
  {
    group: "capture",
    name: "api.draft.contract.matrix",
    description:
      "Merge multiple draft capture artifacts into one inferred contract matrix.",
    cliCommand: "api draft contract-matrix <files...>",
    redacted: true,
    register(server) {
      server.registerTool(
        "api.draft.contract.matrix",
        {
          description:
            "Merge multiple draft capture artifacts into one inferred contract matrix.",
          inputSchema: {
            files: z.array(z.string().min(1)).min(1),
          },
          annotations: {
            title: "Draft Contract Matrix",
            readOnlyHint: true,
            openWorldHint: false,
          },
        },
        async ({ files }) => {
          const inputs = await Promise.all(
            files.map(async (sourceFile) => ({
              sourceFile,
              review: await reviewDraftCaptureArtifact(sourceFile),
            })),
          );
          const report = buildDraftContractMatrix(inputs);
          return jsonResult(
            toJsonRecord(report),
            "Draft contract matrix completed.",
          );
        },
      );
    },
  },
  {
    group: "capture",
    name: "api.draft.contract.matrix.compare",
    description: "Compare two draft contract matrix fixtures.",
    cliCommand:
      "api draft contract-matrix-compare <expected-file> <actual-file>",
    redacted: true,
    register(server) {
      server.registerTool(
        "api.draft.contract.matrix.compare",
        {
          description: "Compare two draft contract matrix fixtures.",
          inputSchema: CompareFileArgs,
          annotations: {
            title: "Draft Contract Matrix Compare",
            readOnlyHint: true,
            openWorldHint: false,
          },
        },
        async ({ expectedFile, actualFile }) => {
          const comparison = await compareDraftContractMatrixArtifacts(
            expectedFile,
            actualFile,
          );
          return jsonResult(
            toJsonRecord(comparison),
            "Draft contract matrix comparison completed.",
          );
        },
      );
    },
  },
  {
    group: "capture",
    name: "api.draft.duplicates",
    description:
      "Look up likely duplicate drafts using the read-only inventory and local mappings.",
    cliCommand: "api draft duplicates <file>",
    redacted: true,
    register(server) {
      server.registerTool(
        "api.draft.duplicates",
        {
          description:
            "Look up likely duplicate drafts using the read-only inventory and local mappings.",
          inputSchema: FileArg,
          annotations: {
            title: "Draft Duplicate Lookup",
            readOnlyHint: true,
            openWorldHint: false,
          },
        },
        async ({ file }) => {
          const config = await loadEffectiveConfig();
          const material = await resolveApiAuthMaterial(config, "auto");
          const inventory = await readApiInventory(material, fetch, {
            postLimit: 10,
          });

          if (inventory.status !== "ok") {
            return jsonResult(
              toJsonRecord(inventory),
              "Draft duplicate lookup could not run.",
            );
          }

          const prepared = await preparePost(String(file), { mode: "draft" });
          const mappings = await loadDraftMappings();
          const report = buildDraftDuplicateLookupReport({
            post: prepared.post,
            inventory,
            mappings,
          });

          return jsonResult(
            toJsonRecord(report),
            "Draft duplicate lookup completed.",
          );
        },
      );
    },
  },
  {
    group: "capture",
    name: "api.draft.section",
    description:
      "Resolve a draft section against the current read-only inventory.",
    cliCommand: "api draft section <file>",
    redacted: true,
    register(server) {
      server.registerTool(
        "api.draft.section",
        {
          description:
            "Resolve a draft section against the current read-only inventory.",
          inputSchema: FileArg,
          annotations: {
            title: "Draft Section Resolution",
            readOnlyHint: true,
            openWorldHint: false,
          },
        },
        async ({ file }) => {
          const config = await loadEffectiveConfig();
          const material = await resolveApiAuthMaterial(config, "auto");
          const inventory = await readApiInventory(material, fetch, {
            postLimit: 10,
          });

          if (inventory.status !== "ok") {
            return jsonResult(
              toJsonRecord(inventory),
              "Draft section resolution could not run.",
            );
          }

          const prepared = await preparePost(String(file), { mode: "draft" });
          const report = buildDraftSectionResolutionReport({
            post: prepared.post,
            inventory,
          });

          return jsonResult(
            toJsonRecord(report),
            "Draft section resolution completed.",
          );
        },
      );
    },
  },
  {
    group: "capture",
    name: "api.draft.inspect",
    description:
      "Bundle payload compatibility, section resolution, duplicate lookup, and draft planning.",
    cliCommand: "api draft inspect <file>",
    redacted: true,
    register(server) {
      server.registerTool(
        "api.draft.inspect",
        {
          description:
            "Bundle payload compatibility, section resolution, duplicate lookup, and draft planning.",
          inputSchema: FileArg,
          annotations: {
            title: "Draft Inspection",
            readOnlyHint: true,
            openWorldHint: false,
          },
        },
        async ({ file }) => {
          const config = await loadEffectiveConfig();
          const material = await resolveApiAuthMaterial(config, "auto");
          const inventory = await readApiInventory(material, fetch, {
            postLimit: 10,
          });
          const mappings = await loadDraftMappings();
          const prepared = await preparePost(String(file), { mode: "draft" });
          const publicationUrl = requirePublicationUrl(config);
          const existingDraft =
            mappings.find(
              (mapping) =>
                mapping.sourceFile === prepared.post.filePath &&
                mapping.publicationUrl === publicationUrl,
            ) ?? null;
          const report = buildDraftInspectionReport({
            post: prepared.post,
            publicationUrl,
            inventory,
            mappings,
            existingDraft,
          });

          return jsonResult(
            toJsonRecord(report),
            report.status === "ready"
              ? "Draft inspection completed."
              : "Draft inspection completed with warnings.",
          );
        },
      );
    },
  },
  {
    group: "capture",
    name: "api.draft.review",
    description: "Summarize a draft capture artifact.",
    cliCommand: "api draft review <file>",
    redacted: true,
    register(server) {
      server.registerTool(
        "api.draft.review",
        {
          description: "Summarize a draft capture artifact.",
          inputSchema: FileArg,
          annotations: {
            title: "Draft Capture Review",
            readOnlyHint: true,
            openWorldHint: false,
          },
        },
        async ({ file }) => {
          const review = await reviewDraftCaptureArtifact(String(file));
          return jsonResult(
            toJsonRecord(review),
            "Draft capture review completed.",
          );
        },
      );
    },
  },
  {
    group: "capture",
    name: "api.draft.compare",
    description: "Compare two draft capture artifacts.",
    cliCommand: "api draft compare <expected-file> <actual-file>",
    redacted: true,
    register(server) {
      server.registerTool(
        "api.draft.compare",
        {
          description: "Compare two draft capture artifacts.",
          inputSchema: CompareFileArgs,
          annotations: {
            title: "Draft Capture Compare",
            readOnlyHint: true,
            openWorldHint: false,
          },
        },
        async ({ expectedFile, actualFile }) => {
          const comparison = await compareDraftCaptureArtifacts(
            String(expectedFile),
            String(actualFile),
          );
          return jsonResult(
            toJsonRecord(comparison),
            comparison.equal
              ? "Draft capture comparison completed with no differences."
              : "Draft capture comparison completed with differences.",
          );
        },
      );
    },
  },
  {
    group: "capture",
    name: "api.draft.fixture",
    description: "Normalize a draft capture artifact to a fixture file.",
    cliCommand: "api draft fixture <file> --out <file>",
    redacted: true,
    register(server) {
      server.registerTool(
        "api.draft.fixture",
        {
          description: "Normalize a draft capture artifact to a fixture file.",
          inputSchema: FixtureArgs,
          annotations: {
            title: "Draft Fixture",
            readOnlyHint: false,
            openWorldHint: false,
          },
        },
        async ({ file, out }) => {
          const fixture = await writeDraftCaptureFixture(
            String(file),
            String(out),
          );
          return jsonResult(
            toJsonRecord(fixture),
            "Draft capture fixture written.",
          );
        },
      );
    },
  },
];

export function buildMcpToolDescriptors(): McpToolDescriptor[] {
  return MCP_TOOL_DESCRIPTORS;
}

export function registerMcpTools(server: McpServer): void {
  for (const tool of MCP_TOOL_DESCRIPTORS) {
    tool.register(server);
  }
}

export function buildMcpToolGroups(): McpSurfaceGroup[] {
  return groupDescriptors(MCP_TOOL_DESCRIPTORS);
}

function groupDescriptors(descriptors: McpToolDescriptor[]): McpSurfaceGroup[] {
  const order: McpToolDescriptor["group"][] = ["read", "review", "capture"];
  const byGroup = new Map<McpToolDescriptor["group"], McpToolDescriptor[]>();

  for (const descriptor of descriptors) {
    const bucket = byGroup.get(descriptor.group) ?? [];
    bucket.push(descriptor);
    byGroup.set(descriptor.group, bucket);
  }

  return order.map((group) => {
    const tools = byGroup.get(group) ?? [];

    return {
      name: group,
      description: groupDescription(group),
      tools: tools.map((tool) => ({
        name: tool.name,
        description: tool.description,
        cliCommand: tool.cliCommand,
        redacted: tool.redacted,
      })),
    };
  });
}

function groupDescription(group: McpToolDescriptor["group"]): string {
  switch (group) {
    case "read":
      return "Read-only inventory and auth summaries.";
    case "review":
      return "Schema, payload, and workflow review helpers.";
    case "capture":
      return "Local capture and fixture helpers used during discovery.";
  }
}

function jsonResult(
  structuredContent: Record<string, unknown>,
  message: string,
): JsonToolResult {
  return {
    content: [
      {
        type: "text",
        text: `${message}\n${JSON.stringify(structuredContent, null, 2)}`,
      },
    ],
    structuredContent,
  };
}

function toJsonRecord(value: object): Record<string, unknown> {
  return value as Record<string, unknown>;
}
