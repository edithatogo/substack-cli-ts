#!/usr/bin/env node
import { appendFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, join, resolve } from "node:path";
import { Command } from "commander";
import { runLocalLogin } from "./auth/local-login.js";
import {
  clearSession,
  createStoredSession,
  loadSession,
  saveSession,
} from "./auth/session-store.js";
import { buildAuthStatusReport, readLocalProfileReadiness } from "./auth/status.js";
import { performSubstackLogin } from "./auth/substack-login.js";
import {
  buildBatchSchedulePlan,
  parseBatchScheduleFileContent,
  parseIdFileContent,
} from "./batch/selectors.js";
import {
  captureLocalDiagnostics,
  capturePublishScreenDiagnostics,
  captureReviewOverlayDiagnostics,
  captureScheduleScreenDiagnostics,
} from "./browser/diagnostics.js";
import {
  compareDraftCaptureArtifacts,
  observeDraftTraffic,
  reviewDraftCaptureArtifact,
  writeDraftCaptureFixture,
} from "./browser/draft-capture.js";
import { inferDraftContract } from "./browser/draft-contract.js";
import {
  buildDraftContractMatrix,
  compareDraftContractMatrixArtifacts,
  writeDraftContractMatrixFixture,
} from "./browser/draft-contract-matrix.js";
import { createLocalBrowserSession } from "./browser/local-browser.js";
import { createStagehandSession } from "./browser/stagehand.js";
import {
  analyticsSnapshotsDir,
  configFilePath,
  draftMappingsFilePath,
  localBrowserProfileDir,
  sessionFilePath,
  stateDir,
} from "./config/paths.js";
import {
  loadConfig,
  loadEffectiveConfig,
  requirePublicationUrl,
  requireSubstackCredentials,
  updateConfig,
} from "./config/store.js";
import {
  buildCampaignExecutionReport,
  buildCampaignPlan,
  buildCampaignRunLogReport,
  collectCampaignOption,
  parseCampaignChannels,
  readCampaignPlan,
  validateCampaignPlan,
} from "./creator/campaign.js";
import {
  buildBackupSnapshotPlan,
  validateBackupSnapshotFile,
  writeBackupSnapshotPlan,
} from "./creator/backup.js";
import { buildCommentTriageReport, inspectCommunitySurface } from "./creator/community.js";
import {
  buildAnalyticsSnapshot,
  buildAnalyticsTrend,
  buildGrowthReport,
  writeAnalyticsSnapshot,
} from "./creator/growth.js";
import { buildCreatorMediaPlan, buildLivePlan, type LiveAudience } from "./creator/media-plan.js";
import {
  buildAttributionReport,
  buildWarehouseExport,
  writeWarehouseExport,
} from "./creator/warehouse.js";
import { runDoctor } from "./doctor/doctor.js";
import {
  buildCoverageDecisionOutput,
  buildCoverageGapOutput,
  buildCoverageInspectOutput,
  buildCoverageValidationOutput,
  buildCaptureFixtureValidationOutput,
  buildCaptureGraduationOutput,
  buildCaptureKitOutput,
  buildEndpointDiffOutput,
  buildEndpointInventoryOutput,
  loadCoverageMatrix,
  loadCoverageMatrixInput,
  renderEndpointInventoryReport,
  renderCoverageReport,
} from "./frontier-coverage/cli.js";
import { validateLaunchChecklist } from "./frontier-coverage/launch-checklist.js";
import { buildReleaseScorecard } from "./frontier-coverage/release-scorecard.js";
import {
  buildSafeSurfaceInspectOutput,
  buildSafeSurfaceListOutput,
  buildUnsafeWriteBlockedOutput,
  type SafeSurfaceId,
} from "./frontier-coverage/safe-surfaces.js";
import {
  type CapabilityDomain,
  COVERAGE_DOMAINS,
  COVERAGE_STATUSES,
  type CoverageStatus,
} from "./frontier-coverage/schema.js";
import { runMcpServer } from "./mcp/server.js";
import {
  buildMcpSummaryResource,
  buildMcpSurfaceManifest,
  summarizeMcpSurface,
} from "./mcp/surface.js";
import { summarizeMediaManifest } from "./parser/media.js";
import { evaluateDistributionPolicy, summarizeDistributionPolicy } from "./policy/distribution.js";
import {
  maybeWriteTrace,
  printPreparedPost,
  runBrowserWorkflow,
} from "./publish/browser-workflow.js";
import { buildPreflightReport, parsePreflightScheduleFile } from "./publish/preflight.js";
import { preparePost } from "./publish/prepare.js";
import { prepublishPost } from "./publish/prepublish.js";
import {
  buildCreatorWorkflowRunLog,
  buildDraftWriteRunLog,
  buildNoteWriteRunLog,
  buildPublishWriteRunLog,
  writeRunLog,
} from "./publish/run-log.js";
import { resolvePostTitle } from "./publish/title.js";
import { resolveTransport } from "./publish/transport.js";
import {
  compareWorkflowTraceArtifacts,
  reviewWorkflowTraceArtifact,
  summarizeWorkflowTrace,
  writeWorkflowTraceFixture,
} from "./publish/workflow-trace.js";
import { captureFixture, compareFixture, validateSchemaFile } from "./schema/fixtures.js";
import {
  fetchAnalyticsInventory,
  fetchEmailPerformance,
  fetchPostAnalytics,
  fetchRevenueAnalytics,
  fetchSubscriberGrowth,
} from "./substack-api/analytics.js";
import {
  formatEmailPerformance,
  formatPostAnalytics,
  formatRevenueAnalytics,
  formatSubscriberGrowth,
  type OutputFormat,
} from "./substack-api/analytics-format.js";
import {
  type ApiAuthSource,
  resolveApiAuthMaterial,
  summarizeApiAuthMaterial,
  validateApiAuthMaterial,
} from "./substack-api/auth.js";
import {
  fetchBillingPromotions,
  fetchBillingSummary,
  fetchPayoutHistory,
  fetchSubscriptionTiers,
  fetchTaxFormStatus,
  initiateRefund,
  redactBillingPiiDeep,
} from "./substack-api/billing.js";
import { fetchCommentsForPost as fetchTriageCommentsForPost } from "./substack-api/comment-list.js";
import {
  banCommenter,
  fetchCommentSettings,
  fetchCommentsForPost,
  getCommentById,
  moderateComment,
  muteCommenter,
  replyToComment,
  updateCommentSettings,
} from "./substack-api/comments.js";
import {
  fetchDomainStatus,
  tryRemoveDomain,
  trySetDomain,
  validateDomainFormat,
} from "./substack-api/domain.js";
import { buildDraftIdInspectionReport } from "./substack-api/draft-id-inspect.js";
import { buildDraftInspectionReport } from "./substack-api/draft-inspect.js";
import { buildDraftDuplicateLookupReport } from "./substack-api/draft-lookup.js";
import {
  findDraftMapping,
  loadDraftMappings,
  saveDraftMapping,
} from "./substack-api/draft-mappings.js";
import { buildDraftSectionResolutionReport } from "./substack-api/draft-section.js";
import { executeDraftWrite, planCreateDraft } from "./substack-api/draft-write.js";
import {
  type BroadcastEntry,
  cancelScheduledBroadcast,
  type EmailTemplateUpdate,
  fetchBroadcastHistory,
  fetchEmailTemplate,
  sendTestEmail,
  updateEmailTemplate,
} from "./substack-api/email.js";
import {
  crossPost,
  fetchApiTokens,
  fetchIntegrations,
  importFromRss,
  importFromWordPress,
} from "./substack-api/integrations.js";
import {
  buildNoteBatchPlan,
  executeNoteWrite,
  type NoteBatchItem,
  type NoteScheduleFileItem,
  parseNoteScheduleFileContent,
  planNoteWrite,
  validateScheduledNoteContract,
} from "./substack-api/note-write.js";
import {
  createNote,
  deleteNote,
  getNote,
  likeNote,
  listNotes,
  replyToNote,
  reshareNote,
} from "./substack-api/notes.js";
import { buildSubstackDraftPayload } from "./substack-api/payload.js";
import {
  fetchPodcastEpisodes,
  fetchPodcastSection,
  fetchPodcastSettings,
  fetchVideoSettings,
} from "./substack-api/podcast.js";
import { readOwnProfile, readPublicProfile } from "./substack-api/profile.js";
import { fetchPublication } from "./substack-api/publication.js";
import {
  fetchPublicationSettings,
  updatePublicationSettings,
} from "./substack-api/publication-settings.js";
import { executePublishWrite, planPublishWrite } from "./substack-api/publish-write.js";
import { type ApiReadInventory, readApiInventory } from "./substack-api/read-model.js";
import {
  addRecommendation,
  fetchRecommendationList,
  fetchRecommendationStatus,
  removeRecommendation,
} from "./substack-api/recommendations.js";
import {
  parseScheduleFileContent,
  parseScheduleReconcileKeys,
  reconcileSchedule,
  type ScheduledQueueItem,
} from "./substack-api/schedule-reconcile.js";
import { getSubscriberCount } from "./substack-api/subscriber.js";
import { fetchSubscriberExport } from "./substack-api/subscriber-export.js";
import { fetchGiftSubscriptions } from "./substack-api/subscriber-gifts.js";
import { importSubscribers } from "./substack-api/subscriber-import.js";
import { fetchSubscriberList } from "./substack-api/subscriber-list.js";
import { fetchSubscriberSegments } from "./substack-api/subscriber-segments.js";
import { fetchSuppressionList, suppressEmail } from "./substack-api/subscriber-suppression.js";
import { createSubstackClient } from "./substack-api/substack-adapter.js";
import {
  changeTeamMemberRole,
  fetchTeamActivity,
  fetchTeamMembers,
  inviteTeamMember,
  removeTeamMember,
} from "./substack-api/team.js";
import { redact, redactUrl } from "./util/redact.js";

const program = new Command();

program
  .name("substack-cli")
  .description("Publish local Markdown files to a user-owned Substack publication.")
  .version("0.1.0");

program
  .command("completion")
  .description("Generate shell completion scripts.")
  .argument("<shell>", "Shell type: bash, zsh, or powershell")
  .action((shell: string) => {
    const allCommands: Array<{ name: string; path: string }> = [];
    function collect(cmd: Command, path?: string) {
      for (const sub of cmd.commands) {
        const fullPath = path ? `${path} ${sub.name()}` : sub.name();
        allCommands.push({ name: sub.name(), path: fullPath });
        collect(sub, fullPath);
      }
    }
    collect(program);

    const cmdNames = allCommands.map((c) => c.name);
    const globalOpts = program.options.map((o) => o.long ?? o.short ?? "").filter(Boolean);

    switch (shell) {
      case "bash":
        console.log(`# substack-cli bash completion
_substack_cli() {
  local cur prev words cword
  _init_completion || return
  if [[ $cword -eq 1 ]]; then
    COMPREPLY=($(compgen -W "${cmdNames.join(" ")}" -- "$cur"))
    return
  fi
  local word="\${words[$cword]}"
  if [[ "$word" == --* ]]; then
    COMPREPLY=($(compgen -W "${globalOpts.join(" ")}" -- "$word"))
  fi
}
complete -F _substack_cli substack-cli
`);
        break;
      case "zsh":
        console.log(`#compdef substack-cli
_substack_cli() {
  local -a commands
  commands=(
${allCommands.map((c) => `    "${c.path}:${c.path}"`).join("\n")}
  )
  _arguments \\
${globalOpts.map((o) => `    "${o}"`).join(" \\\n")} \\
    "*: :->args"
  case $state in
    args) _describe 'command' commands ;;
  esac
}
_substack_cli
`);
        break;
      case "powershell":
        console.log(`@(${allCommands.map((c) => `"${c.name}"`).join(", ")})
`);
        break;
      default:
        console.error(`Unsupported shell: ${shell}. Use bash, zsh, or powershell.`);
        process.exitCode = 1;
    }
  });

program
  .command("inspect")
  .description("Parse a Markdown file and print the generated Tiptap/ProseMirror payload.")
  .argument("<file>", "Markdown file to inspect")
  .action(async (file: string) => {
    const prepared = await preparePost(file, { mode: "draft" });
    printPreparedPost(prepared);
  });

program
  .command("doctor")
  .description("Check local configuration, transport readiness, and ignored runtime files.")
  .action(async () => {
    const report = await runDoctor();
    console.log(JSON.stringify(report, null, 2));

    if (report.status === "error") {
      process.exitCode = 1;
    }
  });

program
  .command("policy")
  .description("Review the repository distribution and dependency policy.")
  .action(async () => {
    const report = await evaluateDistributionPolicy();
    console.log(JSON.stringify(summarizeDistributionPolicy(report), null, 2));

    if (report.status === "error" || report.status === "warn") {
      process.exitCode = 1;
    }
  });

const coverage = program
  .command("coverage")
  .description("Audit the canonical Substack frontier coverage roadmap.");

coverage
  .command("validate")
  .description("Validate the canonical or supplied coverage matrix.")
  .option("--matrix <file>", "Coverage matrix JSON file. Defaults to the built-in matrix.")
  .action(async (options: { matrix?: string | undefined }) => {
    const value = await loadCoverageMatrixInput(options.matrix);
    const output = buildCoverageValidationOutput(value);
    console.log(JSON.stringify(output, null, 2));
    if (output.status === "blocked") process.exitCode = 1;
  });

coverage
  .command("report")
  .description("Render a JSON or Markdown coverage report.")
  .option("--matrix <file>", "Coverage matrix JSON file. Defaults to the built-in matrix.")
  .option("--format <format>", "json or markdown", "json")
  .option("--out <file>", "Write the report to a file instead of stdout")
  .action(
    async (options: { matrix?: string | undefined; format: string; out?: string | undefined }) => {
      const format = parseCoverageFormat(options.format);
      const matrix = await loadCoverageMatrix(options.matrix);
      const report = renderCoverageReport(matrix, format);
      if (options.out) {
        await mkdir(dirname(options.out), { recursive: true });
        await writeFile(options.out, report, "utf8");
        console.log(JSON.stringify({ operation: "coverage.report", outputFile: options.out }));
      } else {
        process.stdout.write(report);
      }
    },
  );

coverage
  .command("gaps")
  .description("List non-implemented, decision-recorded, or missing-evidence coverage gaps.")
  .option("--matrix <file>", "Coverage matrix JSON file. Defaults to the built-in matrix.")
  .option("--status <status>", "Filter by coverage status")
  .option("--domain <domain>", "Filter by capability domain")
  .action(
    async (options: {
      matrix?: string | undefined;
      status?: string | undefined;
      domain?: string | undefined;
    }) => {
      const matrix = await loadCoverageMatrix(options.matrix);
      const output = buildCoverageGapOutput(matrix, {
        status: options.status ? parseCoverageStatus(options.status) : undefined,
        domain: options.domain ? parseCoverageDomain(options.domain) : undefined,
      });
      console.log(JSON.stringify(output, null, 2));
      if (output.status === "blocked") process.exitCode = 1;
    },
  );

coverage
  .command("decisions")
  .description("Inspect gap decision records.")
  .option("--matrix <file>", "Coverage matrix JSON file. Defaults to the built-in matrix.")
  .option("--id <id>", "Return a single decision record by ID")
  .action(async (options: { matrix?: string | undefined; id?: string | undefined }) => {
    const matrix = await loadCoverageMatrix(options.matrix);
    const output = buildCoverageDecisionOutput(matrix, options.id);
    console.log(JSON.stringify(output, null, 2));
    if (output.status === "blocked") process.exitCode = 1;
    if (options.id && output.count === 0) process.exitCode = 1;
  });

coverage
  .command("inspect")
  .description("Inspect a single frontier coverage capability by ID.")
  .option("--matrix <file>", "Coverage matrix JSON file. Defaults to the built-in matrix.")
  .requiredOption("--id <id>", "Capability ID to inspect")
  .action(async (options: { matrix?: string | undefined; id: string }) => {
    const matrix = await loadCoverageMatrix(options.matrix);
    const output = buildCoverageInspectOutput(matrix, options.id);
    console.log(JSON.stringify(output, null, 2));
    if (output.status === "blocked") process.exitCode = 1;
  });

coverage
  .command("capture-validate")
  .description("Validate and minimize a redacted endpoint capture fixture.")
  .requiredOption("--fixture <file>", "Capture evidence fixture JSON file")
  .action(async (options: { fixture: string }) => {
    const output = await buildCaptureFixtureValidationOutput(options.fixture);
    console.log(JSON.stringify(output, null, 2));
    if (output.status === "blocked") process.exitCode = 1;
  });

coverage
  .command("capture-kit")
  .description("Generate a safe endpoint capture kit for a frontier capability.")
  .option("--matrix <file>", "Coverage matrix JSON file. Defaults to the built-in matrix.")
  .requiredOption("--id <id>", "Capability ID to prepare")
  .option("--fixture-dir <dir>", "Directory where the redacted fixture should live")
  .option("--inventory <file>", "Endpoint inventory file used by graduation checks")
  .action(
    async (options: {
      matrix?: string | undefined;
      id: string;
      fixtureDir?: string | undefined;
      inventory?: string | undefined;
    }) => {
      const output = await buildCaptureKitOutput(options.matrix, options.id, {
        fixtureDir: options.fixtureDir,
        inventoryFile: options.inventory,
      });
      console.log(JSON.stringify(output, null, 2));
      if (output.status === "blocked") process.exitCode = 1;
    },
  );

coverage
  .command("capture-inventory")
  .description("Render an endpoint inventory from one or more redacted capture fixtures.")
  .requiredOption("--fixture <file...>", "Capture evidence fixture JSON files")
  .option("--format <format>", "json or markdown", "json")
  .option("--out <file>", "Write the inventory to a file instead of stdout")
  .action(async (options: { fixture: string[]; format: string; out?: string | undefined }) => {
    const format = parseCoverageFormat(options.format);
    const output = await buildEndpointInventoryOutput(options.fixture);
    const rendered = renderEndpointInventoryReport(output, format);
    if (options.out) {
      await mkdir(dirname(options.out), { recursive: true });
      await writeFile(options.out, rendered, "utf8");
      console.log(
        JSON.stringify({
          operation: "coverage.endpoint.inventory",
          outputFile: options.out,
          status: output.status,
        }),
      );
    } else {
      process.stdout.write(rendered);
    }
    if (output.status === "blocked") process.exitCode = 1;
  });

coverage
  .command("capture-diff")
  .description("Compare two endpoint inventory reports for private endpoint drift.")
  .requiredOption("--before <file>", "Previous JSON endpoint inventory report")
  .requiredOption("--after <file>", "Current JSON endpoint inventory report")
  .action(async (options: { before: string; after: string }) => {
    const output = await buildEndpointDiffOutput(options.before, options.after);
    console.log(JSON.stringify(output, null, 2));
    if (output.status === "blocked") process.exitCode = 1;
  });

coverage
  .command("capture-graduation")
  .description("Check whether probe, planning, and manual surfaces have evidence to graduate.")
  .option("--matrix <file>", "Coverage matrix JSON file. Defaults to the built-in matrix.")
  .requiredOption("--inventory <file>", "JSON endpoint inventory report")
  .action(async (options: { matrix?: string | undefined; inventory: string }) => {
    const output = await buildCaptureGraduationOutput(options.matrix, options.inventory);
    console.log(JSON.stringify(output, null, 2));
    if (output.status === "blocked") process.exitCode = 1;
  });

coverage
  .command("safe-surfaces")
  .description(
    "List frontier surfaces that are intentionally planning-only, probe-only, manual, or unsupported.",
  )
  .action(() => {
    console.log(JSON.stringify(buildSafeSurfaceListOutput(), null, 2));
  });

coverage
  .command("safe-surface")
  .description("Inspect a safe frontier surface by ID.")
  .requiredOption("--id <id>", "Safe surface ID to inspect")
  .action((options: { id: string }) => {
    const output = buildSafeSurfaceInspectOutput(options.id);
    console.log(JSON.stringify(output, null, 2));
    if (output.status === "blocked") process.exitCode = 1;
  });

coverage
  .command("launch-check")
  .description("Review launch/admin checklist readiness without performing external actions.")
  .action(() => {
    const checklist = validateLaunchChecklist();
    console.log(
      JSON.stringify(
        {
          operation: "launch.check",
          status: checklist.status,
          checklist,
          note: "External launch and Substack admin follow-through remains owner-approved.",
        },
        null,
        2,
      ),
    );
    if (checklist.status === "blocked") process.exitCode = 1;
  });

coverage
  .command("release-scorecard")
  .description("Report local release readiness and external owner/admin gates.")
  .action(async () => {
    const scorecard = await buildReleaseScorecard();
    console.log(JSON.stringify(scorecard, null, 2));
    if (scorecard.status === "blocked") process.exitCode = 1;
  });

const mcp = program
  .command("mcp")
  .description("Inspect or run the MCP surface for redacted CLI summaries.");

mcp
  .command("surface")
  .description("Print the MCP surface manifest.")
  .action(() => {
    const manifest = buildMcpSurfaceManifest();
    console.log(JSON.stringify(summarizeMcpSurface(manifest), null, 2));
  });

mcp
  .command("summary")
  .description("Print the redacted MCP summary resource.")
  .action(() => {
    console.log(JSON.stringify(buildMcpSummaryResource(), null, 2));
  });

mcp
  .command("serve")
  .description("Run the MCP server over stdio.")
  .action(async () => {
    await runMcpServer();
  });

program
  .command("prepublish")
  .description("Validate the final publish or schedule payload without opening the browser.")
  .argument("<file>", "Markdown file to validate")
  .option("--mode <mode>", "publish or schedule", "publish")
  .option("--at <iso-date>", "ISO timestamp for scheduled publication")
  .action(
    async (
      file: string,
      options: {
        mode: "publish" | "schedule";
        at?: string;
      },
    ) => {
      const prepared = await preparePost(
        file,
        options.at
          ? {
              mode: options.mode,
              scheduleAt: options.at,
            }
          : {
              mode: options.mode,
            },
      );
      const report = prepublishPost(prepared);
      console.log(JSON.stringify(report, null, 2));

      if (report.status === "blocked") {
        process.exitCode = 1;
      }
    },
  );

program
  .command("preflight")
  .description("Run operational contract checks before live publish or schedule mutation.")
  .argument("<file>", "Markdown file to validate")
  .option("--mode <mode>", "publish or schedule", "publish")
  .option("--at <iso-date>", "ISO timestamp for scheduled publication")
  .option("--schedule-file <file>", "Expected schedule file used to detect timestamp collisions")
  .option("--draft-id <id>", "Current draft ID to ignore as a self-collision")
  .option("--strict", "Escalate optional workflow checks to blocking errors", false)
  .action(
    async (
      file: string,
      options: {
        mode: "publish" | "schedule";
        at?: string;
        scheduleFile?: string;
        draftId?: string;
        strict: boolean;
      },
    ) => {
      const prepared = await preparePost(
        file,
        options.at
          ? {
              mode: options.mode,
              scheduleAt: options.at,
            }
          : {
              mode: options.mode,
            },
      );
      const effective = await loadEffectiveConfig();
      const scheduleItems = options.scheduleFile
        ? parsePreflightScheduleFile(
            await readFile(options.scheduleFile, "utf8"),
            options.scheduleFile,
          )
        : undefined;
      const report = buildPreflightReport(prepared, {
        publicationUrl: effective.publicationUrl,
        draftId: options.draftId,
        strict: options.strict,
        scheduleItems,
      });

      console.log(JSON.stringify(report, null, 2));
      if (report.status === "blocked") {
        process.exitCode = 1;
      }
    },
  );

const campaign = program
  .command("campaign")
  .description("Plan, validate, execute, and report Creator OS campaigns.");

campaign
  .command("plan")
  .description("Build a campaign plan artifact from a Markdown post.")
  .argument("<file>", "Markdown file to plan")
  .option("--publish-at <timestamp>", "Future ISO timestamp for publication")
  .option(
    "--note-at <timestamp>",
    "Future ISO timestamp for a covering note",
    collectCampaignOption,
    [],
  )
  .option("--channels <channels>", "Comma-separated channels: notes,linkedin,x,youtube", "notes")
  .option("--run-log-dir <dir>", "Run-log directory to include in planned commands")
  .option("--out <file>", "Write the campaign plan JSON to a file")
  .action(
    async (
      file: string,
      options: {
        publishAt?: string | undefined;
        noteAt: string[];
        channels: string;
        runLogDir?: string | undefined;
        out?: string | undefined;
      },
    ) => {
      const prepared = await preparePost(
        file,
        options.publishAt
          ? { mode: "schedule", scheduleAt: options.publishAt }
          : { mode: "publish" },
      );
      const effective = await loadEffectiveConfig();
      const plan = buildCampaignPlan(prepared, {
        publicationUrl: effective.publicationUrl,
        publishAt: options.publishAt,
        noteAt: options.noteAt,
        channels: parseCampaignChannels(options.channels),
        runLogDir: options.runLogDir,
      });

      if (options.out) {
        await mkdir(dirname(options.out), { recursive: true });
        await writeFile(options.out, `${JSON.stringify(plan, null, 2)}\n`, "utf8");
      }
      await writeRunLog(
        options.runLogDir,
        buildCreatorWorkflowRunLog({
          actionType: "campaign.plan",
          status: plan.status === "ready" ? "success" : "failure",
          publicationUrl: effective.publicationUrl,
          sourceFile: prepared.post.filePath,
          title: plan.post.title,
          scheduledTimeRequested: options.publishAt,
          campaignId: plan.campaignId,
          resultMessage: options.out
            ? `Campaign plan written to ${options.out}.`
            : "Campaign plan generated.",
          errorMessage:
            plan.status === "blocked" ? "Campaign plan has blocking issues." : undefined,
        }),
      );
      console.log(
        JSON.stringify(options.out ? { ...plan, outputFile: options.out } : plan, null, 2),
      );
      if (plan.status === "blocked") process.exitCode = 1;
    },
  );

campaign
  .command("validate")
  .description("Validate a campaign plan artifact.")
  .requiredOption("--plan <file>", "Campaign plan JSON file")
  .action(async (options: { plan: string }) => {
    const plan = await readCampaignPlan(options.plan);
    console.log(JSON.stringify(plan, null, 2));
    if (plan.status === "blocked") process.exitCode = 1;
  });

campaign
  .command("execute")
  .description("Validate campaign execution readiness without adding new unsafe live writes.")
  .requiredOption("--plan <file>", "Campaign plan JSON file")
  .option("--run-log-dir <dir>", "Override run-log directory for campaign execution audit")
  .option("--yes", "Confirm campaign execution readiness", false)
  .action(async (options: { plan: string; runLogDir?: string | undefined; yes: boolean }) => {
    const plan = await readCampaignPlan(options.plan);
    const report = buildCampaignExecutionReport(plan, options.yes);
    const runLogDir = options.runLogDir ?? plan.runLogDir;
    await writeRunLog(
      runLogDir,
      buildCreatorWorkflowRunLog({
        actionType: "campaign.execute",
        status: report.status === "ready" ? "success" : "failure",
        publicationUrl: plan.publicationUrl,
        sourceFile: plan.post.filePath,
        title: plan.post.title,
        scheduledTimeRequested: plan.publishAt,
        campaignId: plan.campaignId,
        resultMessage: report.message,
        errorMessage: report.status === "ready" ? undefined : report.message,
      }),
    );
    console.log(JSON.stringify(report, null, 2));
    if (report.status !== "ready") process.exitCode = 1;
  });

campaign
  .command("report")
  .description("Summarize campaign and mutation run logs.")
  .requiredOption("--run-log-dir <dir>", "Directory containing run-log JSON artifacts")
  .action(async (options: { runLogDir: string }) => {
    const report = await buildCampaignRunLogReport(options.runLogDir);
    console.log(JSON.stringify(report, null, 2));
  });

const creatorMedia = program
  .command("media")
  .description("Plan native media workflows without unsafe uploads.");

const mediaVideo = creatorMedia.command("video").description("Video planning commands.");

mediaVideo
  .command("plan")
  .description("Plan a native Substack video post.")
  .requiredOption("--file <file>", "Video file to package")
  .requiredOption("--post <markdown>", "Markdown post file with metadata")
  .option("--run-log-dir <dir>", "Write a local media planning run log")
  .action(async (options: { file: string; post: string; runLogDir?: string | undefined }) => {
    const prepared = await preparePost(options.post, { mode: "draft" });
    const plan = await buildCreatorMediaPlan("video", options.file, prepared);
    const effective = await loadEffectiveConfig();
    await writeRunLog(
      options.runLogDir,
      buildCreatorWorkflowRunLog({
        actionType: "media.video.plan",
        status: plan.status === "ready" ? "success" : "failure",
        publicationUrl: effective.publicationUrl,
        sourceFile: plan.postFile,
        title: plan.title,
        assetFile: plan.file,
        resultMessage: "Video media plan generated.",
        errorMessage:
          plan.status === "blocked" ? "Video media plan has blocking issues." : undefined,
      }),
    );
    console.log(JSON.stringify(plan, null, 2));
    if (plan.status === "blocked") process.exitCode = 1;
  });

const mediaAudio = creatorMedia.command("audio").description("Audio planning commands.");

mediaAudio
  .command("plan")
  .description("Plan a native Substack audio/podcast post.")
  .requiredOption("--file <file>", "Audio file to package")
  .requiredOption("--post <markdown>", "Markdown post file with metadata")
  .option("--run-log-dir <dir>", "Write a local media planning run log")
  .action(async (options: { file: string; post: string; runLogDir?: string | undefined }) => {
    const prepared = await preparePost(options.post, { mode: "draft" });
    const plan = await buildCreatorMediaPlan("audio", options.file, prepared);
    const effective = await loadEffectiveConfig();
    await writeRunLog(
      options.runLogDir,
      buildCreatorWorkflowRunLog({
        actionType: "media.audio.plan",
        status: plan.status === "ready" ? "success" : "failure",
        publicationUrl: effective.publicationUrl,
        sourceFile: plan.postFile,
        title: plan.title,
        assetFile: plan.file,
        resultMessage: "Audio media plan generated.",
        errorMessage:
          plan.status === "blocked" ? "Audio media plan has blocking issues." : undefined,
      }),
    );
    console.log(JSON.stringify(plan, null, 2));
    if (plan.status === "blocked") process.exitCode = 1;
  });

const live = program.command("live").description("Plan Substack live video workflows.");

live
  .command("plan")
  .description("Plan a live video or RTMP event.")
  .requiredOption("--title <title>", "Live video title")
  .requiredOption("--at <timestamp>", "Future ISO timestamp for the live event")
  .option("--audience <audience>", "everyone, subscribers, or paid", "everyone")
  .option("--run-log-dir <dir>", "Write a local live planning run log")
  .action(
    async (options: {
      title: string;
      at: string;
      audience: string;
      runLogDir?: string | undefined;
    }) => {
      const audience = parseLiveAudience(options.audience);
      const plan = buildLivePlan({ title: options.title, scheduledAt: options.at, audience });
      const effective = await loadEffectiveConfig();
      await writeRunLog(
        options.runLogDir,
        buildCreatorWorkflowRunLog({
          actionType: "live.plan",
          status: plan.status === "ready" ? "success" : "failure",
          publicationUrl: effective.publicationUrl,
          title: plan.title,
          scheduledTimeRequested: plan.scheduledAt,
          resultMessage: "Live video plan generated.",
          errorMessage: plan.status === "blocked" ? "Live plan has blocking issues." : undefined,
        }),
      );
      console.log(JSON.stringify(plan, null, 2));
      if (plan.status === "blocked") process.exitCode = 1;
    },
  );

const creatorAnalytics = program
  .command("analytics")
  .description("Creator OS analytics snapshots and trends.");

creatorAnalytics
  .command("snapshot")
  .description("Capture or dry-run a growth analytics snapshot.")
  .requiredOption("--post-url <url>", "Post URL to attach to the snapshot")
  .requiredOption("--out <file>", "Snapshot JSON output file")
  .option("--post-id <id>", "Numeric Substack post ID for live post analytics", parseInteger)
  .option("--campaign <id>", "Campaign ID to attach")
  .option("--source <source>", "auto, env, or local-profile", "auto")
  .option("--run-log-dir <dir>", "Write a local analytics snapshot run log")
  .option("--dry-run", "Build the snapshot shape without fetching or writing live analytics", false)
  .action(
    async (options: {
      postUrl: string;
      out: string;
      postId?: number | undefined;
      campaign?: string | undefined;
      source: "auto" | ApiAuthSource;
      runLogDir?: string | undefined;
      dryRun: boolean;
    }) => {
      let inventory = null;
      if (!options.dryRun) {
        const effective = await loadEffectiveConfig();
        const material = await resolveApiAuthMaterial(effective, options.source);
        inventory = await fetchAnalyticsInventory(
          material.publicationUrl,
          material,
          fetch,
          options.postId,
        );
      }
      const snapshot = buildAnalyticsSnapshot({
        postUrl: options.postUrl,
        postId: options.postId,
        campaignId: options.campaign,
        analytics: inventory,
      });
      if (!options.dryRun) {
        await writeAnalyticsSnapshot(snapshot, options.out);
      }
      await writeRunLog(
        options.runLogDir,
        buildCreatorWorkflowRunLog({
          actionType: "analytics.snapshot",
          sourceFile: options.out,
          campaignId: options.campaign,
          resultMessage: options.dryRun
            ? "Analytics snapshot dry-run completed."
            : `Analytics snapshot written to ${options.out}.`,
        }),
      );
      console.log(
        JSON.stringify(
          options.dryRun
            ? { status: "planned", snapshot }
            : { status: "ok", outputFile: options.out, snapshot },
          null,
          2,
        ),
      );
    },
  );

creatorAnalytics
  .command("trend")
  .description("Summarize growth trends from local snapshot artifacts.")
  .requiredOption("--snapshots-dir <dir>", "Directory containing snapshot JSON or JSONL files")
  .action(async (options: { snapshotsDir: string }) => {
    const trend = await buildAnalyticsTrend(options.snapshotsDir);
    console.log(JSON.stringify(trend, null, 2));
  });

const growth = program.command("growth").description("Creator growth reports.");

growth
  .command("report")
  .description("Build a campaign growth report from campaign and optional snapshots.")
  .requiredOption("--campaign <file>", "Campaign plan JSON file")
  .option("--snapshots-dir <dir>", "Directory containing analytics snapshots")
  .action(async (options: { campaign: string; snapshotsDir?: string | undefined }) => {
    const campaignPlan = await readCampaignPlan(options.campaign);
    const report = await buildGrowthReport({
      campaign: campaignPlan,
      snapshotsDir: options.snapshotsDir,
    });
    console.log(JSON.stringify(report, null, 2));
  });

const warehouse = program
  .command("warehouse")
  .description("Export local-first Creator OS warehouse tables and attribution reports.");

warehouse
  .command("export")
  .description("Normalize campaigns, analytics probes, and run logs into JSON/CSV tables.")
  .option("--campaign <file>", "Campaign plan JSON file. Repeatable.", collectCampaignOption, [])
  .option("--analytics-dir <dir>", "Directory containing analytics snapshot JSON or JSONL files")
  .option("--run-log-dir <dir>", "Directory containing run-log JSON artifacts")
  .requiredOption("--out-dir <dir>", "Directory for warehouse exports")
  .option("--format <format>", "json, csv, or both", "both")
  .action(
    async (options: {
      campaign: string[];
      analyticsDir?: string | undefined;
      runLogDir?: string | undefined;
      outDir: string;
      format: string;
    }) => {
      const format = parseWarehouseFormat(options.format);
      const exportData = await buildWarehouseExport({
        campaignFiles: options.campaign,
        analyticsDir: options.analyticsDir,
        runLogDir: options.runLogDir,
      });
      const written = await writeWarehouseExport(exportData, options.outDir, format);
      console.log(JSON.stringify({ status: "ok", ...written, warehouse: exportData }, null, 2));
    },
  );

warehouse
  .command("attribution")
  .description("Build a cohort/campaign attribution report from local warehouse inputs.")
  .option("--campaign <file>", "Campaign plan JSON file. Repeatable.", collectCampaignOption, [])
  .option("--analytics-dir <dir>", "Directory containing analytics snapshot JSON or JSONL files")
  .option("--run-log-dir <dir>", "Directory containing run-log JSON artifacts")
  .option("--out <file>", "Write attribution report JSON to a file")
  .action(
    async (options: {
      campaign: string[];
      analyticsDir?: string | undefined;
      runLogDir?: string | undefined;
      out?: string | undefined;
    }) => {
      const exportData = await buildWarehouseExport({
        campaignFiles: options.campaign,
        analyticsDir: options.analyticsDir,
        runLogDir: options.runLogDir,
      });
      const report = buildAttributionReport(exportData);
      if (options.out) {
        await mkdir(dirname(options.out), { recursive: true });
        await writeFile(options.out, `${JSON.stringify(report, null, 2)}\n`, "utf8");
      }
      console.log(
        JSON.stringify(options.out ? { ...report, outputFile: options.out } : report, null, 2),
      );
    },
  );

const backup = program
  .command("backup")
  .description("Plan and validate redacted export-first backup snapshots.");

backup
  .command("plan")
  .description("Write a redacted backup snapshot plan with a manual restore checklist.")
  .requiredOption("--snapshot <file>", "Snapshot plan JSON output file")
  .option("--publication-url <url>", "Publication URL to redact into the plan")
  .option(
    "--source <path>",
    "Local source path to validate. Repeatable.",
    collectCampaignOption,
    [],
  )
  .action(async (options: { snapshot: string; publicationUrl?: string; source: string[] }) => {
    const plan = await buildBackupSnapshotPlan({
      snapshotFile: options.snapshot,
      publicationUrl: options.publicationUrl,
      sources: options.source,
    });
    await writeBackupSnapshotPlan(plan, options.snapshot);
    console.log(JSON.stringify({ ...plan, outputFile: options.snapshot }, null, 2));
    if (plan.status === "blocked") process.exitCode = 1;
  });

backup
  .command("validate")
  .description("Validate a backup snapshot plan and print the restore checklist.")
  .requiredOption("--snapshot <file>", "Snapshot plan JSON file")
  .action(async (options: { snapshot: string }) => {
    const report = await validateBackupSnapshotFile(options.snapshot);
    console.log(JSON.stringify(report, null, 2));
    if (report.status === "blocked") process.exitCode = 1;
  });

const recommendations = program
  .command("recommendations")
  .description("Inspect recommendations discovery surfaces.");

recommendations
  .command("inspect")
  .description("Probe recommendations availability for the current publication.")
  .option("--source <source>", "auto, env, or local-profile", "auto")
  .action(async (options: { source: "auto" | ApiAuthSource }) => {
    const effective = await loadEffectiveConfig();
    const material = await resolveApiAuthMaterial(effective, options.source);
    const result = await inspectCommunitySurface(
      material.publicationUrl,
      material,
      fetch,
      "recommendations",
    );
    console.log(JSON.stringify(result, null, 2));
    if (result.status !== "ok" && result.status !== "not-found") process.exitCode = 1;
  });

const boost = program.command("boost").description("Inspect Substack Boost discovery surfaces.");

boost
  .command("inspect")
  .description("Probe Boost availability for the current publication.")
  .option("--source <source>", "auto, env, or local-profile", "auto")
  .action(async (options: { source: "auto" | ApiAuthSource }) => {
    const effective = await loadEffectiveConfig();
    const material = await resolveApiAuthMaterial(effective, options.source);
    const result = await inspectCommunitySurface(material.publicationUrl, material, fetch, "boost");
    console.log(JSON.stringify(result, null, 2));
    if (result.status !== "ok" && result.status !== "not-found") process.exitCode = 1;
  });

const comments = program.command("comments").description("Comment triage workflows.");

comments
  .command("triage")
  .description("Fetch and triage comments for follow-up, testimonials, and moderation.")
  .requiredOption("--post-id <id>", "Post ID to triage", parseInteger)
  .option("--limit <limit>", "Maximum comments to inspect", parseInteger, 100)
  .option("--source <source>", "auto, env, or local-profile", "auto")
  .action(async (options: { postId: number; limit: number; source: "auto" | ApiAuthSource }) => {
    const effective = await loadEffectiveConfig();
    const material = await resolveApiAuthMaterial(effective, options.source);
    const result = await fetchTriageCommentsForPost(
      material.publicationUrl,
      options.postId,
      material,
      fetch,
      {
        limit: options.limit,
      },
    );
    const report = buildCommentTriageReport(options.postId, result);
    console.log(JSON.stringify(report, null, 2));
    if (report.status !== "ok") process.exitCode = 1;
  });

const trace = program
  .command("trace")
  .description("Review stored browser workflow trace artifacts.");

trace
  .command("review")
  .description("Review a saved browser workflow trace artifact.")
  .argument("<file>", "Workflow trace JSON file to review")
  .action(async (file: string) => {
    const review = await reviewWorkflowTraceArtifact(file);
    console.log(JSON.stringify(summarizeWorkflowTrace(review), null, 2));
  });

trace
  .command("compare")
  .description("Compare two saved browser workflow trace artifacts.")
  .argument("<expected-file>", "Expected workflow trace JSON file")
  .argument("<actual-file>", "Actual workflow trace JSON file")
  .action(async (expectedFile: string, actualFile: string) => {
    const comparison = await compareWorkflowTraceArtifacts(expectedFile, actualFile);
    console.log(JSON.stringify(comparison, null, 2));

    if (!comparison.equal) {
      process.exitCode = 1;
    }
  });

trace
  .command("fixture")
  .description("Write a normalized browser workflow trace fixture.")
  .argument("<file>", "Workflow trace JSON file to normalize")
  .requiredOption("--out <file>", "Fixture JSON output path")
  .action(async (file: string, options: { out: string }) => {
    const fixture = await writeWorkflowTraceFixture(file, options.out);
    console.log(
      JSON.stringify(
        {
          status: "fixture-written",
          outputFile: options.out,
          summary: summarizeWorkflowTrace(fixture),
        },
        null,
        2,
      ),
    );
  });

const draft = program
  .command("draft")
  .description("Create, inspect, or schedule Substack drafts from Markdown.");

draft
  .command("legacy", { isDefault: true, hidden: true })
  .description("Create or update a Substack draft from Markdown.")
  .argument("<file>", "Markdown file to draft")
  .option("--dry-run", "Print the generated payload without opening a browser", false)
  .option("--session-id <id>", "Browserbase session ID to resume")
  .option("--trace-out <file>", "Write the workflow result JSON to a file")
  .option("--run-log-dir <dir>", "Write durable JSON run logs for live mutations")
  .option("--experimental-inject-state", "Use experimental editor-state injection", false)
  .option("--transport <transport>", "browser, api, or auto", "auto")
  .action(
    async (
      file: string,
      options: {
        dryRun: boolean;
        sessionId?: string;
        traceOut?: string;
        runLogDir?: string;
        experimentalInjectState: boolean;
        transport: "browser" | "api" | "auto";
      },
    ) => {
      const transport = resolveTransport(options.transport);
      const prepared = await preparePost(file, { mode: "draft" });

      if (options.dryRun) {
        const plan = planCreateDraft(
          prepared.post,
          requirePublicationUrl(await loadEffectiveConfig()),
        );
        console.log(JSON.stringify(plan, null, 2));
        return;
      }

      if (transport.selected === "api") {
        const effective = await loadEffectiveConfig();
        const publicationUrl = requirePublicationUrl(effective);
        const existingDraft = await findDraftMapping(prepared.post.filePath, publicationUrl);
        const material = await resolveApiAuthMaterial(effective, "auto");
        const validation = await validateApiAuthMaterial(material, fetch);

        if (validation.status !== "ok" || !validation.userId) {
          console.error(
            `API transport failed: ${validation.message ?? "Could not validate the API session."}`,
          );
          process.exitCode = 1;
          return;
        }

        const plan = planCreateDraft(prepared.post, publicationUrl, existingDraft, undefined, {
          uploadEndpoint: effective.uploadEndpoint,
          responseUrlField: effective.uploadResponseField,
        });
        const result = await executeDraftWrite(plan, material, validation.userId, fetch);

        console.log(JSON.stringify(result, null, 2));

        if (result.status === "failed") {
          process.exitCode = 1;
        }

        await maybeWriteTrace(
          {
            status:
              result.status === "failed"
                ? "failed"
                : result.status === "created"
                  ? "draft-created"
                  : "draft-updated",
            operation: result.operation,
            mode: "draft",
            title: resolvePostTitle(prepared.post),
            currentUrl: plan.endpoint,
            finalUrl: plan.endpoint,
            finalState: result.status,
            publishedUrl: undefined,
            draftId: result.draftId,
            draftUrl: result.draftUrl,
            metadata: {
              subtitle: prepared.post.metadata.subtitle,
              tags: prepared.post.metadata.tags,
              audience: prepared.post.metadata.audience,
              section: prepared.post.metadata.section,
            },
            transport: { requested: "api", selected: "api" },
            trace: [],
          },
          options.traceOut,
        );
        await writeRunLog(
          options.runLogDir,
          buildDraftWriteRunLog({
            publicationUrl,
            prepared,
            plan,
            result,
          }),
        );
        return;
      }

      const effective = await loadEffectiveConfig();
      const publicationUrl = requirePublicationUrl(effective);
      const existingDraft = await findDraftMapping(prepared.post.filePath, publicationUrl);
      await runBrowserWorkflow(prepared, { ...options, draftMapping: existingDraft ?? undefined });
    },
  );

draft
  .command("create")
  .description("Create or update a draft through the API and capture its draft ID.")
  .argument("<file>", "Markdown file to draft")
  .option("--dry-run", "Print the generated API draft plan without writing", false)
  .option("--source <source>", "auto, env, or local-profile", "auto")
  .option("--trace-out <file>", "Write the workflow result JSON to a file")
  .option("--run-log-dir <dir>", "Write durable JSON run logs for live mutations")
  .action(
    async (
      file: string,
      options: {
        dryRun: boolean;
        source: "auto" | ApiAuthSource;
        traceOut?: string;
        runLogDir?: string;
      },
    ) => {
      const effective = await loadEffectiveConfig();
      const publicationUrl = requirePublicationUrl(effective);
      const prepared = await preparePost(file, { mode: "draft" });
      const existingDraft = await findDraftMapping(prepared.post.filePath, publicationUrl);

      if (options.dryRun) {
        const plan = planCreateDraft(prepared.post, publicationUrl, existingDraft, undefined, {
          uploadEndpoint: effective.uploadEndpoint,
          responseUrlField: effective.uploadResponseField,
        });
        console.log(JSON.stringify(plan, null, 2));
        return;
      }

      const material = await resolveApiAuthMaterial(effective, options.source);
      const validation = await validateApiAuthMaterial(material, fetch);
      if (validation.status !== "ok" || !validation.userId) {
        console.error(
          JSON.stringify(
            {
              status: "failed",
              message: validation.message ?? "Could not validate the API session.",
              details: validation,
            },
            null,
            2,
          ),
        );
        process.exitCode = 1;
        return;
      }

      const inventory = await readApiInventory(material, fetch, { postLimit: 10 });
      const sectionResolution = buildDraftSectionResolutionReport({
        post: prepared.post,
        inventory,
      });
      const plan = planCreateDraft(
        prepared.post,
        publicationUrl,
        existingDraft,
        sectionResolution,
        {
          uploadEndpoint: effective.uploadEndpoint,
          responseUrlField: effective.uploadResponseField,
        },
      );
      const result = await executeDraftWrite(plan, material, validation.userId, fetch);

      console.log(JSON.stringify(result, null, 2));
      if (result.status === "failed") process.exitCode = 1;

      await maybeWriteTrace(
        {
          status:
            result.status === "failed"
              ? "failed"
              : result.status === "created"
                ? "draft-created"
                : "draft-updated",
          operation: result.operation,
          mode: "draft",
          title: resolvePostTitle(prepared.post),
          currentUrl: plan.endpoint,
          finalUrl: plan.endpoint,
          finalState: result.status,
          publishedUrl: undefined,
          draftId: result.draftId,
          draftUrl: result.draftUrl,
          metadata: {
            subtitle: prepared.post.metadata.subtitle,
            tags: prepared.post.metadata.tags,
            audience: prepared.post.metadata.audience,
            section: prepared.post.metadata.section,
          },
          transport: { requested: "api", selected: "api" },
          trace: [],
        },
        options.traceOut,
      );
      await writeRunLog(
        options.runLogDir,
        buildDraftWriteRunLog({
          publicationUrl,
          prepared,
          plan,
          result,
        }),
      );
    },
  );

draft
  .command("inspect")
  .description("Inspect an existing Substack draft by draft ID.")
  .requiredOption("--draft-id <id>", "Substack draft ID to inspect")
  .option("--source <source>", "auto, env, or local-profile", "auto")
  .option(
    "--draft-limit <limit>",
    "Maximum drafts to fetch before matching by ID",
    parseInteger,
    100,
  )
  .action(
    async (options: { draftId: string; source: "auto" | ApiAuthSource; draftLimit: number }) => {
      const effective = await loadEffectiveConfig();
      const publicationUrl = requirePublicationUrl(effective);
      const material = await resolveApiAuthMaterial(effective, options.source);
      const inventory = await readApiInventory(material, fetch, {
        postLimit: 0,
        draftLimit: options.draftLimit,
      });
      const report = buildDraftIdInspectionReport({
        draftId: options.draftId,
        publicationUrl,
        inventory,
      });

      console.log(JSON.stringify(report, null, 2));
      if (report.status !== "found") process.exitCode = 1;
    },
  );

draft
  .command("schedule")
  .description("Schedule an existing Substack draft by draft ID.")
  .requiredOption("--draft-id <id>", "Substack draft ID to schedule")
  .requiredOption("--scheduled-at <iso-date>", "ISO timestamp for scheduled publication")
  .option("--draft-url <url>", "Substack draft editor URL")
  .option("--dry-run", "Print the generated API schedule plan without writing", false)
  .option("--source <source>", "auto, env, or local-profile", "auto")
  .option("--trace-out <file>", "Write the workflow result JSON to a file")
  .option("--run-log-dir <dir>", "Write durable JSON run logs for live mutations")
  .action(
    async (options: {
      draftId: string;
      scheduledAt: string;
      draftUrl?: string;
      dryRun: boolean;
      source: "auto" | ApiAuthSource;
      traceOut?: string;
      runLogDir?: string;
    }) => {
      const isIsoWithTimezone =
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(
          options.scheduledAt,
        );
      if (!isIsoWithTimezone || Number.isNaN(Date.parse(options.scheduledAt))) {
        console.error(`Error: Invalid schedule timestamp: ${options.scheduledAt}`);
        process.exitCode = 1;
        return;
      }

      const effective = await loadEffectiveConfig();
      const publicationUrl = requirePublicationUrl(effective);
      const draftUrl =
        options.draftUrl ??
        new URL(`/publish/post/${encodeURIComponent(options.draftId)}`, publicationUrl).toString();
      const plan = planPublishWrite(
        options.draftId,
        draftUrl,
        "schedule",
        publicationUrl,
        options.scheduledAt,
      );

      if (options.dryRun) {
        console.log(JSON.stringify(plan, null, 2));
        return;
      }

      const material = await resolveApiAuthMaterial(effective, options.source);
      const validation = await validateApiAuthMaterial(material, fetch);
      if (validation.status !== "ok") {
        console.error(
          JSON.stringify(
            {
              status: "failed",
              message: validation.message ?? "Could not validate API session.",
            },
            null,
            2,
          ),
        );
        process.exitCode = 1;
        return;
      }

      const result = await executePublishWrite(plan, material, fetch);
      console.log(JSON.stringify({ ...result, publishedUrl: result.postUrl }, null, 2));
      if (result.status === "failed") process.exitCode = 1;

      await maybeWriteTrace(
        {
          status: result.status === "failed" ? "failed" : "scheduled",
          operation: "create",
          mode: "schedule",
          title: `Draft ${options.draftId}`,
          currentUrl: plan.endpoint,
          finalUrl: plan.endpoint,
          finalState: result.status,
          publishedUrl: result.postUrl,
          draftId: plan.draftId,
          draftUrl,
          scheduleAt: options.scheduledAt,
          metadata: {},
          transport: { requested: "api", selected: "api" },
          trace: [],
        },
        options.traceOut,
      );
      await writeRunLog(
        options.runLogDir,
        buildPublishWriteRunLog({
          publicationUrl,
          title: `Draft ${options.draftId}`,
          plan,
          result,
        }),
      );
    },
  );

program
  .command("publish")
  .description("Publish a Markdown file after explicit confirmation.")
  .argument("<file>", "Markdown file to publish")
  .option("--dry-run", "Print the generated payload without opening a browser", false)
  .option("--yes", "Confirm publishing without an interactive prompt", false)
  .option("--session-id <id>", "Browserbase session ID to resume")
  .option("--trace-out <file>", "Write the workflow result JSON to a file")
  .option("--run-log-dir <dir>", "Write durable JSON run logs for live mutations")
  .option("--experimental-inject-state", "Use experimental editor-state injection", false)
  .option("--review-only", "Stop at the publish review screen without clicking Publish", false)
  .option("--transport <transport>", "browser, api, or auto", "auto")
  .action(
    async (
      file: string,
      options: {
        dryRun: boolean;
        yes: boolean;
        reviewOnly: boolean;
        sessionId?: string;
        traceOut?: string;
        runLogDir?: string;
        experimentalInjectState: boolean;
        transport: "browser" | "api" | "auto";
      },
    ) => {
      const transport = resolveTransport(options.transport);
      const prepared = await preparePost(file, { mode: "publish" });
      const report = prepublishPost(prepared);
      if (report.status === "blocked") {
        console.log(JSON.stringify(report, null, 2));
        process.exitCode = 1;
        return;
      }
      const effective = await loadEffectiveConfig();
      const publicationUrl = requirePublicationUrl(effective);
      const preflight = buildPreflightReport(prepared, { publicationUrl });
      if (preflight.status === "blocked") {
        console.log(JSON.stringify(preflight, null, 2));
        process.exitCode = 1;
        return;
      }

      if (transport.selected === "api") {
        const existingDraft = await findDraftMapping(prepared.post.filePath, publicationUrl);
        if (!existingDraft) {
          console.error(
            JSON.stringify({
              status: "failed",
              message:
                "API publish requires an existing draft. Run `draft --transport api` first or omit --transport to use the browser workflow.",
              transport,
            }),
          );
          process.exitCode = 1;
          return;
        }

        if (options.dryRun || options.reviewOnly) {
          console.log(JSON.stringify({ ...report, transport }, null, 2));
          if (options.traceOut) {
            await maybeWriteTrace(
              {
                status: "preview",
                operation: "create",
                mode: "publish",
                title: report.title,
                currentUrl: existingDraft.draftUrl ?? "",
                finalUrl: existingDraft.draftUrl ?? "",
                finalState: "reviewed",
                publishedUrl: undefined,
                draftId: existingDraft.draftId,
                metadata: {
                  subtitle: prepared.post.metadata.subtitle,
                  tags: prepared.post.metadata.tags,
                  audience: prepared.post.metadata.audience,
                  section: prepared.post.metadata.section,
                },
                transport: { requested: "api", selected: "api" },
                trace: [],
              },
              options.traceOut,
            );
          }
          return;
        }

        const material = await resolveApiAuthMaterial(effective, "auto");
        const validation = await validateApiAuthMaterial(material, fetch);
        if (validation.status !== "ok") {
          console.error(
            JSON.stringify({
              status: "failed",
              message: validation.message ?? "Could not validate API session.",
              transport,
            }),
          );
          process.exitCode = 1;
          return;
        }

        const publishPlan = planPublishWrite(
          existingDraft.draftId,
          existingDraft.draftUrl ?? "",
          "publish",
          publicationUrl,
          undefined,
          existingDraft,
        );
        const publishResult = await executePublishWrite(publishPlan, material, fetch);
        console.log(
          JSON.stringify(
            { ...publishResult, publishedUrl: publishResult.postUrl, transport },
            null,
            2,
          ),
        );
        if (publishResult.status === "failed") process.exitCode = 1;

        await maybeWriteTrace(
          {
            status: publishResult.status === "failed" ? "failed" : "published",
            operation: "create",
            mode: "publish",
            title: report.title,
            currentUrl: publishPlan.endpoint,
            finalUrl: publishPlan.endpoint,
            finalState: publishResult.status,
            publishedUrl: publishResult.postUrl,
            draftId: publishPlan.draftId,
            metadata: {
              subtitle: prepared.post.metadata.subtitle,
              tags: prepared.post.metadata.tags,
              audience: prepared.post.metadata.audience,
              section: prepared.post.metadata.section,
            },
            transport: { requested: "api", selected: "api" },
            trace: [],
          },
          options.traceOut,
        );
        await writeRunLog(
          options.runLogDir,
          buildPublishWriteRunLog({
            publicationUrl,
            prepared,
            title: report.title,
            plan: publishPlan,
            result: publishResult,
          }),
        );
        return;
      }

      const existingDraft = await findDraftMapping(prepared.post.filePath, publicationUrl);
      await runBrowserWorkflow(prepared, { ...options, draftMapping: existingDraft ?? undefined });
    },
  );

const scheduleCommand = program
  .command("schedule")
  .description("Schedule a Markdown file for future publication.")
  .argument("<file>", "Markdown file to schedule")
  .requiredOption("--at <iso-date>", "ISO timestamp for scheduled publication")
  .option("--dry-run", "Print the generated payload without opening a browser", false)
  .option("--yes", "Confirm scheduling without an interactive prompt", false)
  .option("--session-id <id>", "Browserbase session ID to resume")
  .option("--trace-out <file>", "Write the workflow result JSON to a file")
  .option("--run-log-dir <dir>", "Write durable JSON run logs for live mutations")
  .option("--schedule-file <file>", "Expected schedule file used to detect timestamp collisions")
  .option("--experimental-inject-state", "Use experimental editor-state injection", false)
  .option("--review-only", "Stop at the schedule review screen without clicking Schedule", false)
  .option("--transport <transport>", "browser, api, or auto", "auto")
  .action(
    async (
      file: string,
      options: {
        at: string;
        dryRun: boolean;
        yes: boolean;
        reviewOnly: boolean;
        sessionId?: string;
        traceOut?: string;
        runLogDir?: string;
        scheduleFile?: string;
        experimentalInjectState: boolean;
        transport: "browser" | "api" | "auto";
      },
    ) => {
      const transport = resolveTransport(options.transport);
      const prepared = await preparePost(file, {
        mode: "schedule",
        scheduleAt: options.at,
      });
      const report = prepublishPost(prepared);
      if (report.status === "blocked") {
        console.log(JSON.stringify(report, null, 2));
        process.exitCode = 1;
        return;
      }
      const effective = await loadEffectiveConfig();
      const publicationUrl = requirePublicationUrl(effective);
      const scheduleItems = options.scheduleFile
        ? parsePreflightScheduleFile(
            await readFile(options.scheduleFile, "utf8"),
            options.scheduleFile,
          )
        : undefined;
      const preflight = buildPreflightReport(prepared, { publicationUrl, scheduleItems });
      if (preflight.status === "blocked") {
        console.log(JSON.stringify(preflight, null, 2));
        process.exitCode = 1;
        return;
      }

      if (transport.selected === "api") {
        const existingDraft = await findDraftMapping(prepared.post.filePath, publicationUrl);
        if (!existingDraft) {
          console.error(
            JSON.stringify({
              status: "failed",
              message:
                "API schedule requires an existing draft. Run `draft --transport api` first or omit --transport to use the browser workflow.",
              transport,
            }),
          );
          process.exitCode = 1;
          return;
        }

        if (options.dryRun || options.reviewOnly) {
          console.log(JSON.stringify({ ...report, transport }, null, 2));
          if (options.traceOut) {
            await maybeWriteTrace(
              {
                status: "preview",
                operation: "create",
                mode: "schedule",
                title: report.title,
                currentUrl: existingDraft.draftUrl ?? "",
                finalUrl: existingDraft.draftUrl ?? "",
                finalState: "reviewed",
                publishedUrl: undefined,
                draftId: existingDraft.draftId,
                scheduleAt: options.at,
                metadata: {
                  subtitle: prepared.post.metadata.subtitle,
                  tags: prepared.post.metadata.tags,
                  audience: prepared.post.metadata.audience,
                  section: prepared.post.metadata.section,
                },
                transport: { requested: "api", selected: "api" },
                trace: [],
              },
              options.traceOut,
            );
          }
          return;
        }

        const material = await resolveApiAuthMaterial(effective, "auto");
        const validation = await validateApiAuthMaterial(material, fetch);
        if (validation.status !== "ok") {
          console.error(
            JSON.stringify({
              status: "failed",
              message: validation.message ?? "Could not validate API session.",
              transport,
            }),
          );
          process.exitCode = 1;
          return;
        }

        const schedulePlan = planPublishWrite(
          existingDraft.draftId,
          existingDraft.draftUrl ?? "",
          "schedule",
          publicationUrl,
          options.at,
          existingDraft,
        );
        const scheduleResult = await executePublishWrite(schedulePlan, material, fetch);
        console.log(
          JSON.stringify(
            { ...scheduleResult, publishedUrl: scheduleResult.postUrl, transport },
            null,
            2,
          ),
        );
        if (scheduleResult.status === "failed") process.exitCode = 1;

        await maybeWriteTrace(
          {
            status: scheduleResult.status === "failed" ? "failed" : "scheduled",
            operation: "create",
            mode: "schedule",
            title: report.title,
            currentUrl: schedulePlan.endpoint,
            finalUrl: schedulePlan.endpoint,
            finalState: scheduleResult.status,
            publishedUrl: scheduleResult.postUrl,
            draftId: schedulePlan.draftId,
            scheduleAt: options.at,
            metadata: {
              subtitle: prepared.post.metadata.subtitle,
              tags: prepared.post.metadata.tags,
              audience: prepared.post.metadata.audience,
              section: prepared.post.metadata.section,
            },
            transport: { requested: "api", selected: "api" },
            trace: [],
          },
          options.traceOut,
        );
        await writeRunLog(
          options.runLogDir,
          buildPublishWriteRunLog({
            publicationUrl,
            prepared,
            title: report.title,
            plan: schedulePlan,
            result: scheduleResult,
          }),
        );
        return;
      }

      const existingDraft = await findDraftMapping(prepared.post.filePath, publicationUrl);
      await runBrowserWorkflow(prepared, { ...options, draftMapping: existingDraft ?? undefined });
    },
  );

scheduleCommand
  .command("reconcile")
  .description("Re-fetch scheduled queue state and reconcile it against an expected schedule file.")
  .requiredOption("--schedule-file <file>", "JSON schedule file with items to reconcile")
  .option("--by <keys>", "Comma-separated keys: title,time,draft-id", "title,time")
  .option("--limit <limit>", "Maximum queue entries to fetch from each source", parseInteger, 50)
  .option("--tolerance-minutes <minutes>", "Allowed timestamp drift in minutes", parseInteger, 5)
  .action(
    async (options: {
      scheduleFile: string;
      by: string;
      limit: number;
      toleranceMinutes: number;
    }) => {
      const expected = parseScheduleFileContent(
        await readFile(options.scheduleFile, "utf8"),
        options.scheduleFile,
      );
      const by = parseScheduleReconcileKeys(options.by);
      const effective = await loadEffectiveConfig();
      const publicationUrl = requirePublicationUrl(effective);
      const material = await resolveApiAuthMaterial(effective, "auto");
      const validation = await validateApiAuthMaterial(material, fetch);
      if (validation.status !== "ok") {
        console.error(
          JSON.stringify(
            {
              status: "failed",
              message: validation.message ?? "Could not validate API session.",
            },
            null,
            2,
          ),
        );
        process.exitCode = 1;
        return;
      }

      const [inventory, broadcastHistory] = await Promise.all([
        readApiInventory(material, fetch, { postLimit: options.limit, draftLimit: options.limit }),
        fetchBroadcastHistory(publicationUrl, material, fetch, options.limit),
      ]);
      if (inventory.status !== "ok" || broadcastHistory.status !== "ok") {
        console.error(
          JSON.stringify(
            {
              status: "failed",
              message: "Could not fetch a complete scheduled queue for reconciliation.",
              inventoryStatus: inventory.status,
              broadcastStatus: broadcastHistory.status,
              inventoryMessage: inventory.message,
              broadcastMessage: broadcastHistory.message,
            },
            null,
            2,
          ),
        );
        process.exitCode = 1;
        return;
      }

      const queue = buildScheduledQueue(inventory, broadcastHistory.broadcasts ?? []);
      const report = reconcileSchedule(expected, queue, {
        by,
        toleranceMinutes: options.toleranceMinutes,
      });

      console.log(
        JSON.stringify(
          {
            ...report,
            inventoryStatus: inventory.status,
            broadcastStatus: broadcastHistory.status,
            inventoryMessage: inventory.message,
            broadcastMessage: broadcastHistory.message,
          },
          null,
          2,
        ),
      );
      if (report.status !== "ok") process.exitCode = 1;
    },
  );

const note = program.command("note").description("Create, schedule, inspect, and batch notes.");

note
  .command("inspect")
  .description("Get full details for a specific note by ID.")
  .requiredOption("--note-id <id>", "Note ID", parseInteger)
  .option("--source <source>", "auto, env, or local-profile", "auto")
  .action(async (options: { noteId: number; source: "auto" | ApiAuthSource }) => {
    const effective = await loadEffectiveConfig();
    const material = await resolveApiAuthMaterial(effective, options.source);
    const result = await getNote(material, options.noteId);
    console.log(JSON.stringify({ status: "ok", note: result }, null, 2));
  });

note
  .command("create")
  .description("Publish a note from a local text/Markdown file.")
  .requiredOption("--text-file <file>", "Text or Markdown file containing the note body")
  .option("--source <source>", "auto, env, or local-profile", "auto")
  .option("--dry-run", "Print the local write plan without touching Substack", false)
  .option("--yes", "Confirm live note publishing", false)
  .option("--run-log-dir <dir>", "Write durable JSON run logs for live mutations")
  .action(
    async (options: {
      textFile: string;
      source: "auto" | ApiAuthSource;
      dryRun: boolean;
      yes: boolean;
      runLogDir?: string | undefined;
    }) => {
      const effective = await loadEffectiveConfig();
      const publicationUrl = requirePublicationUrl(effective);
      const text = await readCliTextFile(options.textFile, "note text file");
      if (text === undefined) return;
      if (!text) {
        console.error(
          JSON.stringify({ status: "failed", message: "Note text must not be empty." }, null, 2),
        );
        process.exitCode = 1;
        return;
      }

      const plan = planNoteWrite(publicationUrl, "create", text);
      if (options.dryRun || !options.yes) {
        console.log(
          JSON.stringify(
            {
              status: "planned",
              operation: "note.create",
              requiresConfirmation: !options.yes,
              sourceFile: options.textFile,
              plan,
            },
            null,
            2,
          ),
        );
        if (!options.dryRun && !options.yes) process.exitCode = 1;
        return;
      }

      const material = await resolveApiAuthMaterial(effective, options.source);
      const validation = await validateApiAuthMaterial(material, fetch);
      if (validation.status !== "ok") {
        console.error(
          JSON.stringify(
            { status: "failed", message: validation.message ?? "Could not validate API session." },
            null,
            2,
          ),
        );
        process.exitCode = 1;
        return;
      }

      const result = await executeNoteWrite(plan, material, fetch);
      await writeRunLog(
        options.runLogDir,
        buildNoteWriteRunLog({
          publicationUrl,
          sourceFile: options.textFile,
          plan,
          result,
        }),
      );
      console.log(JSON.stringify(result, null, 2));
      if (result.status === "failed") process.exitCode = 1;
    },
  );

note
  .command("schedule")
  .description("Schedule a covering note from a local text/Markdown file.")
  .requiredOption("--text-file <file>", "Text or Markdown file containing the note body")
  .requiredOption("--post-url <url>", "Matching post URL that must appear in the note")
  .requiredOption("--scheduled-at <timestamp>", "ISO timestamp for the scheduled note")
  .option("--source <source>", "auto, env, or local-profile", "auto")
  .option("--dry-run", "Print the local write plan without touching Substack", false)
  .option("--yes", "Confirm live note scheduling", false)
  .option("--run-log-dir <dir>", "Write durable JSON run logs for live mutations")
  .action(
    async (options: {
      textFile: string;
      postUrl: string;
      scheduledAt: string;
      source: "auto" | ApiAuthSource;
      dryRun: boolean;
      yes: boolean;
      runLogDir?: string | undefined;
    }) => {
      const effective = await loadEffectiveConfig();
      const publicationUrl = requirePublicationUrl(effective);
      const text = await readCliTextFile(options.textFile, "note text file");
      if (text === undefined) return;
      const contractIssues = validateScheduledNoteContract({
        text,
        postUrl: options.postUrl,
        scheduledAt: options.scheduledAt,
      });
      const plan = planNoteWrite(publicationUrl, "schedule", text, {
        postUrl: options.postUrl,
        scheduledAt: options.scheduledAt,
      });

      if (contractIssues.length > 0) {
        console.error(
          JSON.stringify(
            {
              status: "blocked",
              operation: "note.schedule",
              sourceFile: options.textFile,
              issues: contractIssues,
              plan,
            },
            null,
            2,
          ),
        );
        process.exitCode = 1;
        return;
      }

      if (options.dryRun || !options.yes) {
        console.log(
          JSON.stringify(
            {
              status: "planned",
              operation: "note.schedule",
              requiresConfirmation: !options.yes,
              sourceFile: options.textFile,
              plan,
            },
            null,
            2,
          ),
        );
        if (!options.dryRun && !options.yes) process.exitCode = 1;
        return;
      }

      const material = await resolveApiAuthMaterial(effective, options.source);
      const validation = await validateApiAuthMaterial(material, fetch);
      if (validation.status !== "ok") {
        console.error(
          JSON.stringify(
            { status: "failed", message: validation.message ?? "Could not validate API session." },
            null,
            2,
          ),
        );
        process.exitCode = 1;
        return;
      }

      const result = await executeNoteWrite(plan, material, fetch);
      await writeRunLog(
        options.runLogDir,
        buildNoteWriteRunLog({
          publicationUrl,
          sourceFile: options.textFile,
          plan,
          result,
        }),
      );
      console.log(JSON.stringify(result, null, 2));
      if (result.status === "failed") process.exitCode = 1;
    },
  );

note
  .command("batch")
  .description("Schedule covering notes from an explicit JSON schedule file.")
  .requiredOption("--schedule-file <file>", "JSON file with note text, post URLs, and timestamps")
  .option("--limit <limit>", "Maximum selected note items to touch", parseInteger)
  .option("--source <source>", "auto, env, or local-profile", "auto")
  .option("--dry-run", "Print exactly which notes would be touched", false)
  .option("--yes", "Confirm live batch note scheduling", false)
  .option("--run-log-dir <dir>", "Write durable JSON run logs for live mutations")
  .action(
    async (options: {
      scheduleFile: string;
      limit?: number | undefined;
      source: "auto" | ApiAuthSource;
      dryRun: boolean;
      yes: boolean;
      runLogDir?: string | undefined;
    }) => {
      const scheduleContent = await readCliTextFile(options.scheduleFile, "note schedule file");
      if (scheduleContent === undefined) return;
      let items: NoteBatchItem[];
      let rawItems: NoteScheduleFileItem[];
      try {
        rawItems = parseNoteScheduleFileContent(scheduleContent, options.scheduleFile);
        items = await resolveNoteBatchItems(rawItems, dirname(resolve(options.scheduleFile)));
      } catch (error) {
        console.error(
          JSON.stringify(
            {
              status: "failed",
              operation: "note.batch",
              message: error instanceof Error ? error.message : String(error),
            },
            null,
            2,
          ),
        );
        process.exitCode = 1;
        return;
      }
      const plan = buildNoteBatchPlan({
        selectorSourceFile: options.scheduleFile,
        items,
        limit: options.limit,
      });

      if (plan.status === "blocked") {
        console.error(JSON.stringify({ operation: "note.batch", ...plan }, null, 2));
        process.exitCode = 1;
        return;
      }

      if (options.dryRun) {
        console.log(JSON.stringify({ operation: "note.batch", ...plan }, null, 2));
        return;
      }

      if (!options.yes) {
        console.error(
          JSON.stringify(
            {
              ...plan,
              status: "failed",
              message: "Add --yes to confirm live batch note scheduling, or use --dry-run.",
              operation: "note.batch",
            },
            null,
            2,
          ),
        );
        process.exitCode = 1;
        return;
      }

      const effective = await loadEffectiveConfig();
      const publicationUrl = requirePublicationUrl(effective);
      const material = await resolveApiAuthMaterial(effective, options.source);
      const validation = await validateApiAuthMaterial(material, fetch);
      if (validation.status !== "ok") {
        console.error(
          JSON.stringify(
            {
              status: "failed",
              message: validation.message ?? "Could not validate API session.",
              operation: "note.batch",
            },
            null,
            2,
          ),
        );
        process.exitCode = 1;
        return;
      }

      const results = [];
      for (const item of plan.items) {
        const writePlan = planNoteWrite(publicationUrl, "schedule", item.text, {
          postUrl: item.postUrl,
          scheduledAt: item.scheduledAt,
        });
        const result = await executeNoteWrite(writePlan, material, fetch);
        await writeRunLog(
          options.runLogDir,
          buildNoteWriteRunLog({
            publicationUrl,
            sourceFile: item.sourceFile,
            selectorSourceFile: options.scheduleFile,
            title: item.title,
            plan: writePlan,
            result,
          }),
        );
        results.push({ item, result });
      }

      const failed = results.filter(({ result }) => result.status === "failed");
      console.log(
        JSON.stringify(
          {
            status: failed.length > 0 ? "failed" : "ok",
            operation: "note.batch",
            selectorSourceFile: options.scheduleFile,
            touchedCount: results.length,
            skipped: plan.skipped,
            results,
          },
          null,
          2,
        ),
      );
      if (failed.length > 0) process.exitCode = 1;
    },
  );

const notes = program.command("notes").description("Creator OS notes workflows.");

notes
  .command("campaign")
  .description("Validate a campaign note schedule file without live note writes.")
  .requiredOption("--post-url <url>", "Post URL expected in each campaign note")
  .requiredOption("--schedule-file <file>", "JSON note schedule file")
  .option("--limit <limit>", "Maximum selected note items to validate", parseInteger)
  .action(
    async (options: { postUrl: string; scheduleFile: string; limit?: number | undefined }) => {
      const scheduleContent = await readCliTextFile(options.scheduleFile, "note schedule file");
      if (scheduleContent === undefined) return;
      try {
        const rawItems = parseNoteScheduleFileContent(scheduleContent, options.scheduleFile);
        const items = await resolveNoteBatchItems(rawItems, dirname(resolve(options.scheduleFile)));
        const normalizedItems = items.map((item) => ({
          ...item,
          postUrl: options.postUrl,
        }));
        const plan = buildNoteBatchPlan({
          selectorSourceFile: options.scheduleFile,
          items: normalizedItems,
          limit: options.limit,
        });
        console.log(JSON.stringify({ operation: "notes.campaign", ...plan }, null, 2));
        if (plan.status === "blocked") process.exitCode = 1;
      } catch (error) {
        console.error(
          JSON.stringify(
            {
              status: "failed",
              operation: "notes.campaign",
              message: error instanceof Error ? error.message : String(error),
            },
            null,
            2,
          ),
        );
        process.exitCode = 1;
      }
    },
  );

const batch = program.command("batch").description("Run explicit file-selected batch operations.");

batch
  .command("schedule")
  .description("Schedule selected drafts from explicit selector files.")
  .requiredOption("--schedule-file <file>", "JSON schedule file with draft IDs and timestamps")
  .option("--ids-file <file>", "Line-delimited IDs to include")
  .option("--draft-ids-file <file>", "Line-delimited draft IDs to include")
  .option("--limit <limit>", "Maximum selected schedule items to touch", parseInteger)
  .option("--dry-run", "Print exactly which items would be touched", false)
  .option("--yes", "Confirm live batch scheduling", false)
  .option("--run-log-dir <dir>", "Write durable JSON run logs for live mutations")
  .action(
    async (options: {
      scheduleFile: string;
      idsFile?: string | undefined;
      draftIdsFile?: string | undefined;
      limit?: number | undefined;
      dryRun: boolean;
      yes: boolean;
      runLogDir?: string | undefined;
    }) => {
      const scheduleItems = parseBatchScheduleFileContent(
        await readFile(options.scheduleFile, "utf8"),
        options.scheduleFile,
      );
      const ids = options.idsFile
        ? parseIdFileContent(await readFile(options.idsFile, "utf8"))
        : undefined;
      const draftIds = options.draftIdsFile
        ? parseIdFileContent(await readFile(options.draftIdsFile, "utf8"))
        : undefined;
      const selectorSourceFiles = [
        options.scheduleFile,
        ...(options.idsFile ? [options.idsFile] : []),
        ...(options.draftIdsFile ? [options.draftIdsFile] : []),
      ];
      const plan = buildBatchSchedulePlan({
        scheduleItems,
        ids,
        draftIds,
        limit: options.limit,
        selectorSourceFiles,
      });

      if (options.dryRun) {
        console.log(
          JSON.stringify({ status: "planned", operation: "batch.schedule", ...plan }, null, 2),
        );
        return;
      }

      if (!options.yes) {
        console.error(
          JSON.stringify(
            {
              status: "failed",
              message: "Add --yes to confirm live batch scheduling, or use --dry-run.",
              operation: "batch.schedule",
              ...plan,
            },
            null,
            2,
          ),
        );
        process.exitCode = 1;
        return;
      }

      const effective = await loadEffectiveConfig();
      const publicationUrl = requirePublicationUrl(effective);
      const material = await resolveApiAuthMaterial(effective, "auto");
      const validation = await validateApiAuthMaterial(material, fetch);
      if (validation.status !== "ok") {
        console.error(
          JSON.stringify(
            {
              status: "failed",
              message: validation.message ?? "Could not validate API session.",
              operation: "batch.schedule",
              ...plan,
            },
            null,
            2,
          ),
        );
        process.exitCode = 1;
        return;
      }

      const results = [];
      for (const item of plan.items) {
        const draftUrl = new URL(
          `/publish/post/${encodeURIComponent(item.draftId)}`,
          publicationUrl,
        ).toString();
        const schedulePlan = planPublishWrite(
          item.draftId,
          draftUrl,
          "schedule",
          publicationUrl,
          item.scheduledAt,
        );
        const result = await executePublishWrite(schedulePlan, material, fetch);
        await writeRunLog(
          options.runLogDir,
          buildPublishWriteRunLog({
            publicationUrl,
            title: item.title ?? `Draft ${item.draftId}`,
            plan: schedulePlan,
            result,
            selectorSourceFile: selectorSourceFiles.join(","),
          }),
        );
        results.push({ item, result });
      }

      const failed = results.filter(({ result }) => result.status === "failed");
      console.log(
        JSON.stringify(
          {
            status: failed.length > 0 ? "failed" : "ok",
            operation: "batch.schedule",
            selectorSourceFiles,
            touchedCount: results.length,
            skipped: plan.skipped,
            results,
          },
          null,
          2,
        ),
      );
      if (failed.length > 0) process.exitCode = 1;
    },
  );

const schema = program
  .command("schema")
  .description("Validate and capture ProseMirror schema fixtures.");

schema
  .command("validate")
  .description("Validate a ProseMirror JSON file or captured fixture.")
  .argument("<file>", "JSON file to validate")
  .action(async (file: string) => {
    const summary = await validateSchemaFile(file);
    console.log(JSON.stringify(summary, null, 2));
  });

schema
  .command("capture")
  .description("Capture the generated payload for a Markdown file as a schema fixture.")
  .argument("<markdown-file>", "Markdown file to parse")
  .requiredOption("--out <file>", "Fixture JSON output path")
  .action(async (file: string, options: { out: string }) => {
    const fixture = await captureFixture(file, options.out);
    console.log(
      JSON.stringify(
        {
          status: "fixture-written",
          outputFile: options.out,
          summary: fixture.summary,
        },
        null,
        2,
      ),
    );
  });

schema
  .command("compare")
  .description("Compare a Markdown file's current generated document with a saved fixture.")
  .argument("<markdown-file>", "Markdown file to parse")
  .argument("<fixture-file>", "Fixture JSON file")
  .action(async (markdownFile: string, fixtureFile: string) => {
    const result = await compareFixture(markdownFile, fixtureFile);
    console.log(JSON.stringify(result, null, 2));

    if (!result.equal) {
      process.exitCode = 1;
    }
  });

const api = program
  .command("api")
  .description("Read-only internal API probes and future API transport tools.");

const apiAuth = api
  .command("auth")
  .description("Inspect API authentication material without exposing secrets.");

apiAuth
  .command("status")
  .description("Extract local or environment cookie material and print a redacted summary.")
  .option("--source <source>", "auto, env, or local-profile", "auto")
  .option("--no-validate", "Skip read-only Substack validation probes")
  .action(async (options: { source: "auto" | ApiAuthSource; validate: boolean }) => {
    const effective = await loadEffectiveConfig();
    const material = await resolveApiAuthMaterial(effective, options.source);
    const summary = summarizeApiAuthMaterial(material);
    const validation = options.validate ? await validateApiAuthMaterial(material) : null;

    console.log(JSON.stringify({ ...summary, validation }, null, 2));

    if (!summary.hasLikelySessionCookie || validation?.status !== "ok") {
      process.exitCode = 1;
    }
  });

api
  .command("payload")
  .description("Build the write-compatible Substack draft payload for a Markdown file.")
  .argument("<file>", "Markdown file to convert")
  .action(async (file: string) => {
    const prepared = await preparePost(file, { mode: "draft" });
    const payload = buildSubstackDraftPayload(prepared.post);
    console.log(JSON.stringify(payload, null, 2));
  });

api
  .command("media")
  .description("Inspect the parsed media manifest for a Markdown file.")
  .argument("<file>", "Markdown file to inspect")
  .action(async (file: string) => {
    const prepared = await preparePost(file, { mode: "draft" });
    console.log(
      JSON.stringify(
        {
          filePath: prepared.post.filePath,
          media: {
            ...prepared.post.media,
            assets: summarizeMediaManifest(prepared.post.media),
          },
        },
        null,
        2,
      ),
    );
  });

api
  .command("inventory")
  .description("Read user and publication inventory through read-only API probes.")
  .option("--source <source>", "auto, env, or local-profile", "auto")
  .option("--post-limit <limit>", "Maximum number of recent posts to include", parseInteger, 10)
  .option("--draft-limit <limit>", "Maximum number of drafts to include", parseInteger, 10)
  .action(
    async (options: { source: "auto" | ApiAuthSource; postLimit: number; draftLimit: number }) => {
      const effective = await loadEffectiveConfig();
      const material = await resolveApiAuthMaterial(effective, options.source);
      const inventory = await readApiInventory(material, fetch, {
        postLimit: options.postLimit,
        draftLimit: options.draftLimit,
      });

      console.log(JSON.stringify(inventory, null, 2));

      if (inventory.status !== "ok") {
        process.exitCode = 1;
      }
    },
  );

const apiDraft = api
  .command("draft")
  .description("Plan future internal API draft create/update operations.");

apiDraft
  .command("create")
  .description("Build and validate a draft creation request without publishing content.")
  .argument("<file>", "Markdown file to convert")
  .option("--source <source>", "none, auto, env, or local-profile", "none")
  .option("--live", "Attempt the live write request after endpoint contract confirmation", false)
  .action(async (file: string, options: { live: boolean; source: "none" | ApiAuthSource }) => {
    if (options.live) {
      const effective = await loadEffectiveConfig();
      const publicationUrl = requirePublicationUrl(effective);
      const prepared = await preparePost(file, { mode: "draft" });
      const existingDraft = await findDraftMapping(prepared.post.filePath, publicationUrl);

      const liveSource: "auto" | ApiAuthSource =
        options.source === "none" ? "auto" : options.source;
      const material = await resolveApiAuthMaterial(effective, liveSource);
      const validation = await validateApiAuthMaterial(material, fetch);

      if (validation.status !== "ok" || !validation.userId) {
        console.log(
          JSON.stringify(
            {
              status: "failed",
              message: validation.message ?? "Could not validate the API session.",
              details: validation,
            },
            null,
            2,
          ),
        );
        process.exitCode = 1;
        return;
      }

      const sectionResolution =
        options.source === "none"
          ? null
          : buildDraftSectionResolutionReport({
              post: prepared.post,
              inventory: await readApiInventory(material, fetch, {
                postLimit: 10,
              }),
            });
      const plan = planCreateDraft(
        prepared.post,
        publicationUrl,
        existingDraft,
        sectionResolution,
        {
          uploadEndpoint: effective.uploadEndpoint,
          responseUrlField: effective.uploadResponseField,
        },
      );
      const result = await executeDraftWrite(plan, material, validation.userId, fetch);

      console.log(JSON.stringify(result, null, 2));

      if (result.status === "failed") {
        process.exitCode = 1;
      }
      return;
    }

    const effective = await loadEffectiveConfig();
    const publicationUrl = requirePublicationUrl(effective);
    const prepared = await preparePost(file, { mode: "draft" });
    const existingDraft = await findDraftMapping(prepared.post.filePath, publicationUrl);
    const sectionResolution =
      options.source === "none"
        ? null
        : buildDraftSectionResolutionReport({
            post: prepared.post,
            inventory: await readApiInventory(
              await resolveApiAuthMaterial(effective, options.source),
              fetch,
              { postLimit: 10 },
            ),
          });
    const plan = planCreateDraft(prepared.post, publicationUrl, existingDraft, sectionResolution);
    console.log(JSON.stringify(plan, null, 2));
  });

apiDraft
  .command("inspect")
  .description(
    "Bundle payload compatibility, section resolution, duplicate lookup, and draft planning.",
  )
  .option("--source <source>", "auto, env, or local-profile", "auto")
  .argument("<file>", "Markdown file to inspect")
  .action(async (file: string, options: { source: "auto" | ApiAuthSource }) => {
    const effective = await loadEffectiveConfig();
    const publicationUrl = requirePublicationUrl(effective);
    const prepared = await preparePost(file, { mode: "draft" });
    const material = await resolveApiAuthMaterial(effective, options.source);
    const inventory = await readApiInventory(material, fetch, {
      postLimit: 10,
    });
    const mappings = await loadDraftMappings();
    const existingDraft = await findDraftMapping(prepared.post.filePath, publicationUrl);

    const report = buildDraftInspectionReport({
      post: prepared.post,
      publicationUrl,
      inventory,
      mappings,
      existingDraft,
    });

    console.log(JSON.stringify(report, null, 2));
    if (report.status !== "ready") {
      process.exitCode = 1;
    }
  });

apiDraft
  .command("mappings")
  .description("List local source-file to Substack draft mappings.")
  .action(async () => {
    const mappings = await loadDraftMappings();
    console.log(
      JSON.stringify(
        {
          mappingsFile: draftMappingsFilePath(),
          mappings,
        },
        null,
        2,
      ),
    );
  });

apiDraft
  .command("observe")
  .description("Watch local browser traffic while manually creating or saving a draft.")
  .argument(
    "[url]",
    "Publication URL to open before observation, defaults to the configured publication",
  )
  .option(
    "--timeout-seconds <seconds>",
    "How long to observe network traffic before stopping",
    parseInteger,
    180,
  )
  .action(
    async (
      url: string | undefined,
      options: {
        timeoutSeconds: number;
      },
    ) => {
      const effective = await loadEffectiveConfig();
      const publicationUrl = url ?? requirePublicationUrl(effective);
      const browser = await createLocalBrowserSession();

      try {
        const summary = await observeDraftTraffic(browser.page, {
          timeoutMs: options.timeoutSeconds * 1000,
          publicationUrl,
        });

        console.log(JSON.stringify(summary, null, 2));
      } finally {
        await browser.close();
      }
    },
  );

apiDraft
  .command("contract")
  .description(
    "Infer likely draft create/update/fetch endpoints from a saved draft capture artifact.",
  )
  .argument("<file>", "Draft capture JSON file to analyze")
  .action(async (file: string) => {
    const review = await reviewDraftCaptureArtifact(file);
    const report = inferDraftContract(review);
    console.log(JSON.stringify(report, null, 2));
  });

apiDraft
  .command("contract-matrix")
  .description("Merge multiple draft capture artifacts into one inferred contract matrix.")
  .argument("<files...>", "Draft capture JSON files to analyze")
  .option("--out <file>", "Write the matrix fixture to a file")
  .action(async (files: string[], options: { out?: string }) => {
    const inputs = await Promise.all(
      files.map(async (sourceFile) => ({
        sourceFile,
        review: await reviewDraftCaptureArtifact(sourceFile),
      })),
    );
    const report = options.out
      ? await writeDraftContractMatrixFixture(inputs, { outFile: options.out })
      : buildDraftContractMatrix(inputs);
    console.log(JSON.stringify(report, null, 2));
  });

apiDraft
  .command("contract-matrix-compare")
  .description("Compare two draft contract matrix fixtures.")
  .argument("<expected-file>", "Expected draft contract matrix JSON file")
  .argument("<actual-file>", "Actual draft contract matrix JSON file")
  .action(async (expectedFile: string, actualFile: string) => {
    const comparison = await compareDraftContractMatrixArtifacts(expectedFile, actualFile);

    console.log(JSON.stringify(comparison, null, 2));

    if (!comparison.equal) {
      process.exitCode = 1;
    }
  });

apiDraft
  .command("review")
  .description("Review a saved draft capture artifact and print a summary.")
  .argument("<file>", "Draft capture JSON file to review")
  .action(async (file: string) => {
    const review = await reviewDraftCaptureArtifact(file);
    console.log(JSON.stringify(review, null, 2));
  });

apiDraft
  .command("compare")
  .description("Compare two saved draft capture artifacts.")
  .argument("<expected-file>", "Expected draft capture JSON file")
  .argument("<actual-file>", "Actual draft capture JSON file")
  .action(async (expectedFile: string, actualFile: string) => {
    const comparison = await compareDraftCaptureArtifacts(expectedFile, actualFile);

    console.log(JSON.stringify(comparison, null, 2));

    if (!comparison.equal) {
      process.exitCode = 1;
    }
  });

apiDraft
  .command("fixture")
  .description("Write a normalized draft capture fixture from a saved artifact.")
  .argument("<file>", "Draft capture JSON file to normalize")
  .requiredOption("--out <file>", "Fixture JSON output path")
  .action(async (file: string, options: { out: string }) => {
    const review = await writeDraftCaptureFixture(file, options.out);

    console.log(
      JSON.stringify(
        {
          status: "fixture-written",
          outputFile: options.out,
          summary: review,
        },
        null,
        2,
      ),
    );
  });

apiDraft
  .command("link")
  .description("Record a local source-file to Substack draft mapping.")
  .argument("<file>", "Markdown source file")
  .requiredOption("--draft-id <id>", "Substack draft ID")
  .option("--draft-url <url>", "Substack draft editor URL")
  .option("--title <title>", "Draft title to store")
  .option("--slug <slug>", "Draft slug to store")
  .action(
    async (
      file: string,
      options: {
        draftId: string;
        draftUrl?: string;
        title?: string;
        slug?: string;
      },
    ) => {
      const effective = await loadEffectiveConfig();
      const prepared = await preparePost(file, { mode: "draft" });
      const mapping = await saveDraftMapping({
        sourceFile: prepared.post.filePath,
        publicationUrl: requirePublicationUrl(effective),
        draftId: options.draftId,
        draftUrl: options.draftUrl,
        title:
          options.title ??
          planCreateDraft(prepared.post, requirePublicationUrl(effective)).payload.title,
        slug: options.slug ?? prepared.post.metadata.slug,
      });

      console.log(JSON.stringify(mapping, null, 2));
    },
  );

apiDraft
  .command("duplicates")
  .description("Look up likely duplicate drafts using the read-only inventory and local mappings.")
  .option("--source <source>", "auto, env, or local-profile", "auto")
  .option("--post-limit <limit>", "Maximum number of recent posts to inspect", parseInteger, 10)
  .argument("<file>", "Markdown file to inspect")
  .action(async (file: string, options: { source: "auto" | ApiAuthSource; postLimit: number }) => {
    const effective = await loadEffectiveConfig();
    const prepared = await preparePost(file, { mode: "draft" });
    const material = await resolveApiAuthMaterial(effective, options.source);
    const inventory = await readApiInventory(material, fetch, {
      postLimit: options.postLimit,
    });

    if (inventory.status !== "ok") {
      console.log(JSON.stringify(inventory, null, 2));
      process.exitCode = 1;
      return;
    }

    const mappings = await loadDraftMappings();
    const report = buildDraftDuplicateLookupReport({
      post: prepared.post,
      inventory,
      mappings,
    });

    console.log(JSON.stringify(report, null, 2));
  });

apiDraft
  .command("section")
  .description("Resolve a draft section against the current read-only inventory.")
  .option("--source <source>", "auto, env, or local-profile", "auto")
  .argument("<file>", "Markdown file to inspect")
  .action(async (file: string, options: { source: "auto" | ApiAuthSource }) => {
    const effective = await loadEffectiveConfig();
    const prepared = await preparePost(file, { mode: "draft" });
    const material = await resolveApiAuthMaterial(effective, options.source);
    const inventory = await readApiInventory(material, fetch, {
      postLimit: 10,
    });

    if (inventory.status !== "ok") {
      console.log(JSON.stringify(inventory, null, 2));
      process.exitCode = 1;
      return;
    }

    const report = buildDraftSectionResolutionReport({
      post: prepared.post,
      inventory,
    });

    console.log(JSON.stringify(report, null, 2));
  });

const apiPublication = api
  .command("publication")
  .description("Read publication details and settings.");

apiPublication
  .command("get")
  .description("Fetch full publication details.")
  .option("--source <source>", "auto, env, or local-profile", "auto")
  .action(async (options: { source: "auto" | ApiAuthSource }) => {
    const effective = await loadEffectiveConfig();
    const material = await resolveApiAuthMaterial(effective, options.source);
    try {
      const result = await fetchPublication(material.publicationUrl, material, fetch);
      console.log(JSON.stringify(result, null, 2));
    } catch (err) {
      console.error(
        JSON.stringify(
          { status: "failed", message: err instanceof Error ? err.message : String(err) },
          null,
          2,
        ),
      );
      process.exitCode = 1;
    }
  });

apiPublication
  .command("settings")
  .description("Fetch publication branding settings (colors, fonts, logos, SEO).")
  .option("--source <source>", "auto, env, or local-profile", "auto")
  .action(async (options: { source: "auto" | ApiAuthSource }) => {
    const effective = await loadEffectiveConfig();
    const material = await resolveApiAuthMaterial(effective, options.source);
    try {
      const result = await fetchPublicationSettings(material.publicationUrl, material, fetch);
      console.log(JSON.stringify(result, null, 2));
    } catch (err) {
      console.error(
        JSON.stringify(
          { status: "failed", message: err instanceof Error ? err.message : String(err) },
          null,
          2,
        ),
      );
      process.exitCode = 1;
    }
  });

apiPublication
  .command("get-details")
  .description("Alias for settings.")
  .option("--source <source>", "auto, env, or local-profile", "auto")
  .action(async (options: { source: "auto" | ApiAuthSource }) => {
    const effective = await loadEffectiveConfig();
    const material = await resolveApiAuthMaterial(effective, options.source);
    try {
      const result = await fetchPublicationSettings(material.publicationUrl, material, fetch);
      console.log(JSON.stringify(result, null, 2));
    } catch (err) {
      console.error(
        JSON.stringify(
          { status: "failed", message: err instanceof Error ? err.message : String(err) },
          null,
          2,
        ),
      );
      process.exitCode = 1;
    }
  });

apiPublication
  .command("set")
  .description("Update publication settings with a read-modify-write cycle.")
  .option("--source <source>", "auto, env, or local-profile", "auto")
  .option("--from-json <file>", "JSON file with settings to apply")
  .option("--from-yaml <file>", "YAML file with settings to apply")
  .option("--name <name>", "Publication name")
  .option("--description <description>", "Publication description")
  .option("--hero-text <text>", "Hero text")
  .option("--logo-url <url>", "Logo URL")
  .option("--favicon-url <url>", "Favicon URL")
  .option("--primary-color <color>", "Primary color (hex)")
  .option("--secondary-color <color>", "Secondary color (hex)")
  .option("--background-color <color>", "Background color (hex)")
  .option("--text-color <color>", "Text color (hex)")
  .option("--font-heading <font>", "Heading font family")
  .option("--font-body <font>", "Body font family")
  .option("--seo-title <title>", "SEO meta title")
  .option("--seo-description <description>", "SEO meta description")
  .option("--og-image-url <url>", "Open Graph image URL")
  .option("--email-header-color <color>", "Email header color (hex)")
  .option("--email-footer-color <color>", "Email footer color (hex)")
  .option("--dry-run", "Preview changes without writing", false)
  .option("--yes", "Confirm update without interactive prompt", false)
  .action(
    async (options: {
      source: "auto" | ApiAuthSource;
      fromJson?: string;
      fromYaml?: string;
      name?: string;
      description?: string;
      heroText?: string;
      logoUrl?: string;
      faviconUrl?: string;
      primaryColor?: string;
      secondaryColor?: string;
      backgroundColor?: string;
      textColor?: string;
      fontHeading?: string;
      fontBody?: string;
      seoTitle?: string;
      seoDescription?: string;
      ogImageUrl?: string;
      emailHeaderColor?: string;
      emailFooterColor?: string;
      dryRun: boolean;
      yes: boolean;
    }) => {
      if (!options.yes && !options.dryRun) {
        console.log(
          JSON.stringify(
            {
              status: "failed",
              message: "Use --yes to confirm update or --dry-run to preview changes.",
            },
            null,
            2,
          ),
        );
        process.exitCode = 1;
        return;
      }
      if (!options.dryRun) {
        printUnsafeWriteBlocked("publication-admin-writes", "api publication set");
        return;
      }

      const effective = await loadEffectiveConfig();
      const material = await resolveApiAuthMaterial(effective, options.source);

      let updates: Record<string, unknown> = {};

      if (options.fromJson) {
        const { readFileSync } = await import("node:fs");
        updates = JSON.parse(readFileSync(options.fromJson, "utf-8")) as Record<string, unknown>;
      } else if (options.fromYaml) {
        const { readFileSync } = await import("node:fs");
        const yaml = await import("js-yaml");
        updates = yaml.load(readFileSync(options.fromYaml, "utf-8")) as Record<string, unknown>;
      } else {
        if (options.name) updates.name = options.name;
        if (options.description) updates.description = options.description;
        if (options.heroText) updates.hero_text = options.heroText;
        if (options.logoUrl) updates.logo_url = options.logoUrl;
        if (options.faviconUrl) updates.favicon_url = options.faviconUrl;
        if (
          options.primaryColor ||
          options.secondaryColor ||
          options.backgroundColor ||
          options.textColor
        ) {
          updates.colors = {};
          if (options.primaryColor)
            (updates.colors as Record<string, string>).primary = options.primaryColor;
          if (options.secondaryColor)
            (updates.colors as Record<string, string>).secondary = options.secondaryColor;
          if (options.backgroundColor)
            (updates.colors as Record<string, string>).background = options.backgroundColor;
          if (options.textColor)
            (updates.colors as Record<string, string>).text = options.textColor;
        }
        if (options.fontHeading) updates.font_family_heading = options.fontHeading;
        if (options.fontBody) updates.font_family_body = options.fontBody;
        if (options.seoTitle) updates.seo_title = options.seoTitle;
        if (options.seoDescription) updates.seo_description = options.seoDescription;
        if (options.ogImageUrl) updates.og_image_url = options.ogImageUrl;
        if (options.emailHeaderColor) updates.email_header_color = options.emailHeaderColor;
        if (options.emailFooterColor) updates.email_footer_color = options.emailFooterColor;
      }

      const result = await updatePublicationSettings(
        material.publicationUrl,
        material,
        fetch,
        updates,
        { dryRun: options.dryRun, confirm: options.yes },
      );

      console.log(JSON.stringify(result, null, 2));
      if (result.status !== "ok") {
        process.exitCode = 1;
      }
    },
  );

apiPublication
  .command("upload-logo")
  .description("Return a blocked manual/admin result for logo upload until safe captures exist.")
  .argument("<file>", "Logo image file to upload")
  .option("--source <source>", "auto, env, or local-profile", "auto")
  .option("--yes", "Acknowledge the blocked manual/admin boundary", false)
  .action(async (_file: string, options: { source: "auto" | ApiAuthSource; yes: boolean }) => {
    if (!options.yes) {
      console.log(
        JSON.stringify(
          {
            status: "failed",
            message: "Use --yes to acknowledge the blocked logo upload boundary.",
          },
          null,
          2,
        ),
      );
      process.exitCode = 1;
      return;
    }
    printUnsafeWriteBlocked("publication-admin-writes", "api publication upload-logo");
    return;
  });

apiPublication
  .command("upload-favicon")
  .description("Return a blocked manual/admin result for favicon upload until safe captures exist.")
  .argument("<file>", "Favicon image file to upload")
  .option("--source <source>", "auto, env, or local-profile", "auto")
  .option("--yes", "Acknowledge the blocked manual/admin boundary", false)
  .action(async (_file: string, options: { source: "auto" | ApiAuthSource; yes: boolean }) => {
    if (!options.yes) {
      console.log(
        JSON.stringify(
          {
            status: "failed",
            message: "Use --yes to acknowledge the blocked favicon upload boundary.",
          },
          null,
          2,
        ),
      );
      process.exitCode = 1;
      return;
    }
    printUnsafeWriteBlocked("publication-admin-writes", "api publication upload-favicon");
    return;
  });

const apiDomain = api
  .command("domain")
  .description("Custom domain management (status, set, remove) with DNS guidance.");

apiDomain
  .command("status")
  .description("Show custom domain status and DNS configuration.")
  .option("--source <source>", "auto, env, or local-profile", "auto")
  .action(async (options: { source: "auto" | ApiAuthSource }) => {
    const effective = await loadEffectiveConfig();
    const material = await resolveApiAuthMaterial(effective, options.source);
    const result = await fetchDomainStatus(material.publicationUrl, material, fetch);
    console.log(JSON.stringify(result, null, 2));
    if (result.status !== "ok") {
      process.exitCode = 1;
    }
  });

apiDomain
  .command("verify")
  .description("Refresh custom domain verification and SSL status without mutating settings.")
  .option("--source <source>", "auto, env, or local-profile", "auto")
  .action(async (options: { source: "auto" | ApiAuthSource }) => {
    const effective = await loadEffectiveConfig();
    const material = await resolveApiAuthMaterial(effective, options.source);
    const result = await fetchDomainStatus(material.publicationUrl, material, fetch);
    console.log(
      JSON.stringify({ ...result, message: `Verification refresh: ${result.message}` }, null, 2),
    );
    if (result.status !== "ok") {
      process.exitCode = 1;
    }
  });

apiDomain
  .command("set")
  .description(
    "Attempt to set a custom domain. The Substack API endpoint for domain mutation has not been confirmed, so this probes known paths and reports availability.",
  )
  .requiredOption("--domain <domain>", "Custom domain to set (e.g., newsletter.example.com)")
  .option("--source <source>", "auto, env, or local-profile", "auto")
  .option("--yes", "Confirm domain change without interactive prompt", false)
  .action(async (options: { domain: string; source: "auto" | ApiAuthSource; yes: boolean }) => {
    const validation = validateDomainFormat(options.domain);
    if (!validation.valid) {
      console.log(
        JSON.stringify(
          {
            status: "failed",
            message: `Invalid domain: ${validation.reason}`,
          },
          null,
          2,
        ),
      );
      process.exitCode = 1;
      return;
    }

    if (!options.yes) {
      console.log(
        JSON.stringify(
          {
            status: "failed",
            message:
              "Add --yes to confirm custom domain change. This action modifies your publication settings.",
          },
          null,
          2,
        ),
      );
      process.exitCode = 1;
      return;
    }

    const effective = await loadEffectiveConfig();
    const material = await resolveApiAuthMaterial(effective, options.source);
    const result = await trySetDomain(material.publicationUrl, material, fetch, options.domain);
    console.log(JSON.stringify(result, null, 2));
    if (result.status !== "ok") {
      process.exitCode = 1;
    }
  });

apiDomain
  .command("remove")
  .description(
    "Attempt to remove the custom domain. The Substack API endpoint for domain mutation has not been confirmed, so this probes known paths and reports availability.",
  )
  .option("--source <source>", "auto, env, or local-profile", "auto")
  .option("--yes", "Confirm domain removal without interactive prompt", false)
  .action(async (options: { source: "auto" | ApiAuthSource; yes: boolean }) => {
    if (!options.yes) {
      console.log(
        JSON.stringify(
          {
            status: "failed",
            message:
              "Add --yes to confirm custom domain removal. This will revert your publication to the Substack subdomain.",
          },
          null,
          2,
        ),
      );
      process.exitCode = 1;
      return;
    }

    const effective = await loadEffectiveConfig();
    const material = await resolveApiAuthMaterial(effective, options.source);
    const result = await tryRemoveDomain(material.publicationUrl, material, fetch);
    console.log(JSON.stringify(result, null, 2));
    if (result.status !== "ok") {
      process.exitCode = 1;
    }
  });

const apiTeam = api.command("team").description("Publication team management.");

apiTeam
  .command("list")
  .description("List publication team members.")
  .option("--source <source>", "auto, env, or local-profile", "auto")
  .option("--include-emails", "Include team member email addresses in output", false)
  .action(async (options: { source: "auto" | ApiAuthSource; includeEmails: boolean }) => {
    const effective = await loadEffectiveConfig();
    const material = await resolveApiAuthMaterial(effective, options.source);
    const result = await fetchTeamMembers(material.publicationUrl, material, fetch, {
      includeEmails: options.includeEmails,
    });
    console.log(JSON.stringify(result, null, 2));
    if (result.status !== "ok") {
      process.exitCode = 1;
    }
  });

apiTeam
  .command("activity")
  .description("Probe recent team activity.")
  .option("--source <source>", "auto, env, or local-profile", "auto")
  .action(async (options: { source: "auto" | ApiAuthSource }) => {
    const effective = await loadEffectiveConfig();
    const material = await resolveApiAuthMaterial(effective, options.source);
    const result = await fetchTeamActivity(material.publicationUrl, material, fetch);
    console.log(JSON.stringify(result, null, 2));
    if (result.status !== "ok") {
      process.exitCode = 1;
    }
  });

apiTeam
  .command("invite")
  .description("Probe inviting a collaborator by email. Requires --yes confirmation.")
  .argument("<email>", "Email address to invite")
  .requiredOption("--role <role>", "Role: admin, editor, contributor, or reader")
  .option("--source <source>", "auto, env, or local-profile", "auto")
  .requiredOption("--yes", "Confirm team invitation")
  .action(
    async (
      email: string,
      options: { role: string; source: "auto" | ApiAuthSource; yes: boolean },
    ) => {
      if (!options.yes) {
        console.log(
          JSON.stringify(
            { status: "failed", message: "Add --yes to confirm team invitation." },
            null,
            2,
          ),
        );
        process.exitCode = 1;
        return;
      }
      const effective = await loadEffectiveConfig();
      const material = await resolveApiAuthMaterial(effective, options.source);
      const result = await inviteTeamMember(
        material.publicationUrl,
        email,
        options.role,
        material,
        fetch,
      );
      console.log(JSON.stringify(result, null, 2));
      if (result.status !== "ok") {
        process.exitCode = 1;
      }
    },
  );

apiTeam
  .command("remove")
  .description("Probe removing a collaborator. Requires --yes confirmation.")
  .argument("<user-id>", "User ID to remove")
  .option("--source <source>", "auto, env, or local-profile", "auto")
  .requiredOption("--yes", "Confirm team member removal")
  .action(async (userId: string, options: { source: "auto" | ApiAuthSource; yes: boolean }) => {
    if (!options.yes) {
      console.log(
        JSON.stringify(
          { status: "failed", message: "Add --yes to confirm team member removal." },
          null,
          2,
        ),
      );
      process.exitCode = 1;
      return;
    }
    const userIdNum = Number.parseInt(userId, 10);
    if (!Number.isFinite(userIdNum) || userIdNum < 0) {
      console.log(
        JSON.stringify({ status: "failed", message: `Invalid user ID: ${userId}` }, null, 2),
      );
      process.exitCode = 1;
      return;
    }
    const effective = await loadEffectiveConfig();
    const material = await resolveApiAuthMaterial(effective, options.source);
    const result = await removeTeamMember(material.publicationUrl, userIdNum, material, fetch);
    console.log(JSON.stringify(result, null, 2));
    if (result.status !== "ok") {
      process.exitCode = 1;
    }
  });

apiTeam
  .command("role")
  .description("Probe changing a collaborator role. Requires --yes confirmation.")
  .argument("<user-id>", "User ID to update")
  .requiredOption("--role <role>", "Role: admin, editor, contributor, or reader")
  .option("--source <source>", "auto, env, or local-profile", "auto")
  .requiredOption("--yes", "Confirm team role update")
  .action(
    async (
      userId: string,
      options: { role: string; source: "auto" | ApiAuthSource; yes: boolean },
    ) => {
      if (!options.yes) {
        console.log(
          JSON.stringify(
            { status: "failed", message: "Add --yes to confirm team role update." },
            null,
            2,
          ),
        );
        process.exitCode = 1;
        return;
      }
      const userIdNum = Number.parseInt(userId, 10);
      if (!Number.isFinite(userIdNum) || userIdNum < 0) {
        console.log(
          JSON.stringify({ status: "failed", message: `Invalid user ID: ${userId}` }, null, 2),
        );
        process.exitCode = 1;
        return;
      }
      const effective = await loadEffectiveConfig();
      const material = await resolveApiAuthMaterial(effective, options.source);
      const result = await changeTeamMemberRole(
        material.publicationUrl,
        userIdNum,
        options.role,
        material,
        fetch,
      );
      console.log(JSON.stringify(result, null, 2));
      if (result.status !== "ok") {
        process.exitCode = 1;
      }
    },
  );

const apiProfile = api.command("profile").description("Read own or public Substack profiles.");

apiProfile
  .command("me")
  .description("Show own profile information.")
  .option("--source <source>", "auto, env, or local-profile", "auto")
  .action(async (options: { source: "auto" | ApiAuthSource }) => {
    const effective = await loadEffectiveConfig();
    const material = await resolveApiAuthMaterial(effective, options.source);
    const result = await readOwnProfile(material, fetch);
    console.log(JSON.stringify(result, null, 2));
    if (result.status !== "ok") {
      process.exitCode = 1;
    }
  });

apiProfile
  .command("show")
  .description("Show public profile by handle.")
  .argument("<handle>", "User handle or slug")
  .option("--source <source>", "auto, env, or local-profile", "auto")
  .action(async (handle: string, options: { source: "auto" | ApiAuthSource }) => {
    const effective = await loadEffectiveConfig();
    const material = await resolveApiAuthMaterial(effective, options.source);
    const result = await readPublicProfile(material, handle, fetch);
    console.log(JSON.stringify(result, null, 2));
    if (result.status !== "ok") {
      process.exitCode = 1;
    }
  });

const apiFollowing = api
  .command("following")
  .description("Show users that the authenticated user follows.");

apiFollowing
  .command("list")
  .description("List followed users.")
  .option("--source <source>", "auto, env, or local-profile", "auto")
  .option("--limit <limit>", "Maximum number of users to list", parseInteger, 10)
  .action(async (options: { source: "auto" | ApiAuthSource; limit: number }) => {
    const effective = await loadEffectiveConfig();
    const material = await resolveApiAuthMaterial(effective, options.source);
    const client = createSubstackClient(material);
    const profile = await client.ownProfile();
    const users: Array<{ id: string; name: string; handle: string }> = [];
    let count = 0;
    for await (const user of profile.following({ limit: options.limit })) {
      users.push({ id: String(user.id), name: user.name, handle: user.handle });
      count++;
    }
    console.log(
      JSON.stringify(
        { status: "ok", users, count, message: `Found ${count} followed users.` },
        null,
        2,
      ),
    );
  });

const apiSubscriber = api
  .command("subscriber")
  .description("Subscriber management - list, export, import, segments, suppression, and gifts.");

apiSubscriber
  .command("count")
  .description("Show subscriber count from the publication checklist.")
  .option("--source <source>", "auto, env, or local-profile", "auto")
  .action(async (options: { source: "auto" | ApiAuthSource }) => {
    const effective = await loadEffectiveConfig();
    const material = await resolveApiAuthMaterial(effective, options.source);
    try {
      const count = await getSubscriberCount(material.publicationUrl, material, fetch);
      console.log(
        JSON.stringify(
          { status: "ok", count, message: `Publication has ${count} subscribers.` },
          null,
          2,
        ),
      );
    } catch (err) {
      console.error(
        JSON.stringify(
          { status: "failed", message: err instanceof Error ? err.message : String(err) },
          null,
          2,
        ),
      );
      process.exitCode = 1;
    }
  });

apiSubscriber
  .command("list")
  .description("List subscribers for the publication with optional filtering.")
  .option("--source <source>", "auto, env, or local-profile", "auto")
  .option("--limit <limit>", "Maximum number of subscribers to return", parseInteger, 100)
  .option("--offset <offset>", "Offset for pagination", parseInteger, 0)
  .option("--status <status>", "Filter by status (active, inactive, unpaid)")
  .option("--tier <tier>", "Filter by tier (free, paid)")
  .option("--date-from <date>", "Filter by subscription date from (ISO date or YYYY-MM-DD)")
  .option("--date-to <date>", "Filter by subscription date to (ISO date or YYYY-MM-DD)")
  .option("--source-filter <source>", "Filter by source (substack, import, manual)")
  .action(
    async (options: {
      source: "auto" | ApiAuthSource;
      limit: number;
      offset: number;
      status?: string;
      tier?: string;
      dateFrom?: string;
      dateTo?: string;
      sourceFilter?: string;
    }) => {
      const effective = await loadEffectiveConfig();
      const material = await resolveApiAuthMaterial(effective, options.source);
      const result = await fetchSubscriberList(material.publicationUrl, material, fetch, {
        limit: options.limit,
        offset: options.offset,
        status: options.status,
        tier: options.tier,
        dateFrom: options.dateFrom,
        dateTo: options.dateTo,
        source: options.sourceFilter,
      });
      console.log(JSON.stringify(result, null, 2));
      if (result.status !== "ok") {
        process.exitCode = 1;
      }
    },
  );

apiSubscriber
  .command("export")
  .description("Export subscribers as CSV (probe: likely dashboard-only).")
  .option("--source <source>", "auto, env, or local-profile", "auto")
  .option("--format <format>", "Export format (csv)", "csv")
  .option("--status <status>", "Filter by status (active, inactive, unpaid)")
  .option("--tier <tier>", "Filter by tier (free, paid)")
  .action(
    async (options: {
      source: "auto" | ApiAuthSource;
      format: string;
      status?: string;
      tier?: string;
    }) => {
      const effective = await loadEffectiveConfig();
      const material = await resolveApiAuthMaterial(effective, options.source);
      const result = await fetchSubscriberExport(material.publicationUrl, material, fetch, {
        format: options.format,
        status: options.status,
        tier: options.tier,
      });
      console.log(JSON.stringify(result, null, 2));
      if (result.status !== "ok") {
        process.exitCode = 1;
      }
    },
  );

apiSubscriber
  .command("import")
  .description("Import subscribers from CSV data (probe: likely dashboard-only).")
  .argument("<csv-data>", "CSV data string or path to CSV file")
  .requiredOption("--yes", "Confirm import")
  .option("--source <source>", "auto, env, or local-profile", "auto")
  .action(async (csvData: string, options: { yes: boolean; source: "auto" | ApiAuthSource }) => {
    if (!options.yes) {
      console.log(
        JSON.stringify(
          {
            status: "failed",
            message: "Add --yes to confirm subscriber import.",
          },
          null,
          2,
        ),
      );
      process.exitCode = 1;
      return;
    }
    const effective = await loadEffectiveConfig();
    const material = await resolveApiAuthMaterial(effective, options.source);
    const csvInput = existsSync(csvData) ? readFileSync(csvData, "utf8") : csvData;
    const result = await importSubscribers(material.publicationUrl, csvInput, material, fetch);
    console.log(JSON.stringify(result, null, 2));
    if (result.status !== "ok") {
      process.exitCode = 1;
    }
  });

const apiSubscriberSegment = apiSubscriber
  .command("segment")
  .description("Manage subscriber segments/groups.");

apiSubscriberSegment
  .command("list")
  .description("List subscriber segments/groups (probe: likely dashboard-only).")
  .option("--source <source>", "auto, env, or local-profile", "auto")
  .action(async (options: { source: "auto" | ApiAuthSource }) => {
    const effective = await loadEffectiveConfig();
    const material = await resolveApiAuthMaterial(effective, options.source);
    const result = await fetchSubscriberSegments(material.publicationUrl, material, fetch);
    console.log(JSON.stringify(result, null, 2));
    if (result.status !== "ok") {
      process.exitCode = 1;
    }
  });

apiSubscriber
  .command("suppress")
  .description("Add an email to the suppression list (probe: likely dashboard-only).")
  .argument("<email>", "Email address to suppress")
  .requiredOption("--yes", "Confirm suppression")
  .option("--source <source>", "auto, env, or local-profile", "auto")
  .action(async (email: string, options: { yes: boolean; source: "auto" | ApiAuthSource }) => {
    if (!options.yes) {
      console.log(
        JSON.stringify(
          {
            status: "failed",
            message: "Add --yes to confirm email suppression.",
          },
          null,
          2,
        ),
      );
      process.exitCode = 1;
      return;
    }
    const effective = await loadEffectiveConfig();
    const material = await resolveApiAuthMaterial(effective, options.source);
    const result = await suppressEmail(material.publicationUrl, email, material, fetch);
    console.log(JSON.stringify(result, null, 2));
    if (result.status !== "ok") {
      process.exitCode = 1;
    }
  });

const apiSubscriberSuppression = apiSubscriber
  .command("suppression-list")
  .description("List suppression entries (bounces, unsubscribes, complaints).");

apiSubscriberSuppression
  .command("list")
  .description("List suppression entries (probe: likely dashboard-only).")
  .option("--source <source>", "auto, env, or local-profile", "auto")
  .action(async (options: { source: "auto" | ApiAuthSource }) => {
    const effective = await loadEffectiveConfig();
    const material = await resolveApiAuthMaterial(effective, options.source);
    const result = await fetchSuppressionList(material.publicationUrl, material, fetch);
    console.log(JSON.stringify(result, null, 2));
    if (result.status !== "ok") {
      process.exitCode = 1;
    }
  });

const apiSubscriberGift = apiSubscriber.command("gift").description("Manage gift subscriptions.");

apiSubscriberGift
  .command("list")
  .description("List gift subscriptions (probe: likely dashboard-only).")
  .option("--source <source>", "auto, env, or local-profile", "auto")
  .action(async (options: { source: "auto" | ApiAuthSource }) => {
    const effective = await loadEffectiveConfig();
    const material = await resolveApiAuthMaterial(effective, options.source);
    const result = await fetchGiftSubscriptions(material.publicationUrl, material, fetch);
    console.log(JSON.stringify(result, null, 2));
    if (result.status !== "ok") {
      process.exitCode = 1;
    }
  });

const apiNotes = api.command("notes").description("Manage notes through the Substack API.");

apiNotes
  .command("list")
  .description("List recent notes from your profile.")
  .option("--source <source>", "auto, env, or local-profile", "auto")
  .option("--limit <limit>", "Maximum number of notes to list", parseInteger, 10)
  .action(async (options: { source: "auto" | ApiAuthSource; limit: number }) => {
    const effective = await loadEffectiveConfig();
    const material = await resolveApiAuthMaterial(effective, options.source);
    const notes = await listNotes(material, options.limit);
    console.log(
      JSON.stringify(
        { status: "ok", notes, count: notes.length, message: `Found ${notes.length} notes.` },
        null,
        2,
      ),
    );
  });

apiNotes
  .command("get")
  .description("Get full details for a specific note by ID.")
  .argument("<id>", "Note ID")
  .option("--source <source>", "auto, env, or local-profile", "auto")
  .action(async (id: string, options: { source: "auto" | ApiAuthSource }) => {
    const effective = await loadEffectiveConfig();
    const material = await resolveApiAuthMaterial(effective, options.source);
    const noteId = Number.parseInt(id, 10);
    if (!Number.isFinite(noteId) || noteId < 0) {
      console.error(`Invalid note ID: ${id}`);
      process.exitCode = 1;
      return;
    }
    const result = await getNote(material, noteId);
    console.log(JSON.stringify({ status: "ok", note: result }, null, 2));
  });

apiNotes
  .command("create")
  .description("Publish a note immediately. Requires --yes confirmation.")
  .requiredOption("--body <text>", "Note body text")
  .requiredOption("--yes", "Confirm note publication")
  .option("--source <source>", "auto, env, or local-profile", "auto")
  .action(async (options: { body: string; yes: boolean; source: "auto" | ApiAuthSource }) => {
    if (!options.yes) {
      console.log(
        JSON.stringify(
          { status: "failed", message: "Add --yes to confirm note publication." },
          null,
          2,
        ),
      );
      process.exitCode = 1;
      return;
    }

    const effective = await loadEffectiveConfig();
    const material = await resolveApiAuthMaterial(effective, options.source);
    const result = await createNote(material, options.body);
    console.log(
      JSON.stringify(
        {
          status: "ok",
          id: result.id,
          publishedAt: result.publishedAt,
          message: `Note published (ID: ${result.id}).`,
        },
        null,
        2,
      ),
    );
  });

apiNotes
  .command("delete")
  .description("Delete a note by ID. Requires --yes confirmation.")
  .argument("<id>", "Note ID to delete")
  .requiredOption("--yes", "Confirm note deletion")
  .option("--source <source>", "auto, env, or local-profile", "auto")
  .action(async (id: string, options: { yes: boolean; source: "auto" | ApiAuthSource }) => {
    if (!options.yes) {
      console.log(
        JSON.stringify(
          { status: "failed", message: "Add --yes to confirm note deletion." },
          null,
          2,
        ),
      );
      process.exitCode = 1;
      return;
    }

    const effective = await loadEffectiveConfig();
    const material = await resolveApiAuthMaterial(effective, options.source);
    const noteId = Number.parseInt(id, 10);
    if (!Number.isFinite(noteId) || noteId < 0) {
      console.error(`Invalid note ID: ${id}`);
      process.exitCode = 1;
      return;
    }

    const result = await deleteNote(material, noteId, fetch);
    const ok = result.status >= 200 && result.status < 300;
    console.log(
      JSON.stringify(
        {
          status: ok ? "ok" : "failed",
          noteId,
          httpStatus: result.status,
          message: ok
            ? `Note ${id} deleted.`
            : `Failed to delete note ${id} (HTTP ${result.status}).`,
        },
        null,
        2,
      ),
    );
    if (!ok) process.exitCode = 1;
  });

apiNotes
  .command("like")
  .description("Like a note by ID. Requires --yes confirmation.")
  .argument("<id>", "Note ID to like")
  .requiredOption("--yes", "Confirm note like")
  .option("--source <source>", "auto, env, or local-profile", "auto")
  .action(async (id: string, options: { yes: boolean; source: "auto" | ApiAuthSource }) => {
    if (!options.yes) {
      console.log(
        JSON.stringify({ status: "failed", message: "Add --yes to confirm note like." }, null, 2),
      );
      process.exitCode = 1;
      return;
    }

    const effective = await loadEffectiveConfig();
    const material = await resolveApiAuthMaterial(effective, options.source);
    const noteId = Number.parseInt(id, 10);
    if (!Number.isFinite(noteId) || noteId < 0) {
      console.error(`Invalid note ID: ${id}`);
      process.exitCode = 1;
      return;
    }

    try {
      await likeNote(material, noteId);
      console.log(JSON.stringify({ status: "ok", noteId, message: `Note ${id} liked.` }, null, 2));
    } catch (err) {
      console.error(
        JSON.stringify(
          { status: "failed", message: err instanceof Error ? err.message : String(err) },
          null,
          2,
        ),
      );
      process.exitCode = 1;
    }
  });

apiNotes
  .command("reshare")
  .description("Reshare a note by ID. Requires --yes confirmation.")
  .argument("<id>", "Note ID to reshare")
  .requiredOption("--yes", "Confirm note reshare")
  .option("--source <source>", "auto, env, or local-profile", "auto")
  .action(async (id: string, options: { yes: boolean; source: "auto" | ApiAuthSource }) => {
    if (!options.yes) {
      console.log(
        JSON.stringify(
          { status: "failed", message: "Add --yes to confirm note reshare." },
          null,
          2,
        ),
      );
      process.exitCode = 1;
      return;
    }

    const effective = await loadEffectiveConfig();
    const material = await resolveApiAuthMaterial(effective, options.source);
    const noteId = Number.parseInt(id, 10);
    if (!Number.isFinite(noteId) || noteId < 0) {
      console.error(`Invalid note ID: ${id}`);
      process.exitCode = 1;
      return;
    }

    const result = await reshareNote(material, noteId, fetch);
    const ok = result.status >= 200 && result.status < 300;
    console.log(
      JSON.stringify(
        {
          status: ok ? "ok" : "failed",
          noteId,
          httpStatus: result.status,
          message: ok
            ? `Note ${id} reshared.`
            : `Failed to reshare note ${id} (HTTP ${result.status}).`,
        },
        null,
        2,
      ),
    );
    if (!ok) process.exitCode = 1;
  });

apiNotes
  .command("reply")
  .description("Reply to a note by ID. Requires --yes confirmation.")
  .argument("<id>", "Note ID to reply to")
  .argument("<text>", "Reply body text")
  .requiredOption("--yes", "Confirm note reply")
  .option("--source <source>", "auto, env, or local-profile", "auto")
  .action(
    async (id: string, text: string, options: { yes: boolean; source: "auto" | ApiAuthSource }) => {
      if (!options.yes) {
        console.log(
          JSON.stringify(
            { status: "failed", message: "Add --yes to confirm note reply." },
            null,
            2,
          ),
        );
        process.exitCode = 1;
        return;
      }

      const effective = await loadEffectiveConfig();
      const material = await resolveApiAuthMaterial(effective, options.source);
      const noteId = Number.parseInt(id, 10);
      if (!Number.isFinite(noteId) || noteId < 0) {
        console.error(`Invalid note ID: ${id}`);
        process.exitCode = 1;
        return;
      }

      const result = await replyToNote(material, noteId, text, fetch);
      const ok = result.status >= 200 && result.status < 300;
      console.log(
        JSON.stringify(
          {
            status: ok ? "ok" : "failed",
            noteId,
            httpStatus: result.status,
            message: ok
              ? `Reply posted to note ${id}.`
              : `Failed to reply to note ${id} (HTTP ${result.status}).`,
          },
          null,
          2,
        ),
      );
      if (!ok) process.exitCode = 1;
    },
  );

const apiRecommendation = api
  .command("recommendation")
  .description("Manage publication recommendations.");

apiRecommendation
  .command("list")
  .description("List recommended and recommending publications.")
  .option("--source <source>", "auto, env, or local-profile", "auto")
  .action(async (options: { source: "auto" | ApiAuthSource }) => {
    const effective = await loadEffectiveConfig();
    const material = await resolveApiAuthMaterial(effective, options.source);
    const result = await fetchRecommendationList(material.publicationUrl, material, fetch);
    console.log(JSON.stringify(result, null, 2));
    if (result.status !== "ok") {
      process.exitCode = 1;
    }
  });

apiRecommendation
  .command("status")
  .description("Check recommendation status for a publication.")
  .argument("<publication-url>", "Publication URL to check")
  .option("--source <source>", "auto, env, or local-profile", "auto")
  .action(async (publicationUrl: string, options: { source: "auto" | ApiAuthSource }) => {
    const effective = await loadEffectiveConfig();
    const material = await resolveApiAuthMaterial(effective, options.source);
    const result = await fetchRecommendationStatus(
      material.publicationUrl,
      publicationUrl,
      material,
      fetch,
    );
    console.log(JSON.stringify(result, null, 2));
    if (result.status !== "ok") {
      process.exitCode = 1;
    }
  });

apiRecommendation
  .command("add")
  .description("Recommend another publication. Requires --yes confirmation.")
  .argument("<publication-url>", "Publication URL to recommend")
  .requiredOption("--yes", "Confirm recommendation")
  .option("--source <source>", "auto, env, or local-profile", "auto")
  .action(
    async (publicationUrl: string, options: { yes: boolean; source: "auto" | ApiAuthSource }) => {
      if (!options.yes) {
        console.log(
          JSON.stringify(
            { status: "failed", message: "Add --yes to confirm recommendation." },
            null,
            2,
          ),
        );
        process.exitCode = 1;
        return;
      }
      const effective = await loadEffectiveConfig();
      const material = await resolveApiAuthMaterial(effective, options.source);
      const result = await addRecommendation(
        material.publicationUrl,
        publicationUrl,
        material,
        fetch,
      );
      console.log(JSON.stringify(result, null, 2));
      if (result.status !== "ok") {
        process.exitCode = 1;
      }
    },
  );

apiRecommendation
  .command("remove")
  .description("Remove a recommendation for a publication. Requires --yes confirmation.")
  .argument("<publication-url>", "Publication URL to stop recommending")
  .requiredOption("--yes", "Confirm recommendation removal")
  .option("--source <source>", "auto, env, or local-profile", "auto")
  .action(
    async (publicationUrl: string, options: { yes: boolean; source: "auto" | ApiAuthSource }) => {
      if (!options.yes) {
        console.log(
          JSON.stringify(
            { status: "failed", message: "Add --yes to confirm recommendation removal." },
            null,
            2,
          ),
        );
        process.exitCode = 1;
        return;
      }
      const effective = await loadEffectiveConfig();
      const material = await resolveApiAuthMaterial(effective, options.source);
      const result = await removeRecommendation(
        material.publicationUrl,
        publicationUrl,
        material,
        fetch,
      );
      console.log(JSON.stringify(result, null, 2));
      if (result.status !== "ok") {
        process.exitCode = 1;
      }
    },
  );

const apiComment = api.command("comment").description("Manage and moderate comments on posts.");

apiComment
  .command("list")
  .description("List comments for a post.")
  .argument("<post-id>", "Post ID to fetch comments for")
  .option("--source <source>", "auto, env, or local-profile", "auto")
  .option("--limit <limit>", "Maximum number of comments to return", parseInteger, 50)
  .option("--status <status>", "Filter by status (e.g. held, approved)")
  .action(
    async (
      postId: string,
      options: {
        source: "auto" | ApiAuthSource;
        limit: number;
        status?: string;
      },
    ) => {
      const effective = await loadEffectiveConfig();
      const material = await resolveApiAuthMaterial(effective, options.source);
      const postIdNum = Number.parseInt(postId, 10);
      if (!Number.isFinite(postIdNum) || postIdNum < 0) {
        console.log(
          JSON.stringify({ status: "failed", message: `Invalid post ID: ${postId}` }, null, 2),
        );
        process.exitCode = 1;
        return;
      }
      const result = await fetchCommentsForPost(
        material.publicationUrl,
        postIdNum,
        material,
        fetch,
        { limit: options.limit, status: options.status },
      );
      console.log(JSON.stringify(result, null, 2));
      if (result.status !== "ok") process.exitCode = 1;
    },
  );

apiComment
  .command("get")
  .description("Get a single comment by ID.")
  .argument("<comment-id>", "Comment ID")
  .option("--source <source>", "auto, env, or local-profile", "auto")
  .action(async (commentId: string, options: { source: "auto" | ApiAuthSource }) => {
    const effective = await loadEffectiveConfig();
    const material = await resolveApiAuthMaterial(effective, options.source);
    const commentIdNum = Number.parseInt(commentId, 10);
    if (!Number.isFinite(commentIdNum) || commentIdNum < 0) {
      console.log(
        JSON.stringify({ status: "failed", message: `Invalid comment ID: ${commentId}` }, null, 2),
      );
      process.exitCode = 1;
      return;
    }
    try {
      const result = await getCommentById(material, commentIdNum);
      console.log(JSON.stringify({ status: "ok", comment: result }, null, 2));
    } catch (err) {
      console.log(
        JSON.stringify(
          { status: "failed", message: err instanceof Error ? err.message : String(err) },
          null,
          2,
        ),
      );
      process.exitCode = 1;
    }
  });

apiComment
  .command("approve")
  .description("Approve a held comment. Requires --yes confirmation.")
  .argument("<comment-id>", "Comment ID to approve")
  .option("--source <source>", "auto, env, or local-profile", "auto")
  .requiredOption("--yes", "Confirm moderation action")
  .action(async (commentId: string, options: { source: "auto" | ApiAuthSource; yes: boolean }) => {
    if (!options.yes) {
      console.log(
        JSON.stringify(
          { status: "failed", message: "Add --yes to confirm comment approval." },
          null,
          2,
        ),
      );
      process.exitCode = 1;
      return;
    }
    const effective = await loadEffectiveConfig();
    const material = await resolveApiAuthMaterial(effective, options.source);
    const commentIdNum = Number.parseInt(commentId, 10);
    if (!Number.isFinite(commentIdNum) || commentIdNum < 0) {
      console.log(
        JSON.stringify({ status: "failed", message: `Invalid comment ID: ${commentId}` }, null, 2),
      );
      process.exitCode = 1;
      return;
    }
    const result = await moderateComment(
      material.publicationUrl,
      commentIdNum,
      "approve",
      material,
      fetch,
    );
    console.log(JSON.stringify(result, null, 2));
    if (result.status !== "ok") process.exitCode = 1;
  });

apiComment
  .command("delete")
  .description("Delete a comment. Requires --yes confirmation.")
  .argument("<comment-id>", "Comment ID to delete")
  .option("--source <source>", "auto, env, or local-profile", "auto")
  .requiredOption("--yes", "Confirm moderation action")
  .action(async (commentId: string, options: { source: "auto" | ApiAuthSource; yes: boolean }) => {
    if (!options.yes) {
      console.log(
        JSON.stringify(
          { status: "failed", message: "Add --yes to confirm comment deletion." },
          null,
          2,
        ),
      );
      process.exitCode = 1;
      return;
    }
    const effective = await loadEffectiveConfig();
    const material = await resolveApiAuthMaterial(effective, options.source);
    const commentIdNum = Number.parseInt(commentId, 10);
    if (!Number.isFinite(commentIdNum) || commentIdNum < 0) {
      console.log(
        JSON.stringify({ status: "failed", message: `Invalid comment ID: ${commentId}` }, null, 2),
      );
      process.exitCode = 1;
      return;
    }
    const result = await moderateComment(
      material.publicationUrl,
      commentIdNum,
      "delete",
      material,
      fetch,
    );
    console.log(JSON.stringify(result, null, 2));
    if (result.status !== "ok") process.exitCode = 1;
  });

apiComment
  .command("pin")
  .description("Pin a comment. Requires --yes confirmation.")
  .argument("<comment-id>", "Comment ID to pin")
  .option("--source <source>", "auto, env, or local-profile", "auto")
  .requiredOption("--yes", "Confirm moderation action")
  .action(async (commentId: string, options: { source: "auto" | ApiAuthSource; yes: boolean }) => {
    if (!options.yes) {
      console.log(
        JSON.stringify(
          { status: "failed", message: "Add --yes to confirm pinning comment." },
          null,
          2,
        ),
      );
      process.exitCode = 1;
      return;
    }
    const effective = await loadEffectiveConfig();
    const material = await resolveApiAuthMaterial(effective, options.source);
    const commentIdNum = Number.parseInt(commentId, 10);
    if (!Number.isFinite(commentIdNum) || commentIdNum < 0) {
      console.log(
        JSON.stringify({ status: "failed", message: `Invalid comment ID: ${commentId}` }, null, 2),
      );
      process.exitCode = 1;
      return;
    }
    const result = await moderateComment(
      material.publicationUrl,
      commentIdNum,
      "pin",
      material,
      fetch,
    );
    console.log(JSON.stringify(result, null, 2));
    if (result.status !== "ok") process.exitCode = 1;
  });

apiComment
  .command("reply")
  .description("Reply to a comment as the publication. Requires --yes confirmation.")
  .argument("<comment-id>", "Comment ID to reply to")
  .argument("<text>", "Reply body text")
  .option("--source <source>", "auto, env, or local-profile", "auto")
  .requiredOption("--yes", "Confirm reply")
  .action(
    async (
      commentId: string,
      text: string,
      options: { source: "auto" | ApiAuthSource; yes: boolean },
    ) => {
      if (!options.yes) {
        console.log(
          JSON.stringify({ status: "failed", message: "Add --yes to confirm reply." }, null, 2),
        );
        process.exitCode = 1;
        return;
      }
      const effective = await loadEffectiveConfig();
      const material = await resolveApiAuthMaterial(effective, options.source);
      const commentIdNum = Number.parseInt(commentId, 10);
      if (!Number.isFinite(commentIdNum) || commentIdNum < 0) {
        console.log(
          JSON.stringify(
            { status: "failed", message: `Invalid comment ID: ${commentId}` },
            null,
            2,
          ),
        );
        process.exitCode = 1;
        return;
      }
      const result = await replyToComment(
        material.publicationUrl,
        commentIdNum,
        text,
        material,
        fetch,
      );
      console.log(JSON.stringify(result, null, 2));
      if (result.status !== "ok") process.exitCode = 1;
    },
  );

apiComment
  .command("settings")
  .description("Show or update comment settings for a post.")
  .argument("<post-id>", "Post ID")
  .option("--source <source>", "auto, env, or local-profile", "auto")
  .option("--require-paid", "Require paid subscribers to comment", false)
  .option("--require-subscriber", "Require subscribers to comment", false)
  .option("--hold-for-review", "Hold comments for moderation review", false)
  .option("--disable", "Disable commenting", false)
  .option("--auto-approve-repeated", "Auto-approve repeated commenters", false)
  .option("--yes", "Confirm settings update", false)
  .action(
    async (
      postId: string,
      options: {
        source: "auto" | ApiAuthSource;
        requirePaid: boolean;
        requireSubscriber: boolean;
        holdForReview: boolean;
        disable: boolean;
        autoApproveRepeated: boolean;
        yes: boolean;
      },
    ) => {
      const effective = await loadEffectiveConfig();
      const material = await resolveApiAuthMaterial(effective, options.source);
      const postIdNum = Number.parseInt(postId, 10);
      if (!Number.isFinite(postIdNum) || postIdNum < 0) {
        console.log(
          JSON.stringify({ status: "failed", message: `Invalid post ID: ${postId}` }, null, 2),
        );
        process.exitCode = 1;
        return;
      }
      const updates = {
        ...(options.requirePaid ? { mustBePaidSubscriber: true } : {}),
        ...(options.requireSubscriber ? { mustBeSubscriber: true } : {}),
        ...(options.holdForReview ? { holdForReview: true } : {}),
        ...(options.disable ? { commentingEnabled: false } : {}),
        ...(options.autoApproveRepeated ? { autoApproveRepeatedCommenters: true } : {}),
      };
      const isWrite = Object.keys(updates).length > 0;
      if (isWrite && !options.yes) {
        console.log(
          JSON.stringify(
            { status: "failed", message: "Add --yes to confirm comment settings update." },
            null,
            2,
          ),
        );
        process.exitCode = 1;
        return;
      }
      const result = isWrite
        ? await updateCommentSettings(material.publicationUrl, postIdNum, updates, material, fetch)
        : await fetchCommentSettings(material.publicationUrl, postIdNum, material, fetch);
      console.log(JSON.stringify(result, null, 2));
      if (result.status !== "ok") process.exitCode = 1;
    },
  );

const apiAnalytics = api
  .command("analytics")
  .description("Read-only analytics and reporting probes.");

apiAnalytics
  .command("inventory")
  .description("Probe all analytics endpoints and report availability.")
  .option("--source <source>", "auto, env, or local-profile", "auto")
  .option("--post-id <id>", "Post ID for post-level analytics", parseInteger)
  .action(async (options: { source: "auto" | ApiAuthSource; postId?: number }) => {
    const effective = await loadEffectiveConfig();
    const material = await resolveApiAuthMaterial(effective, options.source);
    const result = await fetchAnalyticsInventory(
      material.publicationUrl,
      material,
      fetch,
      options.postId,
    );
    console.log(JSON.stringify(result, null, 2));
    if (result.status !== "ok") {
      process.exitCode = 1;
    }
  });

apiAnalytics
  .command("post")
  .description("Fetch analytics for a specific post.")
  .argument("<post-id>", "Post ID to fetch analytics for")
  .option("--source <source>", "auto, env, or local-profile", "auto")
  .option("--format <format>", "Output format: json, csv, or table", "json")
  .action(
    async (postId: string, options: { source: "auto" | ApiAuthSource; format: OutputFormat }) => {
      const effective = await loadEffectiveConfig();
      const material = await resolveApiAuthMaterial(effective, options.source);
      const result = await fetchPostAnalytics(
        material.publicationUrl,
        Number(postId),
        material,
        fetch,
      );
      console.log(formatPostAnalytics(result, { format: options.format }));
      if (result.status !== "ok") {
        process.exitCode = 1;
      }
    },
  );

apiAnalytics
  .command("subscribers")
  .description("Fetch subscriber growth analytics.")
  .option("--source <source>", "auto, env, or local-profile", "auto")
  .option("--period <period>", "Time period for growth data (daily, weekly, monthly)", "daily")
  .option("--format <format>", "Output format: json, csv, or table", "json")
  .action(
    async (options: { source: "auto" | ApiAuthSource; period: string; format: OutputFormat }) => {
      const effective = await loadEffectiveConfig();
      const material = await resolveApiAuthMaterial(effective, options.source);
      const result = await fetchSubscriberGrowth(material.publicationUrl, material, fetch, {
        period: options.period,
      });
      console.log(formatSubscriberGrowth(result, { format: options.format }));
      if (result.status !== "ok") {
        process.exitCode = 1;
      }
    },
  );

apiAnalytics
  .command("email")
  .description("Fetch email performance analytics.")
  .option("--source <source>", "auto, env, or local-profile", "auto")
  .option("--limit <limit>", "Maximum number of emails to return", parseInteger, 10)
  .option("--format <format>", "Output format: json, csv, or table", "json")
  .action(
    async (options: { source: "auto" | ApiAuthSource; limit: number; format: OutputFormat }) => {
      const effective = await loadEffectiveConfig();
      const material = await resolveApiAuthMaterial(effective, options.source);
      const result = await fetchEmailPerformance(
        material.publicationUrl,
        material,
        fetch,
        options.limit,
      );
      console.log(formatEmailPerformance(result, { format: options.format }));
      if (result.status !== "ok") {
        process.exitCode = 1;
      }
    },
  );

const apiCommenter = api.command("commenter").description("Manage commenters (mute, ban).");

apiCommenter
  .command("mute")
  .description("Mute a commenter by user ID. Requires --yes confirmation.")
  .argument("<user-id>", "User ID to mute")
  .option("--source <source>", "auto, env, or local-profile", "auto")
  .requiredOption("--yes", "Confirm mute action")
  .action(async (userId: string, options: { source: "auto" | ApiAuthSource; yes: boolean }) => {
    if (!options.yes) {
      console.log(
        JSON.stringify({ status: "failed", message: "Add --yes to confirm mute." }, null, 2),
      );
      process.exitCode = 1;
      return;
    }
    const effective = await loadEffectiveConfig();
    const material = await resolveApiAuthMaterial(effective, options.source);
    const userIdNum = Number.parseInt(userId, 10);
    if (!Number.isFinite(userIdNum) || userIdNum < 0) {
      console.log(
        JSON.stringify({ status: "failed", message: `Invalid user ID: ${userId}` }, null, 2),
      );
      process.exitCode = 1;
      return;
    }
    const result = await muteCommenter(material.publicationUrl, userIdNum, material, fetch);
    console.log(JSON.stringify(result, null, 2));
    if (result.status !== "ok") process.exitCode = 1;
  });

apiCommenter
  .command("ban")
  .description("Ban a commenter by user ID. Requires --yes confirmation.")
  .argument("<user-id>", "User ID to ban")
  .option("--source <source>", "auto, env, or local-profile", "auto")
  .requiredOption("--yes", "Confirm ban action")
  .action(async (userId: string, options: { source: "auto" | ApiAuthSource; yes: boolean }) => {
    if (!options.yes) {
      console.log(
        JSON.stringify({ status: "failed", message: "Add --yes to confirm ban." }, null, 2),
      );
      process.exitCode = 1;
      return;
    }
    const effective = await loadEffectiveConfig();
    const material = await resolveApiAuthMaterial(effective, options.source);
    const userIdNum = Number.parseInt(userId, 10);
    if (!Number.isFinite(userIdNum) || userIdNum < 0) {
      console.log(
        JSON.stringify({ status: "failed", message: `Invalid user ID: ${userId}` }, null, 2),
      );
      process.exitCode = 1;
      return;
    }
    const result = await banCommenter(material.publicationUrl, userIdNum, material, fetch);
    console.log(JSON.stringify(result, null, 2));
    if (result.status !== "ok") process.exitCode = 1;
  });

apiAnalytics
  .command("revenue")
  .description("Fetch revenue analytics.")
  .option("--source <source>", "auto, env, or local-profile", "auto")
  .option("--format <format>", "Output format: json, csv, or table", "json")
  .action(async (options: { source: "auto" | ApiAuthSource; format: OutputFormat }) => {
    const effective = await loadEffectiveConfig();
    const material = await resolveApiAuthMaterial(effective, options.source);
    const result = await fetchRevenueAnalytics(material.publicationUrl, material, fetch);
    console.log(formatRevenueAnalytics(result, { format: options.format }));
    if (result.status !== "ok") {
      process.exitCode = 1;
    }
  });

apiAnalytics
  .command("snapshot")
  .description("Capture an analytics snapshot and append to local snapshot store.")
  .option("--source <source>", "auto, env, or local-profile", "auto")
  .option("--interval <interval>", "daily, weekly, or monthly", "daily")
  .option("--post-id <id>", "Post ID for post-level analytics", parseInteger)
  .action(
    async (options: { source: "auto" | ApiAuthSource; interval: string; postId?: number }) => {
      const effective = await loadEffectiveConfig();
      const material = await resolveApiAuthMaterial(effective, options.source);
      const inventory = await fetchAnalyticsInventory(
        material.publicationUrl,
        material,
        fetch,
        options.postId,
      );

      const snapshot = {
        capturedAt: new Date().toISOString(),
        interval: options.interval,
        postId: options.postId,
        postAnalytics: inventory.postAnalytics ?? null,
        subscriberGrowth: inventory.subscriberGrowth ?? null,
        emailPerformance: inventory.emailPerformance ?? null,
        revenue: inventory.revenue ?? null,
      };

      const snapshotsDir = analyticsSnapshotsDir();
      if (!existsSync(snapshotsDir)) {
        mkdirSync(snapshotsDir, { recursive: true });
      }

      const date = new Date().toISOString().slice(0, 10);
      const file = join(snapshotsDir, `${options.interval}-${date}.jsonl`);
      appendFileSync(file, `${JSON.stringify(snapshot)}\n`);

      console.log(
        JSON.stringify(
          {
            status: "ok",
            snapshotFile: file,
            capturedAt: snapshot.capturedAt,
            message: `Analytics snapshot appended to ${file}`,
          },
          null,
          2,
        ),
      );
    },
  );

const apiBilling = api.command("billing").description("Read-only billing and revenue probes.");

apiBilling
  .command("summary")
  .description("Probe all billing endpoints and report availability.")
  .option("--source <source>", "auto, env, or local-profile", "auto")
  .option("--include-pii", "Include unredacted PII if returned by Substack", false)
  .action(async (options: { source: "auto" | ApiAuthSource; includePii: boolean }) => {
    const effective = await loadEffectiveConfig();
    const material = await resolveApiAuthMaterial(effective, options.source);
    const result = await fetchBillingSummary(material.publicationUrl, material, fetch);
    console.log(JSON.stringify(redactBillingPiiDeep(result, options.includePii), null, 2));
    if (result.status !== "ok") {
      process.exitCode = 1;
    }
  });

apiBilling
  .command("tiers")
  .description("List subscription tiers and pricing.")
  .option("--source <source>", "auto, env, or local-profile", "auto")
  .option("--include-pii", "Include unredacted PII if returned by Substack", false)
  .action(async (options: { source: "auto" | ApiAuthSource; includePii: boolean }) => {
    const effective = await loadEffectiveConfig();
    const material = await resolveApiAuthMaterial(effective, options.source);
    const result = await fetchSubscriptionTiers(material.publicationUrl, material, fetch);
    console.log(JSON.stringify(redactBillingPiiDeep(result, options.includePii), null, 2));
    if (result.status !== "ok") {
      process.exitCode = 1;
    }
  });

apiBilling
  .command("payouts")
  .description("Show payout history.")
  .option("--source <source>", "auto, env, or local-profile", "auto")
  .option("--include-pii", "Include unredacted PII if returned by Substack", false)
  .action(async (options: { source: "auto" | ApiAuthSource; includePii: boolean }) => {
    const effective = await loadEffectiveConfig();
    const material = await resolveApiAuthMaterial(effective, options.source);
    const result = await fetchPayoutHistory(material.publicationUrl, material, fetch);
    console.log(JSON.stringify(redactBillingPiiDeep(result, options.includePii), null, 2));
    if (result.status !== "ok") {
      process.exitCode = 1;
    }
  });

apiBilling
  .command("taxes")
  .description("Show tax form status.")
  .option("--source <source>", "auto, env, or local-profile", "auto")
  .option("--include-pii", "Include unredacted PII if returned by Substack", false)
  .action(async (options: { source: "auto" | ApiAuthSource; includePii: boolean }) => {
    const effective = await loadEffectiveConfig();
    const material = await resolveApiAuthMaterial(effective, options.source);
    const result = await fetchTaxFormStatus(material.publicationUrl, material, fetch);
    console.log(JSON.stringify(redactBillingPiiDeep(result, options.includePii), null, 2));
    if (result.status !== "ok") {
      process.exitCode = 1;
    }
  });

apiBilling
  .command("refund")
  .description("Initiate a refund for a subscriber.")
  .argument("<subscriber-id>", "Subscriber ID to refund")
  .option("--source <source>", "auto, env, or local-profile", "auto")
  .option("--amount <amount>", "Refund amount in dollars (optional, parseFloat)", Number.parseFloat)
  .option("--reason <reason>", "Reason for the refund")
  .requiredOption("--yes", "Confirm refund operation")
  .requiredOption("--confirm <operation>", "Additional typed confirmation: must be 'refund'")
  .action(
    async (
      subscriberId: string,
      options: {
        source: "auto" | ApiAuthSource;
        amount?: number;
        reason?: string;
        yes: boolean;
        confirm: string;
      },
    ) => {
      if (!options.yes) {
        console.log(
          JSON.stringify(
            { status: "failed", message: "Add --yes to confirm refund operation." },
            null,
            2,
          ),
        );
        process.exitCode = 1;
        return;
      }

      if (options.confirm !== "refund") {
        console.log(
          JSON.stringify(
            {
              status: "failed",
              message: "Add --confirm refund to confirm the refund operation.",
            },
            null,
            2,
          ),
        );
        process.exitCode = 1;
        return;
      }

      const effective = await loadEffectiveConfig();
      const material = await resolveApiAuthMaterial(effective, options.source);
      const refundOptions: { amount?: number; reason?: string } = {};
      if (options.amount !== undefined) {
        refundOptions.amount = options.amount;
      }
      if (options.reason !== undefined) {
        refundOptions.reason = options.reason;
      }
      const result = await initiateRefund(
        material.publicationUrl,
        material,
        fetch,
        subscriberId,
        refundOptions,
      );
      console.log(JSON.stringify(result, null, 2));
      if (result.status !== "ok") {
        process.exitCode = 1;
      }
    },
  );

apiBilling
  .command("promote")
  .description("List or manage boosted post promotions.")
  .option("--source <source>", "auto, env, or local-profile", "auto")
  .option("--include-pii", "Include unredacted PII if returned by Substack", false)
  .action(async (options: { source: "auto" | ApiAuthSource; includePii: boolean }) => {
    const effective = await loadEffectiveConfig();
    const material = await resolveApiAuthMaterial(effective, options.source);
    const result = await fetchBillingPromotions(material.publicationUrl, material, fetch);
    console.log(JSON.stringify(redactBillingPiiDeep(result, options.includePii), null, 2));
    if (result.status !== "ok") {
      process.exitCode = 1;
    }
  });

const apiEmail = api.command("email").description("Email newsletter design and management.");

apiEmail
  .command("template")
  .description("Show current email template settings.")
  .option("--source <source>", "auto, env, or local-profile", "auto")
  .action(async (options: { source: "auto" | ApiAuthSource }) => {
    const effective = await loadEffectiveConfig();
    const material = await resolveApiAuthMaterial(effective, options.source);
    const result = await fetchEmailTemplate(material.publicationUrl, material, fetch);
    console.log(JSON.stringify(result, null, 2));
    if (result.status !== "ok") {
      process.exitCode = 1;
    }
  });

apiEmail
  .command("set-template")
  .description("Update email template settings with confirmation.")
  .option("--source <source>", "auto, env, or local-profile", "auto")
  .option("--header-html <html>", "Email header HTML content")
  .option("--footer-html <html>", "Email footer HTML content")
  .option("--logo-url <url>", "Email logo URL")
  .option("--primary-color <color>", "Email primary color (hex)")
  .option("--background-color <color>", "Email background color (hex)")
  .option("--text-color <color>", "Email text color (hex)")
  .option("--font-family <font>", "Email font family")
  .option("--dry-run", "Preview changes without writing", false)
  .option("--yes", "Confirm update without interactive prompt", false)
  .action(
    async (options: {
      source: "auto" | ApiAuthSource;
      headerHtml?: string;
      footerHtml?: string;
      logoUrl?: string;
      primaryColor?: string;
      backgroundColor?: string;
      textColor?: string;
      fontFamily?: string;
      dryRun: boolean;
      yes: boolean;
    }) => {
      const effective = await loadEffectiveConfig();
      const material = await resolveApiAuthMaterial(effective, options.source);

      const updates: EmailTemplateUpdate = {};
      if (options.headerHtml !== undefined) updates.headerHtml = options.headerHtml;
      if (options.footerHtml !== undefined) updates.footerHtml = options.footerHtml;
      if (options.logoUrl !== undefined) updates.logoUrl = options.logoUrl;
      if (options.primaryColor !== undefined) updates.primaryColor = options.primaryColor;
      if (options.backgroundColor !== undefined) updates.backgroundColor = options.backgroundColor;
      if (options.textColor !== undefined) updates.textColor = options.textColor;
      if (options.fontFamily !== undefined) updates.fontFamily = options.fontFamily;

      const result = await updateEmailTemplate(material.publicationUrl, material, fetch, updates, {
        dryRun: options.dryRun,
        confirm: options.yes,
      });

      console.log(JSON.stringify(result, null, 2));
      if (result.status !== "ok") {
        process.exitCode = 1;
      }
    },
  );

apiEmail
  .command("broadcast")
  .description("Manage email broadcasts.")
  .addCommand(
    (() => {
      const broadcastList = new Command("list")
        .description("Show broadcast history.")
        .option("--source <source>", "auto, env, or local-profile", "auto")
        .option("--limit <limit>", "Maximum broadcasts to return", parseInteger, 20)
        .action(async (options: { source: "auto" | ApiAuthSource; limit: number }) => {
          const effective = await loadEffectiveConfig();
          const material = await resolveApiAuthMaterial(effective, options.source);
          const result = await fetchBroadcastHistory(
            material.publicationUrl,
            material,
            fetch,
            options.limit,
          );
          console.log(JSON.stringify(result, null, 2));
          if (result.status !== "ok") {
            process.exitCode = 1;
          }
        });
      return broadcastList;
    })(),
  )
  .addCommand(
    (() => {
      const broadcastCancel = new Command("cancel")
        .description("Cancel a scheduled broadcast.")
        .argument("<broadcast-id>", "Broadcast ID to cancel")
        .requiredOption("--yes", "Confirm cancellation")
        .action(async (broadcastId: string, options: { yes: boolean }) => {
          if (!options.yes) {
            console.log(
              JSON.stringify(
                {
                  status: "failed",
                  message: "Add --yes to confirm broadcast cancellation.",
                },
                null,
                2,
              ),
            );
            process.exitCode = 1;
            return;
          }
          const effective = await loadEffectiveConfig();
          const material = await resolveApiAuthMaterial(effective, "auto");
          const result = await cancelScheduledBroadcast(
            material.publicationUrl,
            broadcastId,
            material,
            fetch,
          );
          console.log(JSON.stringify(result, null, 2));
          if (result.status !== "ok") {
            process.exitCode = 1;
          }
        });
      return broadcastCancel;
    })(),
  );

apiEmail
  .command("send-test")
  .description("Send a test email for a draft.")
  .argument("<draft-id>", "Draft ID to send test for")
  .requiredOption("--yes", "Confirm sending test email")
  .action(async (draftId: string, options: { yes: boolean }) => {
    if (!options.yes) {
      console.log(
        JSON.stringify(
          {
            status: "failed",
            message: "Add --yes to confirm sending test email.",
          },
          null,
          2,
        ),
      );
      process.exitCode = 1;
      return;
    }
    const effective = await loadEffectiveConfig();
    const material = await resolveApiAuthMaterial(effective, "auto");
    const result = await sendTestEmail(material.publicationUrl, Number(draftId), material, fetch);
    console.log(JSON.stringify(result, null, 2));
    if (result.status !== "ok") {
      process.exitCode = 1;
    }
  });

const apiPodcast = api.command("podcast").description("Podcast and video management.");

apiPodcast
  .command("section")
  .description("Show podcast section details.")
  .option("--source <source>", "auto, env, or local-profile", "auto")
  .action(async (options: { source: "auto" | ApiAuthSource }) => {
    const effective = await loadEffectiveConfig();
    const material = await resolveApiAuthMaterial(effective, options.source);
    const result = await fetchPodcastSection(material.publicationUrl, material, fetch);
    console.log(JSON.stringify(result, null, 2));
    if (result.status !== "ok") {
      process.exitCode = 1;
    }
  });

apiPodcast
  .command("episodes")
  .description("List podcast episodes.")
  .option("--source <source>", "auto, env, or local-profile", "auto")
  .option("--limit <limit>", "Maximum episodes to return", parseInteger, 20)
  .action(async (options: { source: "auto" | ApiAuthSource; limit: number }) => {
    const effective = await loadEffectiveConfig();
    const material = await resolveApiAuthMaterial(effective, options.source);
    const result = await fetchPodcastEpisodes(
      material.publicationUrl,
      material,
      fetch,
      options.limit,
    );
    console.log(JSON.stringify(result, null, 2));
    if (result.status !== "ok") {
      process.exitCode = 1;
    }
  });

apiPodcast
  .command("settings")
  .description("Show podcast distribution settings.")
  .option("--source <source>", "auto, env, or local-profile", "auto")
  .action(async (options: { source: "auto" | ApiAuthSource }) => {
    const effective = await loadEffectiveConfig();
    const material = await resolveApiAuthMaterial(effective, options.source);
    const result = await fetchPodcastSettings(material.publicationUrl, material, fetch);
    console.log(JSON.stringify(result, null, 2));
    if (result.status !== "ok") {
      process.exitCode = 1;
    }
  });

apiPodcast
  .command("create")
  .description("Return a blocked native media result until safe captures exist.")
  .argument("<audio-file>", "Audio file path")
  .option("--source <source>", "auto, env, or local-profile", "auto")
  .option("--title <title>", "Episode title")
  .option("--draft-id <id>", "Existing draft ID to attach audio to", parseInteger)
  .requiredOption("--yes", "Acknowledge the blocked native media boundary")
  .action(
    async (
      _audioFile: string,
      options: {
        source: "auto" | ApiAuthSource;
        title?: string;
        draftId?: number;
        yes: boolean;
      },
    ) => {
      if (!options.yes) {
        console.log(
          JSON.stringify(
            {
              status: "failed",
              message: "Add --yes to acknowledge the blocked podcast creation boundary.",
            },
            null,
            2,
          ),
        );
        process.exitCode = 1;
        return;
      }
      printUnsafeWriteBlocked("native-video-live-automation", "api podcast create");
      return;
    },
  );

apiPodcast
  .command("schedule")
  .description("Return a blocked native media scheduling result until safe captures exist.")
  .argument("<draft-id>", "Draft ID to schedule")
  .requiredOption("--at <iso-date>", "ISO timestamp for scheduled publication")
  .requiredOption("--yes", "Acknowledge the blocked native media boundary")
  .action(async (_draftId: string, options: { at: string; yes: boolean }) => {
    if (!options.yes) {
      console.log(
        JSON.stringify(
          {
            status: "failed",
            message: "Add --yes to acknowledge the blocked podcast scheduling boundary.",
          },
          null,
          2,
        ),
      );
      process.exitCode = 1;
      return;
    }
    printUnsafeWriteBlocked("native-video-live-automation", "api podcast schedule");
    return;
  });

const apiVideo = apiPodcast.command("video").description("Video management.");

apiVideo
  .command("upload")
  .description("Return a blocked native video upload result until safe captures exist.")
  .argument("<file>", "Video file path")
  .option("--source <source>", "auto, env, or local-profile", "auto")
  .requiredOption("--yes", "Acknowledge the blocked native video boundary")
  .action(async (_file: string, options: { source: "auto" | ApiAuthSource; yes: boolean }) => {
    if (!options.yes) {
      console.log(
        JSON.stringify(
          {
            status: "failed",
            message: "Add --yes to acknowledge the blocked video upload boundary.",
          },
          null,
          2,
        ),
      );
      process.exitCode = 1;
      return;
    }
    printUnsafeWriteBlocked("native-video-live-automation", "api podcast video upload");
    return;
  });

apiVideo
  .command("settings")
  .description("Show video player settings for a post.")
  .argument("<post-id>", "Post ID to inspect")
  .option("--source <source>", "auto, env, or local-profile", "auto")
  .action(async (postId: string, options: { source: "auto" | ApiAuthSource }) => {
    const effective = await loadEffectiveConfig();
    const material = await resolveApiAuthMaterial(effective, options.source);
    const result = await fetchVideoSettings(
      material.publicationUrl,
      Number(postId),
      material,
      fetch,
    );
    console.log(JSON.stringify(result, null, 2));
    if (result.status !== "ok") {
      process.exitCode = 1;
    }
  });

const apiIntegrations = api
  .command("integrations")
  .description("Cross-posting and integration management.");

apiIntegrations
  .command("list")
  .description("List configured integrations and their status.")
  .option("--source <source>", "auto, env, or local-profile", "auto")
  .action(async (options: { source: "auto" | ApiAuthSource }) => {
    const effective = await loadEffectiveConfig();
    const material = await resolveApiAuthMaterial(effective, options.source);
    const result = await fetchIntegrations(material.publicationUrl, material, fetch);
    console.log(JSON.stringify(result, null, 2));
    if (result.status !== "ok") {
      process.exitCode = 1;
    }
  });

apiIntegrations
  .command("crosspost")
  .description("Return a blocked integration cross-post result until safe captures exist.")
  .argument("<post-id>", "Post ID to cross-post")
  .requiredOption("--platform <platform>", "Target platform (e.g., twitter, bluesky)")
  .requiredOption("--yes", "Acknowledge the blocked integrations boundary")
  .action(async (_postId: string, options: { platform: string; yes: boolean }) => {
    if (!options.yes) {
      console.log(
        JSON.stringify(
          {
            status: "failed",
            message: "Add --yes to acknowledge the blocked cross-post boundary.",
          },
          null,
          2,
        ),
      );
      process.exitCode = 1;
      return;
    }
    printUnsafeWriteBlocked("integrations-import-crosspost-tokens", "api integrations crosspost");
    return;
  });

apiIntegrations
  .command("import")
  .description("Import content from external sources.")
  .addCommand(
    (() => {
      const wpImport = new Command("wordpress")
        .description("Return a blocked WordPress import result until safe captures exist.")
        .argument("<file>", "WordPress export file path")
        .requiredOption("--yes", "Acknowledge the blocked integrations boundary")
        .action(async (_file: string, options: { yes: boolean }) => {
          if (!options.yes) {
            console.log(
              JSON.stringify(
                {
                  status: "failed",
                  message: "Add --yes to acknowledge the blocked WordPress import boundary.",
                },
                null,
                2,
              ),
            );
            process.exitCode = 1;
            return;
          }
          printUnsafeWriteBlocked(
            "integrations-import-crosspost-tokens",
            "api integrations import wordpress",
          );
          return;
        });
      return wpImport;
    })(),
  )
  .addCommand(
    (() => {
      const rssImport = new Command("rss")
        .description("Return a blocked RSS import result until safe captures exist.")
        .argument("<url>", "RSS feed URL")
        .requiredOption("--yes", "Acknowledge the blocked integrations boundary")
        .action(async (_url: string, options: { yes: boolean }) => {
          if (!options.yes) {
            console.log(
              JSON.stringify(
                {
                  status: "failed",
                  message: "Add --yes to acknowledge the blocked RSS import boundary.",
                },
                null,
                2,
              ),
            );
            process.exitCode = 1;
            return;
          }
          printUnsafeWriteBlocked(
            "integrations-import-crosspost-tokens",
            "api integrations import rss",
          );
          return;
        });
      return rssImport;
    })(),
  );

apiIntegrations
  .command("tokens")
  .description("List API tokens (redacted).")
  .option("--source <source>", "auto, env, or local-profile", "auto")
  .addCommand(
    new Command("list")
      .description("List API tokens (redacted).")
      .option("--source <source>", "auto, env, or local-profile", "auto")
      .action(async (options: { source: "auto" | ApiAuthSource }) => {
        const effective = await loadEffectiveConfig();
        const material = await resolveApiAuthMaterial(effective, options.source);
        const result = await fetchApiTokens(material.publicationUrl, material, fetch);
        console.log(JSON.stringify(result, null, 2));
        if (result.status !== "ok") {
          process.exitCode = 1;
        }
      }),
  )
  .action(async (options: { source: "auto" | ApiAuthSource }) => {
    const effective = await loadEffectiveConfig();
    const material = await resolveApiAuthMaterial(effective, options.source);
    const result = await fetchApiTokens(material.publicationUrl, material, fetch);
    console.log(JSON.stringify(result, null, 2));
    if (result.status !== "ok") {
      process.exitCode = 1;
    }
  });

const config = program.command("config").description("Manage non-secret local configuration.");

config
  .command("show")
  .description("Show effective CLI configuration without exposing secrets.")
  .action(async () => {
    const [local, effective, session] = await Promise.all([
      loadConfig(),
      loadEffectiveConfig(),
      loadSession(),
    ]);

    console.log(
      JSON.stringify(
        {
          stateDir: stateDir(),
          configFile: configFilePath(),
          sessionFile: sessionFilePath(),
          draftMappingsFile: draftMappingsFilePath(),
          localBrowserProfileDir: localBrowserProfileDir(),
          local,
          effective: {
            publicationUrl: effective.publicationUrl ?? null,
            browserRuntime: effective.browserRuntime,
            defaultMode: effective.defaultMode,
            browserbaseApiKey: redact(effective.browserbaseApiKey),
            browserbaseProjectId: redact(effective.browserbaseProjectId),
            stagehandModel: effective.stagehandModel,
            substackEmail: redact(effective.substackEmail),
            substackPasswordConfigured: Boolean(effective.substackPassword),
          },
          session: session
            ? {
                browserbaseSessionId: redact(session.browserbaseSessionId),
                publicationUrl: session.publicationUrl,
                updatedAt: session.updatedAt,
                browserbaseSessionUrl: redactUrl(session.browserbaseSessionUrl),
                browserbaseDebugUrl: redactUrl(session.browserbaseDebugUrl),
              }
            : null,
        },
        null,
        2,
      ),
    );
  });

config
  .command("set-publication")
  .description("Set the default Substack publication URL.")
  .argument("<url>", "Publication URL, for example https://example.substack.com")
  .action(async (url: string) => {
    const next = await updateConfig({ publicationUrl: url });
    console.log(JSON.stringify(next, null, 2));
  });

config
  .command("set-runtime")
  .description("Set the browser runtime.")
  .argument("<runtime>", "browserbase, local, or camoufox")
  .action(async (runtime: "browserbase" | "local" | "camoufox") => {
    const next = await updateConfig({ browserRuntime: runtime });
    console.log(JSON.stringify(next, null, 2));
  });

const auth = program.command("auth").description("Manage authenticated browser sessions.");

auth
  .command("status")
  .description("Show configured publication and browser environment status.")
  .action(async () => {
    const [effective, session, localProfile] = await Promise.all([
      loadEffectiveConfig(),
      loadSession(),
      readLocalProfileReadiness(),
    ]);
    console.log(JSON.stringify(buildAuthStatusReport(effective, session, localProfile), null, 2));
  });

auth
  .command("login")
  .description("Start or resume a Browserbase session for manual Substack login.")
  .option("--session-id <id>", "Existing Browserbase session ID to resume")
  .option(
    "--auto-login",
    "Attempt Substack login using SUBSTACK_EMAIL and SUBSTACK_PASSWORD",
    false,
  )
  .option(
    "--pause-before-password",
    "For local auto-login, stop after opening and focusing the password field",
    false,
  )
  .option(
    "--wait-seconds <seconds>",
    "Keep the session open for manual login before closing",
    parseInteger,
    0,
  )
  .action(
    async (options: {
      sessionId?: string;
      autoLogin: boolean;
      pauseBeforePassword: boolean;
      waitSeconds: number;
    }) => {
      const stored = await loadSession();
      const effective = await loadEffectiveConfig();

      if (effective.browserRuntime === "local") {
        const result = await runLocalLogin({
          publicationUrl: requirePublicationUrl(effective),
          credentials: options.autoLogin ? requireSubstackCredentials(effective) : undefined,
          waitSeconds: options.waitSeconds,
          pauseBeforePassword: options.pauseBeforePassword,
        });

        console.log(JSON.stringify(result, null, 2));
        return;
      }

      const session = await createStagehandSession({
        config: effective,
        browserbaseSessionId: options.sessionId ?? stored?.browserbaseSessionId,
        keepAlive: true,
      });

      try {
        await session.page.goto(session.publicationUrl, {
          waitUntil: "domcontentloaded",
          timeoutMs: 60000,
        });

        if (session.browserbaseSessionId) {
          await saveSession(
            createStoredSession({
              browserbaseSessionId: session.browserbaseSessionId,
              publicationUrl: session.publicationUrl,
              browserbaseSessionUrl: session.browserbaseSessionUrl,
              browserbaseDebugUrl: session.browserbaseDebugUrl,
            }),
          );
        }

        const autoLoginResult = options.autoLogin
          ? await performSubstackLogin(session, requireSubstackCredentials(effective))
          : null;

        console.log(
          JSON.stringify(
            {
              status: "session-started",
              publicationUrl: session.publicationUrl,
              browserbaseSessionId: redact(session.browserbaseSessionId),
              browserbaseSessionUrl: session.browserbaseSessionUrl ?? null,
              browserbaseDebugUrl: session.browserbaseDebugUrl ?? null,
              autoLogin: autoLoginResult,
              note: "Use the Browserbase session URL to complete login manually if needed.",
            },
            null,
            2,
          ),
        );

        if (options.waitSeconds > 0) {
          await new Promise((resolve) => setTimeout(resolve, options.waitSeconds * 1000));
        }
      } finally {
        await session.close();
      }
    },
  );

auth
  .command("logout")
  .description("Forget the locally stored Browserbase session ID.")
  .action(async () => {
    await clearSession();
    console.log(JSON.stringify({ status: "session-cleared" }, null, 2));
  });

const debug = program.command("debug").description("Diagnostic helpers.");

debug
  .command("local-page")
  .description("Inspect visible links, buttons, and editor fields from the local browser profile.")
  .argument("[url]", "URL to inspect")
  .action(async (url?: string) => {
    const effective = await loadEffectiveConfig();
    const diagnostics = await captureLocalDiagnostics(url ?? requirePublicationUrl(effective));
    console.log(JSON.stringify(diagnostics, null, 2));
  });

debug
  .command("publish-screen")
  .description(
    "Navigate to a draft URL and inspect the publish review screen structure (buttons, dialogs, forms). Pass a draft editor URL like https://substack.com/publish/post/12345.",
  )
  .argument("<url>", "Draft editor URL to inspect (e.g., the draft URL from a prior `draft` run)")
  .option(
    "--capture",
    "Click Continue first to reveal the review overlay before capturing diagnostics",
    false,
  )
  .action(async (url: string, options: { capture: boolean }) => {
    try {
      if (options.capture) {
        const diagnostics = await captureReviewOverlayDiagnostics(url, true);
        console.log(
          JSON.stringify(
            { ...diagnostics, _note: "--capture clicks Continue first to map the review overlay" },
            null,
            2,
          ),
        );
      } else {
        const diagnostics = await capturePublishScreenDiagnostics(url);
        console.log(JSON.stringify(diagnostics, null, 2));
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(
        JSON.stringify(
          {
            status: "error",
            message,
            hint: "Make sure you are logged into Substack in your local Chrome profile.",
          },
          null,
          2,
        ),
      );
      process.exitCode = 1;
    }
  });

debug
  .command("review-overlay")
  .description(
    "Navigate to a draft URL, optionally click Continue, and inspect the review overlay (buttons, dialogs, confirmation elements). Pass a draft editor URL like https://substack.com/publish/post/12345.",
  )
  .argument("<url>", "Draft editor URL to inspect (e.g., the draft URL from a prior `draft` run)")
  .option(
    "--capture",
    "Click Continue first to reveal the review overlay before capturing (default: true)",
    true,
  )
  .action(async (url: string, options: { capture: boolean }) => {
    try {
      const diagnostics = await captureReviewOverlayDiagnostics(url, options.capture);
      console.log(JSON.stringify(diagnostics, null, 2));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(
        JSON.stringify(
          {
            status: "error",
            message,
            hint: "Make sure you are logged into Substack in your local Chrome profile.",
          },
          null,
          2,
        ),
      );
      process.exitCode = 1;
    }
  });

debug
  .command("schedule-screen")
  .description(
    "Navigate to a draft URL and inspect the schedule picker UI (date/time inputs, timezone, error states). Pass a draft editor URL like https://substack.com/publish/post/12345.",
  )
  .argument("<url>", "Draft editor URL to inspect (e.g., the draft URL from a prior `draft` run)")
  .action(async (url: string) => {
    try {
      const diagnostics = await captureScheduleScreenDiagnostics(url);
      console.log(JSON.stringify(diagnostics, null, 2));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(
        JSON.stringify(
          {
            status: "error",
            message,
            hint: "Make sure you are logged into Substack in your local Chrome profile.",
          },
          null,
          2,
        ),
      );
      process.exitCode = 1;
    }
  });

function buildScheduledQueue(
  inventory: ApiReadInventory,
  broadcasts: BroadcastEntry[],
): ScheduledQueueItem[] {
  const postItems: ScheduledQueueItem[] = (inventory.posts ?? [])
    .filter((post) => post.postDate)
    .map((post) => ({
      title: post.title,
      postId: String(post.id),
      scheduledAt: post.postDate,
      source: "post" as const,
      status: post.type,
    }));
  const draftItems: ScheduledQueueItem[] = (inventory.drafts ?? []).map((draft) => ({
    title: draft.title ?? draft.draftTitle ?? undefined,
    draftId: String(draft.id),
    scheduledAt: draft.scheduledAt,
    source: "draft" as const,
    status: draft.isPublished ? "published" : "draft",
  }));
  const broadcastItems: ScheduledQueueItem[] = broadcasts
    .filter((broadcast) => broadcast.scheduledFor)
    .map((broadcast) => ({
      title: broadcast.subject,
      postId: broadcast.postId != null ? String(broadcast.postId) : undefined,
      scheduledAt: broadcast.scheduledFor,
      source: "broadcast" as const,
      status: broadcast.status,
    }));

  return [...postItems, ...draftItems, ...broadcastItems];
}

function parseCoverageFormat(value: string): "json" | "markdown" {
  if (value === "json" || value === "markdown") return value;
  throw new Error(`Unsupported coverage report format: ${value}. Use json or markdown.`);
}

function parseWarehouseFormat(value: string): "json" | "csv" | "both" {
  if (value === "json" || value === "csv" || value === "both") return value;
  throw new Error(`Unsupported warehouse export format: ${value}. Use json, csv, or both.`);
}

function parseCoverageStatus(value: string): CoverageStatus {
  if (COVERAGE_STATUSES.includes(value as CoverageStatus)) return value as CoverageStatus;
  throw new Error(`Unsupported coverage status: ${value}.`);
}

function parseCoverageDomain(value: string): CapabilityDomain {
  if (COVERAGE_DOMAINS.includes(value as CapabilityDomain)) return value as CapabilityDomain;
  throw new Error(`Unsupported coverage domain: ${value}.`);
}

function printUnsafeWriteBlocked(surfaceId: SafeSurfaceId, operation: string): void {
  console.log(JSON.stringify(buildUnsafeWriteBlockedOutput(surfaceId, operation), null, 2));
  process.exitCode = 1;
}

async function resolveNoteBatchItems(
  items: NoteScheduleFileItem[],
  baseDir: string,
): Promise<NoteBatchItem[]> {
  return Promise.all(
    items.map(async (item) => {
      const sourceFile =
        item.textFile && !isAbsolute(item.textFile)
          ? resolve(baseDir, item.textFile)
          : item.textFile;
      return {
        text: item.text ?? (sourceFile ? await readBatchNoteTextFile(sourceFile) : ""),
        postUrl: item.postUrl ?? "",
        scheduledAt: item.scheduledAt ?? "",
        postScheduledAt: item.postScheduledAt,
        title: item.title,
        sourceFile,
        status: item.status,
      };
    }),
  );
}

async function readBatchNoteTextFile(file: string): Promise<string> {
  try {
    return (await readFile(file, "utf8")).trim();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Could not read note text file ${file}: ${message}`);
  }
}

async function readCliTextFile(file: string, label: string): Promise<string | undefined> {
  try {
    return (await readFile(file, "utf8")).trim();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(
      JSON.stringify(
        {
          status: "failed",
          message: `Could not read ${label} ${file}: ${message}`,
        },
        null,
        2,
      ),
    );
    process.exitCode = 1;
    return undefined;
  }
}

function parseInteger(value: string): number {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error(`Expected a non-negative integer, received ${value}`);
  }

  return parsed;
}

function parseLiveAudience(value: string): LiveAudience {
  if (value === "everyone" || value === "subscribers" || value === "paid") {
    return value;
  }
  throw new Error(`Unsupported live audience "${value}". Use everyone, subscribers, or paid.`);
}

program.parseAsync().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Error: ${message}`);
  process.exitCode = 1;
});
