import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
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
  buildCoverageInspectOutput,
  buildCoverageValidationOutput,
  loadCoverageMatrix,
  loadCoverageMatrixInput,
} from "../frontier-coverage/cli.js";
import { validateLaunchChecklist } from "../frontier-coverage/launch-checklist.js";
import { FRONTIER_COVERAGE_MATRIX } from "../frontier-coverage/matrix.js";
import {
  buildSafeSurfaceInspectOutput,
  buildSafeSurfaceListOutput,
} from "../frontier-coverage/safe-surfaces.js";
import {
  type CapabilityDomain,
  COVERAGE_DOMAINS,
  COVERAGE_STATUSES,
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
import { buildDraftInspectionReport } from "../substack-api/draft-inspect.js";
import { buildDraftDuplicateLookupReport } from "../substack-api/draft-lookup.js";
import { loadDraftMappings } from "../substack-api/draft-mappings.js";
import { buildDraftSectionResolutionReport } from "../substack-api/draft-section.js";
import { listNotes } from "../substack-api/notes.js";
import { readApiInventory } from "../substack-api/read-model.js";
import { fetchRecommendationList } from "../substack-api/recommendations.js";
import type { McpSurfaceGroup, McpToolDescriptor } from "./types.js";

type JsonToolResult = {
  content: Array<{ type: "text"; text: string }>;
  structuredContent: Record<string, unknown>;
};

function normalizePaginationLimit(value: unknown): unknown {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  return /^\d+$/.test(trimmed) ? Number(trimmed) : value;
}

const PaginationLimit = z
  .preprocess(normalizePaginationLimit, z.number().int().min(1).max(100).default(10))
  .describe("Maximum number of results to return, from 1 through 100; defaults to 10.");

const EmptyArgs = z.strictObject({});
const ReadInventoryArgs = z.strictObject({
  postLimit: PaginationLimit,
});
const NotesListArgs = z.strictObject({
  limit: PaginationLimit,
});
const FileArg = z.strictObject({
  file: z.string().min(1).describe("Path to the local input file."),
});
const CompareFileArgs = z.strictObject({
  expectedFile: z.string().min(1).describe("Path to the expected local artifact."),
  actualFile: z.string().min(1).describe("Path to the actual local artifact."),
});
const FixtureArgs = z.strictObject({
  file: z.string().min(1).describe("Path to the source capture artifact."),
  out: z.string().min(1).describe("Path where the redacted fixture will be written."),
});
const CampaignPlanArgs = z.strictObject({
  file: z.string().min(1).describe("Path to the campaign Markdown file."),
  publishAt: z.string().optional().describe("Optional publication timestamp."),
  noteAt: z.array(z.string()).optional().describe("Optional note schedule timestamps."),
  channels: z.string().optional().describe("Optional comma-separated distribution channels."),
  runLogDir: z.string().optional().describe("Optional local run-log directory."),
});
const PlanFileArg = z.strictObject({
  planFile: z.string().min(1).describe("Path to the campaign plan artifact."),
});
const SnapshotsDirArg = z.strictObject({
  snapshotsDir: z.string().min(1).describe("Directory containing analytics snapshots."),
});
const RunLogDirArg = z.strictObject({
  runLogDir: z.string().min(1).describe("Directory containing campaign run logs."),
});
const OptionalMatrixArg = z.strictObject({
  matrixFile: z.string().min(1).optional().describe("Optional coverage matrix file path."),
});
const CoverageGapsArgs = z.strictObject({
  matrixFile: z.string().min(1).optional().describe("Optional coverage matrix file path."),
  status: z.string().min(1).optional().describe("Optional coverage status filter."),
  domain: z.string().min(1).optional().describe("Optional capability domain filter."),
});
const CoverageInspectArgs = z.strictObject({
  capabilityId: z.string().min(1).describe("Capability identifier to inspect."),
  matrixFile: z.string().min(1).optional().describe("Optional coverage matrix file path."),
});
const SafeSurfaceInspectArgs = z.strictObject({
  id: z.string().min(1).describe("Safe-surface identifier to inspect."),
});
const DraftMatrixArgs = z.strictObject({
  files: z
    .array(z.string().min(1))
    .min(1)
    .describe("One or more local draft capture artifact paths."),
});

export const MCP_TOOL_INPUT_SCHEMAS = {
  "api.inventory": ReadInventoryArgs,
  "api.auth.status": EmptyArgs,
  "api.notes.list": NotesListArgs,
  "api.recommendations.list": EmptyArgs,
  "schema.validate": FileArg,
  "api.media": FileArg,
  "trace.review": FileArg,
  "trace.compare": CompareFileArgs,
  policy: EmptyArgs,
  "coverage.validate": OptionalMatrixArg,
  "coverage.gaps": CoverageGapsArgs,
  "coverage.inspect": CoverageInspectArgs,
  "coverage.safe_surfaces": EmptyArgs,
  "coverage.safe_surface": SafeSurfaceInspectArgs,
  "launch.check": EmptyArgs,
  doctor: EmptyArgs,
  "api.draft.contract": FileArg,
  "api.draft.contract.matrix": DraftMatrixArgs,
  "api.draft.contract.matrix.compare": CompareFileArgs,
  "api.draft.duplicates": FileArg,
  "api.draft.section": FileArg,
  "api.draft.inspect": FileArg,
  "api.draft.review": FileArg,
  "api.draft.compare": CompareFileArgs,
  "api.draft.fixture": FixtureArgs,
  "campaign.plan": CampaignPlanArgs,
  "campaign.validate": PlanFileArg,
  "analytics.trend": SnapshotsDirArg,
  "campaign.report": RunLogDirArg,
} as const;

export function buildMcpToolInputJsonSchemas(): Record<string, Record<string, unknown>> {
  return Object.fromEntries(
    Object.entries(MCP_TOOL_INPUT_SCHEMAS).map(([name, schema]) => [
      name,
      z.toJSONSchema(schema, { io: "input" }) as Record<string, unknown>,
    ]),
  );
}

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
          inputSchema: EmptyArgs,
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
    group: "read",
    name: "api.notes.list",
    description: "List recent notes for the authenticated profile.",
    cliCommand: "api notes list --source local-profile",
    redacted: true,
    register(server) {
      server.registerTool(
        "api.notes.list",
        {
          description: "List recent notes for the authenticated profile.",
          inputSchema: NotesListArgs,
          annotations: {
            title: "Notes List",
            readOnlyHint: true,
            openWorldHint: true,
          },
        },
        async ({ limit }) => {
          const config = await loadEffectiveConfig();
          const material = await resolveApiAuthMaterial(config, "auto");
          const notes = await listNotes(material, limit ?? 10);
          return jsonResult(
            toJsonRecord({ status: "ok", notes, count: notes.length }),
            "Notes list completed.",
          );
        },
      );
    },
  },
  {
    group: "read",
    name: "api.recommendations.list",
    description: "Probe recommended and recommending publications.",
    cliCommand: "api recommendation list --source local-profile",
    redacted: true,
    register(server) {
      server.registerTool(
        "api.recommendations.list",
        {
          description: "Probe recommended and recommending publications.",
          inputSchema: EmptyArgs,
          annotations: {
            title: "Recommendations List",
            readOnlyHint: true,
            openWorldHint: true,
          },
        },
        async () => {
          const config = await loadEffectiveConfig();
          const material = await resolveApiAuthMaterial(config, "auto");
          const result = await fetchRecommendationList(material.publicationUrl, material, fetch);
          return jsonResult(toJsonRecord(result), "Recommendation list probe completed.");
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
          inputSchema: EmptyArgs,
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
    cliCommand: "coverage inspect --id <capabilityId>",
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
          return jsonResult(
            toJsonRecord(buildCoverageInspectOutput(matrix, String(capabilityId))),
            "Coverage capability inspection completed.",
          );
        },
      );
    },
  },
  {
    group: "review",
    name: "coverage.safe_surfaces",
    description:
      "List safe-boundary frontier surfaces and their planning/probe/manual constraints.",
    cliCommand: "coverage safe-surfaces",
    redacted: true,
    register(server) {
      server.registerTool(
        "coverage.safe_surfaces",
        {
          description:
            "List safe-boundary frontier surfaces and their planning/probe/manual constraints.",
          inputSchema: EmptyArgs,
          annotations: {
            title: "Coverage Safe Surfaces",
            readOnlyHint: true,
            openWorldHint: false,
          },
        },
        async () =>
          jsonResult(
            toJsonRecord(buildSafeSurfaceListOutput()),
            "Safe frontier surface summary completed.",
          ),
      );
    },
  },
  {
    group: "review",
    name: "coverage.safe_surface",
    description: "Inspect one safe-boundary frontier surface by ID.",
    cliCommand: "coverage safe-surface --id <id>",
    redacted: true,
    register(server) {
      server.registerTool(
        "coverage.safe_surface",
        {
          description: "Inspect one safe-boundary frontier surface by ID.",
          inputSchema: SafeSurfaceInspectArgs,
          annotations: {
            title: "Coverage Safe Surface",
            readOnlyHint: true,
            openWorldHint: false,
          },
        },
        async ({ id }) =>
          jsonResult(
            toJsonRecord(buildSafeSurfaceInspectOutput(String(id))),
            "Safe frontier surface inspection completed.",
          ),
      );
    },
  },
  {
    group: "review",
    name: "launch.check",
    description: "Review launch/admin checklist readiness without performing external actions.",
    cliCommand: "coverage launch-check",
    redacted: true,
    register(server) {
      server.registerTool(
        "launch.check",
        {
          description:
            "Review launch/admin checklist readiness without performing external actions.",
          inputSchema: EmptyArgs,
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
          inputSchema: EmptyArgs,
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
          inputSchema: DraftMatrixArgs,
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
