import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
  compareDraftCaptureArtifacts,
  reviewDraftCaptureArtifact,
  writeDraftCaptureFixture,
} from "../browser/draft-capture.js";
import {
  buildDraftContractMatrix,
  compareDraftContractMatrixArtifacts,
} from "../browser/draft-contract-matrix.js";
import { inferDraftContract } from "../browser/draft-contract.js";
import { loadEffectiveConfig, requirePublicationUrl } from "../config/store.js";
import {
  buildCampaignPlan,
  buildCampaignRunLogReport,
  parseCampaignChannels,
  readCampaignPlan,
  validateCampaignPlan,
} from "../creator/campaign.js";
import { buildAnalyticsTrend } from "../creator/growth.js";
import { runDoctor } from "../doctor/doctor.js";
import {
  buildCoverageGapOutput,
  buildCoverageValidationOutput,
  loadCoverageMatrix,
  loadCoverageMatrixInput,
} from "../frontier-coverage/cli.js";
import { validateLaunchChecklist } from "../frontier-coverage/launch-checklist.js";
import { FRONTIER_COVERAGE_MATRIX } from "../frontier-coverage/matrix.js";
import {
  COVERAGE_DOMAINS,
  COVERAGE_STATUSES,
  type CapabilityDomain,
  type CoverageStatus,
} from "../frontier-coverage/schema.js";
import { summarizeMediaManifest } from "../parser/media.js";
import { evaluateDistributionPolicy } from "../policy/distribution.js";
import { preparePost } from "../publish/prepare.js";
import {
  compareWorkflowTraceArtifacts,
  reviewWorkflowTraceArtifact,
} from "../publish/workflow-trace.js";
import { validateSchemaFile } from "../schema/fixtures.js";
import {
  resolveApiAuthMaterial,
  summarizeApiAuthMaterial,
  validateApiAuthMaterial,
} from "../substack-api/auth.js";
import { fetchCommentsForPost } from "../substack-api/comment-list.js";
import { buildDraftInspectionReport } from "../substack-api/draft-inspect.js";
import { buildDraftDuplicateLookupReport } from "../substack-api/draft-lookup.js";
import { loadDraftMappings } from "../substack-api/draft-mappings.js";
import { buildDraftSectionResolutionReport } from "../substack-api/draft-section.js";
import { readApiInventory } from "../substack-api/read-model.js";
import { fetchSubscriberList } from "../substack-api/subscriber-list.js";
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

const CampaignPlanArgs = {
  file: z.string().min(1),
  publishAt: z.string().optional(),
  noteAt: z.array(z.string()).optional(),
  channels: z.string().optional(),
  runLogDir: z.string().optional(),
};

const PlanFileArg = {
  planFile: z.string().min(1),
};

const SnapshotsDirArg = {
  snapshotsDir: z.string().min(1),
};

const RunLogDirArg = {
  runLogDir: z.string().min(1),
};

const OptionalMatrixArg = {
  matrixFile: z.string().min(1).optional(),
};

const CoverageGapsArgs = {
  matrixFile: z.string().min(1).optional(),
  status: z.string().min(1).optional(),
  domain: z.string().min(1).optional(),
};

const CoverageInspectArgs = {
  capabilityId: z.string().min(1),
  matrixFile: z.string().min(1).optional(),
};

function parseCoverageStatus(value: string): CoverageStatus {
  if (COVERAGE_STATUSES.includes(value as CoverageStatus)) return value as CoverageStatus;
  throw new Error(`Unsupported coverage status: ${value}.`);
}

function parseCoverageDomain(value: string): CapabilityDomain {
  if (COVERAGE_DOMAINS.includes(value as CapabilityDomain)) return value as CapabilityDomain;
  throw new Error(`Unsupported coverage domain: ${value}.`);
}

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
          description: "Inspect the current publication and recent post inventory.",
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

          return jsonResult(toJsonRecord(inventory), "Read-only API inventory completed.");
        },
      );
    },
  },
  {
    group: "read",
    name: "api.auth.status",
    description: "Summarize the current local auth material without revealing cookie values.",
    cliCommand: "api auth status --source local-profile",
    redacted: true,
    register(server) {
      server.registerTool(
        "api.auth.status",
        {
          description: "Summarize the current local auth material without revealing cookie values.",
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
          return jsonResult(toJsonRecord(summary), "Schema validation completed.");
        },
      );
    },
  },
  {
    group: "review",
    name: "api.media",
    description: "Inspect the parsed media manifest for a Markdown file.",
    cliCommand: "api media <file>",
    redacted: true,
    register(server) {
      server.registerTool(
        "api.media",
        {
          description: "Inspect the parsed media manifest for a Markdown file.",
          inputSchema: FileArg,
          annotations: {
            title: "Media Manifest",
            readOnlyHint: true,
            openWorldHint: false,
          },
        },
        async ({ file }) => {
          const prepared = await preparePost(String(file), { mode: "draft" });
          return jsonResult(
            toJsonRecord({
              filePath: prepared.post.filePath,
              media: {
                ...prepared.post.media,
                assets: summarizeMediaManifest(prepared.post.media),
              },
            }),
            "Media manifest inspection completed.",
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
          return jsonResult(toJsonRecord(review), "Workflow trace review completed.");
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
    description: "Review distribution and dependency hygiene for the repository.",
    cliCommand: "policy",
    redacted: true,
    register(server) {
      server.registerTool(
        "policy",
        {
          description: "Review distribution and dependency hygiene for the repository.",
          annotations: {
            title: "Distribution Policy",
            readOnlyHint: true,
            openWorldHint: false,
          },
        },
        async () => {
          const policy = await evaluateDistributionPolicy();
          return jsonResult(toJsonRecord(policy), "Distribution policy review completed.");
        },
      );
    },
  },
  {
    group: "review",
    name: "coverage.validate",
    description: "Validate the canonical or supplied frontier coverage matrix.",
    cliCommand: "coverage validate",
    redacted: true,
    register(server) {
      server.registerTool(
        "coverage.validate",
        {
          description: "Validate the canonical or supplied frontier coverage matrix.",
          inputSchema: OptionalMatrixArg,
          annotations: {
            title: "Coverage Validate",
            readOnlyHint: true,
            openWorldHint: false,
          },
        },
        async ({ matrixFile }) => {
          const matrix = await loadCoverageMatrixInput(matrixFile ? String(matrixFile) : undefined);
          return jsonResult(
            toJsonRecord(buildCoverageValidationOutput(matrix)),
            "Coverage matrix validation completed.",
          );
        },
      );
    },
  },
  {
    group: "review",
    name: "coverage.gaps",
    description: "Summarize frontier coverage gaps and decision-recorded surfaces.",
    cliCommand: "coverage gaps",
    redacted: true,
    register(server) {
      server.registerTool(
        "coverage.gaps",
        {
          description: "Summarize frontier coverage gaps and decision-recorded surfaces.",
          inputSchema: CoverageGapsArgs,
          annotations: {
            title: "Coverage Gaps",
            readOnlyHint: true,
            openWorldHint: false,
          },
        },
        async ({ matrixFile, status, domain }) => {
          const matrix = await loadCoverageMatrix(matrixFile ? String(matrixFile) : undefined);
          return jsonResult(
            toJsonRecord(
              buildCoverageGapOutput(matrix, {
                status: status ? parseCoverageStatus(String(status)) : undefined,
                domain: domain ? parseCoverageDomain(String(domain)) : undefined,
              }),
            ),
            "Coverage gap summary completed.",
          );
        },
      );
    },
  },
  {
    group: "review",
    name: "coverage.inspect",
    description: "Inspect a single frontier coverage capability by ID.",
    cliCommand: "coverage gaps --domain <domain>",
    redacted: true,
    register(server) {
      server.registerTool(
        "coverage.inspect",
        {
          description: "Inspect a single frontier coverage capability by ID.",
          inputSchema: CoverageInspectArgs,
          annotations: {
            title: "Coverage Inspect",
            readOnlyHint: true,
            openWorldHint: false,
          },
        },
        async ({ capabilityId, matrixFile }) => {
          const matrix = await loadCoverageMatrix(matrixFile ? String(matrixFile) : undefined);
          const capability = matrix.capabilities.find(
            (candidate) => candidate.id === String(capabilityId),
          );
          return jsonResult(
            toJsonRecord({
              operation: "coverage.inspect",
              status: capability ? "ready" : "blocked",
              capabilityId: String(capabilityId),
              capability,
              message: capability ? "Capability found." : "Capability ID was not found.",
            }),
            "Coverage capability inspection completed.",
          );
        },
      );
    },
  },
  {
    group: "review",
    name: "launch.check",
    description: "Review launch/admin checklist readiness without performing external actions.",
    cliCommand: "coverage decisions",
    redacted: true,
    register(server) {
      server.registerTool(
        "launch.check",
        {
          description:
            "Review launch/admin checklist readiness without performing external actions.",
          annotations: {
            title: "Launch Check",
            readOnlyHint: true,
            openWorldHint: false,
          },
        },
        async () =>
          jsonResult(
            toJsonRecord({
              operation: "launch.check",
              checklist: validateLaunchChecklist(),
              capabilityCount: FRONTIER_COVERAGE_MATRIX.capabilities.length,
              note: "External launch and Substack admin follow-through remains owner-approved.",
            }),
            "Launch/admin readiness review completed.",
          ),
      );
    },
  },
  {
    group: "review",
    name: "doctor",
    description: "Check local configuration, transport readiness, and ignored runtime files.",
    cliCommand: "doctor",
    redacted: true,
    register(server) {
      server.registerTool(
        "doctor",
        {
          description: "Check local configuration, transport readiness, and ignored runtime files.",
          annotations: {
            title: "Doctor Diagnostics",
            readOnlyHint: true,
            openWorldHint: false,
          },
        },
        async () => {
          const report = await runDoctor();
          return jsonResult(toJsonRecord(report), "Doctor diagnostics completed.");
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
          return jsonResult(toJsonRecord(report), "Draft contract inference completed.");
        },
      );
    },
  },
  {
    group: "capture",
    name: "api.draft.contract.matrix",
    description: "Merge multiple draft capture artifacts into one inferred contract matrix.",
    cliCommand: "api draft contract-matrix <files...>",
    redacted: true,
    register(server) {
      server.registerTool(
        "api.draft.contract.matrix",
        {
          description: "Merge multiple draft capture artifacts into one inferred contract matrix.",
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
          return jsonResult(toJsonRecord(report), "Draft contract matrix completed.");
        },
      );
    },
  },
  {
    group: "capture",
    name: "api.draft.contract.matrix.compare",
    description: "Compare two draft contract matrix fixtures.",
    cliCommand: "api draft contract-matrix-compare <expected-file> <actual-file>",
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
          const comparison = await compareDraftContractMatrixArtifacts(expectedFile, actualFile);
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
            return jsonResult(toJsonRecord(inventory), "Draft duplicate lookup could not run.");
          }

          const prepared = await preparePost(String(file), { mode: "draft" });
          const mappings = await loadDraftMappings();
          const report = buildDraftDuplicateLookupReport({
            post: prepared.post,
            inventory,
            mappings,
          });

          return jsonResult(toJsonRecord(report), "Draft duplicate lookup completed.");
        },
      );
    },
  },
  {
    group: "capture",
    name: "api.draft.section",
    description: "Resolve a draft section against the current read-only inventory.",
    cliCommand: "api draft section <file>",
    redacted: true,
    register(server) {
      server.registerTool(
        "api.draft.section",
        {
          description: "Resolve a draft section against the current read-only inventory.",
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
            return jsonResult(toJsonRecord(inventory), "Draft section resolution could not run.");
          }

          const prepared = await preparePost(String(file), { mode: "draft" });
          const report = buildDraftSectionResolutionReport({
            post: prepared.post,
            inventory,
          });

          return jsonResult(toJsonRecord(report), "Draft section resolution completed.");
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
          return jsonResult(toJsonRecord(review), "Draft capture review completed.");
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
          const fixture = await writeDraftCaptureFixture(String(file), String(out));
          return jsonResult(toJsonRecord(fixture), "Draft capture fixture written.");
        },
      );
    },
  },
  {
    group: "creator",
    name: "campaign.plan",
    description: "Build a Creator OS campaign plan from a Markdown post without live writes.",
    cliCommand: "campaign plan <file>",
    redacted: true,
    register(server) {
      server.registerTool(
        "campaign.plan",
        {
          description: "Build a Creator OS campaign plan from a Markdown post without live writes.",
          inputSchema: CampaignPlanArgs,
          annotations: {
            title: "Campaign Plan",
            readOnlyHint: true,
            openWorldHint: false,
          },
        },
        async ({ file, publishAt, noteAt, channels, runLogDir }) => {
          const config = await loadEffectiveConfig();
          const prepared = await preparePost(
            String(file),
            publishAt ? { mode: "schedule", scheduleAt: publishAt } : { mode: "publish" },
          );
          const plan = buildCampaignPlan(prepared, {
            publicationUrl: config.publicationUrl,
            publishAt,
            noteAt,
            channels: parseCampaignChannels(channels),
            runLogDir,
          });
          return jsonResult(toJsonRecord(plan), "Campaign plan generated.");
        },
      );
    },
  },
  {
    group: "creator",
    name: "campaign.validate",
    description: "Validate a Creator OS campaign plan artifact.",
    cliCommand: "campaign validate --plan <file>",
    redacted: true,
    register(server) {
      server.registerTool(
        "campaign.validate",
        {
          description: "Validate a Creator OS campaign plan artifact.",
          inputSchema: PlanFileArg,
          annotations: {
            title: "Campaign Validate",
            readOnlyHint: true,
            openWorldHint: false,
          },
        },
        async ({ planFile }) => {
          const plan = await readCampaignPlan(String(planFile));
          return jsonResult(
            toJsonRecord(validateCampaignPlan(plan)),
            "Campaign validation completed.",
          );
        },
      );
    },
  },
  {
    group: "creator",
    name: "analytics.trend",
    description: "Summarize Creator OS analytics snapshots from a local directory.",
    cliCommand: "analytics trend --snapshots-dir <dir>",
    redacted: true,
    register(server) {
      server.registerTool(
        "analytics.trend",
        {
          description: "Summarize Creator OS analytics snapshots from a local directory.",
          inputSchema: SnapshotsDirArg,
          annotations: {
            title: "Analytics Trend",
            readOnlyHint: true,
            openWorldHint: false,
          },
        },
        async ({ snapshotsDir }) => {
          const trend = await buildAnalyticsTrend(String(snapshotsDir));
          return jsonResult(toJsonRecord(trend), "Analytics trend completed.");
        },
      );
    },
  },
  {
    group: "creator",
    name: "campaign.report",
    description: "Summarize campaign run-log artifacts.",
    cliCommand: "campaign report --run-log-dir <dir>",
    redacted: true,
    register(server) {
      server.registerTool(
        "campaign.report",
        {
          description: "Summarize campaign run-log artifacts.",
          inputSchema: RunLogDirArg,
          annotations: {
            title: "Campaign Report",
            readOnlyHint: true,
            openWorldHint: false,
          },
        },
        async ({ runLogDir }) => {
          const report = await buildCampaignRunLogReport(String(runLogDir));
          return jsonResult(toJsonRecord(report), "Campaign run-log report completed.");
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
  const order: McpToolDescriptor["group"][] = ["read", "review", "capture", "creator"];
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
    case "creator":
      return "Read-only Creator OS campaign, growth, and run-log planning tools.";
  }
}

function jsonResult(structuredContent: Record<string, unknown>, message: string): JsonToolResult {
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
