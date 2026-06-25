import { z } from "zod";
import { BACKUP_RESTORE_CHECKLIST } from "../creator/backup.js";
import {
  COVERAGE_DOMAINS,
  COVERAGE_STATUSES,
  EXECUTION_PATHS,
} from "../frontier-coverage/schema.js";
import { SAFE_SURFACE_IDS } from "../frontier-coverage/safe-surfaces.js";

const IssueSchema = z.object({
  code: z.string().min(1),
  severity: z.enum(["error", "warning"]),
  message: z.string().min(1),
});

const OptionalString = z.string().min(1).optional();

export const CampaignPlanContractSchema = z.object({
  schemaVersion: z.literal(1),
  status: z.enum(["ready", "blocked"]),
  campaignId: z.string().min(1),
  createdAt: z.string().datetime(),
  publicationUrl: OptionalString,
  post: z.object({
    filePath: z.string().min(1),
    title: z.string(),
    slug: OptionalString,
    plannedUrl: OptionalString,
    seoTitle: OptionalString,
    seoDescription: OptionalString,
    canonicalUrl: OptionalString,
  }),
  publishAt: OptionalString,
  notes: z.array(
    z.object({
      scheduledAt: z.string().min(1),
      postUrl: z.string(),
      text: z.string().min(1),
      status: z.literal("planned"),
    }),
  ),
  channels: z.array(
    z.object({
      channel: z.enum(["notes", "linkedin", "x", "youtube"]),
      trackingUrl: OptionalString,
      plannedAction: z.string().min(1),
    }),
  ),
  assets: z.array(
    z.object({
      kind: z.enum(["video", "audio", "transcript", "thumbnail", "socialImage"]),
      file: z.string().min(1),
    }),
  ),
  utm: z.object({
    source: z.string().min(1),
    medium: z.string().min(1),
    campaign: z.string().min(1),
  }),
  runLogDir: OptionalString,
  issues: z.array(IssueSchema),
  nextCommands: z.array(z.string().min(1)),
});

export const MediaPlanContractSchema = z.object({
  schemaVersion: z.literal(1),
  status: z.enum(["ready", "blocked"]),
  operation: z.enum(["media.video.plan", "media.audio.plan"]),
  file: z.string().min(1),
  postFile: z.string().min(1),
  title: z.string(),
  sizeBytes: z.number().int().nonnegative(),
  mimeType: z.string().min(1),
  issues: z.array(IssueSchema),
  nextSteps: z.array(z.string().min(1)),
});

export const LivePlanContractSchema = z.object({
  schemaVersion: z.literal(1),
  status: z.enum(["ready", "blocked"]),
  operation: z.literal("live.plan"),
  title: z.string(),
  scheduledAt: z.string().min(1),
  audience: z.enum(["everyone", "subscribers", "paid"]),
  issues: z.array(IssueSchema),
  rtmpChecklist: z.array(z.string().min(1)),
});

const AnalyticsInventoryContractSchema = z
  .object({
    publication: z.unknown().optional(),
    postAnalytics: z.unknown().optional(),
    subscriberGrowth: z.unknown().optional(),
    emailPerformance: z.unknown().optional(),
    revenue: z.unknown().optional(),
    diagnostics: z.array(z.unknown()).optional(),
  })
  .catchall(z.unknown());

export const AnalyticsSnapshotContractSchema = z.object({
  schemaVersion: z.literal(1),
  capturedAt: z.string().datetime(),
  postUrl: OptionalString,
  postId: z.number().int().nonnegative().optional(),
  campaignId: OptionalString,
  analytics: AnalyticsInventoryContractSchema.nullable(),
  diagnostics: z.array(z.string()),
});

export const AnalyticsTrendContractSchema = z.object({
  status: z.literal("ok"),
  snapshotsDir: z.string().min(1),
  snapshotCount: z.number().int().nonnegative(),
  firstCapturedAt: OptionalString,
  latestCapturedAt: OptionalString,
  subscriberDelta: z.number().nullable(),
  viewDelta: z.number().nullable(),
  diagnostics: z.array(z.string()),
});

export const GrowthReportContractSchema = z.object({
  status: z.literal("ok"),
  campaignId: z.string().min(1),
  postTitle: z.string(),
  channelCount: z.number().int().nonnegative(),
  noteCount: z.number().int().nonnegative(),
  assetCount: z.number().int().nonnegative(),
  trend: AnalyticsTrendContractSchema.nullable(),
  recommendations: z.array(z.string().min(1)),
});

const WarehouseCellSchema = z.union([z.string(), z.number(), z.boolean(), z.null()]);

export const WarehouseExportContractSchema = z.object({
  schemaVersion: z.literal(1),
  generatedAt: z.string().datetime(),
  source: z.object({
    campaignFiles: z.array(z.string()),
    analyticsDir: OptionalString,
    runLogDir: OptionalString,
  }),
  tables: z.object({
    campaigns: z.array(z.record(z.string(), WarehouseCellSchema)),
    posts: z.array(z.record(z.string(), WarehouseCellSchema)),
    notes: z.array(z.record(z.string(), WarehouseCellSchema)),
    referrers: z.array(z.record(z.string(), WarehouseCellSchema)),
    subscribers: z.array(z.record(z.string(), WarehouseCellSchema)),
    revenue: z.array(z.record(z.string(), WarehouseCellSchema)),
    run_logs: z.array(z.record(z.string(), WarehouseCellSchema)),
  }),
  diagnostics: z.array(z.string()),
});

export const WarehouseAttributionContractSchema = z.object({
  status: z.literal("ok"),
  generatedAt: z.string().datetime(),
  campaignCount: z.number().int().nonnegative(),
  campaigns: z.array(
    z.object({
      campaignId: z.string().min(1),
      views: z.number(),
      referrals: z.number(),
      revenue: z.number(),
    }),
  ),
});

export const WarehouseFunnelContractSchema = z.object({
  status: z.literal("ok"),
  generatedAt: z.string().datetime(),
  campaignCount: z.number().int().nonnegative(),
  campaigns: z.array(
    z.object({
      campaignId: z.string().min(1),
      plannedPosts: z.number().int().nonnegative(),
      observedPosts: z.number().int().nonnegative(),
      scheduledNotes: z.number().int().nonnegative(),
      successfulRunLogs: z.number().int().nonnegative(),
      views: z.number(),
      averageReadRate: z.number().nullable(),
      emailOpens: z.number(),
      emailClicks: z.number(),
      clickThroughRate: z.number().nullable(),
      subscriberNetChange: z.number(),
      revenue: z.number(),
    }),
  ),
});

export const BackupSnapshotPlanContractSchema = z.object({
  schemaVersion: z.literal(1),
  status: z.enum(["ready", "blocked"]),
  generatedAt: z.string().datetime(),
  snapshotFile: z.string().min(1),
  publicationUrl: z.string().nullable(),
  sources: z.array(z.string().min(1)),
  sourceManifests: z.array(
    z.object({
      source: z.string().min(1),
      kind: z.enum(["file", "directory", "other", "missing"]),
      sizeBytes: z.number().int().nonnegative().nullable(),
      sha256: z
        .string()
        .regex(/^[a-f0-9]{64}$/)
        .nullable(),
    }),
  ),
  validations: z.array(
    z.object({
      code: z.string().min(1),
      status: z.enum(["pass", "fail"]),
      message: z.string().min(1),
    }),
  ),
  manualRestoreChecklist: z.array(z.enum(BACKUP_RESTORE_CHECKLIST)),
});

export const RunLogContractSchema = z.object({
  schemaVersion: z.literal(1),
  timestamp: z.string().datetime(),
  actionType: z.enum([
    "draft.create",
    "draft.update",
    "post.publish",
    "post.schedule",
    "note.create",
    "note.schedule",
    "campaign.plan",
    "campaign.execute",
    "analytics.snapshot",
    "media.video.plan",
    "media.audio.plan",
    "live.plan",
    "coverage.audit",
    "coverage.validate",
    "coverage.drift",
    "launch.check",
    "endpoint.capture.review",
    "decision.record",
  ]),
  status: z.enum(["success", "failure"]),
  publicationUrl: z.string().min(1),
  publicationId: z.number().int().nullable().optional(),
  sourceFile: OptionalString,
  selectorSourceFile: OptionalString,
  title: OptionalString,
  draftId: OptionalString,
  draftUrl: OptionalString,
  sectionName: OptionalString,
  sectionId: z.number().int().optional(),
  slug: OptionalString,
  tags: z.array(z.string()).optional(),
  scheduledTimeRequested: OptionalString,
  scheduledTimeReturned: OptionalString,
  apiResponseIds: z
    .object({
      draftId: OptionalString,
      postUrl: OptionalString,
      noteId: OptionalString,
    })
    .optional(),
  campaignId: OptionalString,
  channel: OptionalString,
  assetFile: OptionalString,
  diagnostics: z
    .object({
      unsupportedEndpoints: z.array(z.string()).optional(),
      manualAdminGates: z.array(z.string()).optional(),
      staleDocs: z.array(z.string()).optional(),
    })
    .optional(),
  resultMessage: OptionalString,
  error: z
    .object({
      message: z.string().min(1),
      body: z.string().nullable().optional(),
    })
    .optional(),
});

export const CoverageDriftContractSchema = z.object({
  operation: z.literal("coverage.drift"),
  status: z.enum(["ready", "blocked"]),
  generatedAt: z.string().datetime(),
  staleAfterDays: z.number().int().positive(),
  summary: z.object({
    officialDocCount: z.number().int().nonnegative(),
    freshOfficialDocCount: z.number().int().nonnegative(),
    blockedOfficialDocCount: z.number().int().nonnegative(),
    endpointDiagnosticCount: z.number().int().nonnegative(),
    missingDecisionRecordCount: z.number().int().nonnegative(),
  }),
  officialDocs: z.array(
    z.object({
      capabilityId: z.string().min(1),
      capability: z.string().min(1),
      ref: z.string().min(1),
      status: z.enum(["fresh", "stale", "changed", "unavailable", "missing-snapshot"]),
      checkedAt: OptionalString,
      note: OptionalString,
    }),
  ),
  endpointCaptureDiagnostics: z.array(
    z.object({
      capabilityId: z.string().min(1),
      capability: z.string().min(1),
      decisionRecordId: z.string().min(1),
      status: z.enum(COVERAGE_STATUSES),
      diagnostic: z.string().min(1),
    }),
  ),
});

export const SafeSurfaceContractSchema = z.object({
  id: z.enum(SAFE_SURFACE_IDS),
  title: z.string().min(1),
  status: z.enum(COVERAGE_STATUSES),
  safetyClass: z.string().min(1),
  capabilityIds: z.array(z.string().min(1)),
  currentCommands: z.array(z.string().min(1)),
  safeAlternatives: z.array(z.string().min(1)),
  manualRunbook: z.array(z.string().min(1)),
  endpointCaptureRequirements: z.array(z.string().min(1)),
  blockedOperations: z.array(z.string().min(1)),
  existingImplementations: z.array(
    z.object({
      name: z.string().min(1),
      source: z.enum(["local", "external"]),
      reference: z.string().min(1),
      learnings: z.array(z.string().min(1)),
      limitations: z.array(z.string().min(1)),
    }),
  ),
  implementationOptions: z.array(
    z.object({
      id: z.enum(["A", "B", "C"]),
      label: z.string().min(1),
      summary: z.string().min(1),
      risk: z.enum(["low", "medium", "high"]),
      selected: z.boolean(),
    }),
  ),
  selectedImplementation: z.string().min(1),
  decisionRecord: z.object({
    id: z.string().min(1),
    reason: z.string().min(1),
  }),
});

export const CoverageMatrixContractSchema = z.object({
  schemaVersion: z.literal(1),
  generatedAt: OptionalString,
  capabilities: z.array(
    z.object({
      id: z.string().min(1),
      name: z.string().min(1),
      domain: z.enum(COVERAGE_DOMAINS),
      status: z.enum(COVERAGE_STATUSES),
      paths: z.array(z.enum(EXECUTION_PATHS)).min(1),
      primaryPath: z.enum(EXECUTION_PATHS).optional(),
      fallbackPath: z.enum(EXECUTION_PATHS).optional(),
      manualPath: z.enum(EXECUTION_PATHS).optional(),
      safetyClass: z.string().min(1),
      evidence: z.array(
        z.object({
          kind: z.string().min(1),
          label: z.string().min(1),
          ref: z.string().min(1),
        }),
      ),
      decisionRecord: z
        .object({
          id: z.string().min(1),
          reason: z.string().min(1),
          nextReview: OptionalString,
          owner: OptionalString,
        })
        .optional(),
      missingEvidence: z.array(z.string().min(1)),
      nextAction: z.string().min(1),
      ownerDependency: OptionalString,
    }),
  ),
});

export const CaptureEvidenceContractSchema = z.object({
  schemaVersion: z.literal(1),
  capabilityId: z.string().min(1),
  capturedAt: z.string().datetime(),
  source: z.enum(["browser", "api", "manual"]),
  surface: z.string().min(1),
  endpoints: z.array(
    z.object({
      method: z.string().min(1),
      url: z.string().min(1),
      status: z.number().int().optional(),
      requestHeaders: z.record(z.string(), z.unknown()).optional(),
      responseHeaders: z.record(z.string(), z.unknown()).optional(),
      requestBody: z.unknown().optional(),
      responseBody: z.unknown().optional(),
    }),
  ),
  notes: z.array(z.string()).optional(),
  evidenceHash: OptionalString,
  lastVerifiedAt: OptionalString,
});

export const FIRST_PARTY_ARTIFACT_SCHEMAS = [
  {
    id: "campaign.plan",
    title: "Campaign plan artifact",
    schemaVersion: 1,
    owner: "src/creator/campaign.ts",
    commands: ["campaign plan <file>", "campaign validate --plan <file>"],
    schema: CampaignPlanContractSchema,
  },
  {
    id: "media.plan",
    title: "Media plan artifact",
    schemaVersion: 1,
    owner: "src/creator/media-plan.ts",
    commands: [
      "media video plan --file <file> --post <markdown>",
      "media audio plan --file <file> --post <markdown>",
    ],
    schema: MediaPlanContractSchema,
  },
  {
    id: "live.plan",
    title: "Live plan artifact",
    schemaVersion: 1,
    owner: "src/creator/media-plan.ts",
    commands: ["live plan --title <title> --at <timestamp>"],
    schema: LivePlanContractSchema,
  },
  {
    id: "analytics.snapshot",
    title: "Analytics snapshot artifact",
    schemaVersion: 1,
    owner: "src/creator/growth.ts",
    commands: ["analytics snapshot", "api analytics snapshot"],
    schema: AnalyticsSnapshotContractSchema,
  },
  {
    id: "analytics.trend",
    title: "Analytics trend artifact",
    schemaVersion: 1,
    owner: "src/creator/growth.ts",
    commands: ["analytics trend --snapshots-dir <dir>"],
    schema: AnalyticsTrendContractSchema,
  },
  {
    id: "growth.report",
    title: "Growth report artifact",
    schemaVersion: 1,
    owner: "src/creator/growth.ts",
    commands: ["growth report --campaign <file>"],
    schema: GrowthReportContractSchema,
  },
  {
    id: "warehouse.export",
    title: "Creator warehouse export artifact",
    schemaVersion: 1,
    owner: "src/creator/warehouse.ts",
    commands: ["warehouse export"],
    schema: WarehouseExportContractSchema,
  },
  {
    id: "warehouse.attribution",
    title: "Creator warehouse attribution report",
    schemaVersion: 1,
    owner: "src/creator/warehouse.ts",
    commands: ["warehouse attribution"],
    schema: WarehouseAttributionContractSchema,
  },
  {
    id: "warehouse.funnel",
    title: "Creator warehouse funnel report",
    schemaVersion: 1,
    owner: "src/creator/warehouse.ts",
    commands: ["warehouse funnel"],
    schema: WarehouseFunnelContractSchema,
  },
  {
    id: "backup.snapshot-plan",
    title: "Redacted backup snapshot plan",
    schemaVersion: 1,
    owner: "src/creator/backup.ts",
    commands: ["backup plan", "backup validate"],
    schema: BackupSnapshotPlanContractSchema,
  },
  {
    id: "run-log",
    title: "Run-log artifact",
    schemaVersion: 1,
    owner: "src/publish/run-log.ts",
    commands: ["--run-log-dir <dir>"],
    schema: RunLogContractSchema,
  },
  {
    id: "coverage.drift",
    title: "Coverage drift artifact",
    schemaVersion: 1,
    owner: "src/frontier-coverage/drift.ts",
    commands: ["npm run frontier:drift"],
    schema: CoverageDriftContractSchema,
  },
  {
    id: "coverage.safe-surface",
    title: "Safe surface artifact",
    schemaVersion: 1,
    owner: "src/frontier-coverage/safe-surfaces.ts",
    commands: ["coverage safe-surfaces", "coverage safe-surface --id <id>"],
    schema: SafeSurfaceContractSchema,
  },
  {
    id: "coverage.matrix",
    title: "Coverage matrix artifact",
    schemaVersion: 1,
    owner: "src/frontier-coverage/schema.ts",
    commands: ["coverage validate", "coverage report"],
    schema: CoverageMatrixContractSchema,
  },
  {
    id: "capture.evidence",
    title: "Redacted endpoint capture evidence fixture",
    schemaVersion: 1,
    owner: "src/frontier-coverage/evidence-capture.ts",
    commands: [
      "coverage capture-validate",
      "coverage capture-inventory",
      "coverage capture-diff",
      "coverage capture-graduation",
    ],
    schema: CaptureEvidenceContractSchema,
  },
] as const;

export type FirstPartyArtifactContract = (typeof FIRST_PARTY_ARTIFACT_SCHEMAS)[number];
