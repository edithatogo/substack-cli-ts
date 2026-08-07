import assert from "node:assert/strict";
import { describe, it } from "vitest";
import {
  AnalyticsSnapshotContractSchema,
  AnalyticsTrendContractSchema,
  BackupSnapshotPlanContractSchema,
  CampaignPlanContractSchema,
  CaptureEvidenceContractSchema,
  CoverageDriftContractSchema,
  FIRST_PARTY_ARTIFACT_SCHEMAS,
  GrowthReportContractSchema,
  LivePlanContractSchema,
  MediaPlanContractSchema,
  RunLogContractSchema,
  WarehouseAttributionContractSchema,
  WarehouseExportContractSchema,
  WarehouseFunnelContractSchema,
} from "./schemas.js";

describe("first-party artifact contract schemas", () => {
  it("registers stable schema ids for the public local artifacts", () => {
    assert.deepEqual(
      FIRST_PARTY_ARTIFACT_SCHEMAS.map((schema) => schema.id),
      [
        "campaign.plan",
        "media.plan",
        "live.plan",
        "analytics.snapshot",
        "analytics.trend",
        "growth.report",
        "warehouse.export",
        "warehouse.attribution",
        "warehouse.funnel",
        "backup.snapshot-plan",
        "run-log",
        "coverage.drift",
        "coverage.safe-surface",
        "coverage.matrix",
        "capture.evidence",
      ],
    );
  });

  it("validates representative creator, analytics, run-log, and coverage artifacts", () => {
    const campaign = CampaignPlanContractSchema.parse({
      schemaVersion: 1,
      status: "ready",
      campaignId: "launch",
      createdAt: "2026-06-24T00:00:00.000Z",
      post: {
        filePath: "examples/basic.md",
        title: "Launch post",
      },
      notes: [],
      channels: [
        {
          channel: "notes",
          plannedAction: "Schedule a launch note.",
        },
      ],
      assets: [],
      utm: {
        source: "substack",
        medium: "post",
        campaign: "launch",
      },
      issues: [],
      nextCommands: ["substack-cli publish examples/basic.md"],
    });

    MediaPlanContractSchema.parse({
      schemaVersion: 1,
      status: "ready",
      operation: "media.audio.plan",
      file: "episode.mp3",
      postFile: "examples/basic.md",
      title: campaign.post.title,
      sizeBytes: 1024,
      mimeType: "audio/mpeg",
      issues: [],
      nextSteps: ["Upload manually."],
    });

    LivePlanContractSchema.parse({
      schemaVersion: 1,
      status: "ready",
      operation: "live.plan",
      title: "Launch live",
      scheduledAt: "2026-06-25T00:00:00.000Z",
      audience: "subscribers",
      issues: [],
      rtmpChecklist: ["Create a dashboard event."],
    });

    AnalyticsSnapshotContractSchema.parse({
      schemaVersion: 1,
      capturedAt: "2026-06-24T00:00:00.000Z",
      campaignId: campaign.campaignId,
      analytics: null,
      diagnostics: ["Dry run."],
    });

    const trend = AnalyticsTrendContractSchema.parse({
      status: "ok",
      snapshotsDir: ".substack-cli/analytics",
      snapshotCount: 1,
      subscriberDelta: null,
      viewDelta: 10,
      diagnostics: [],
    });

    GrowthReportContractSchema.parse({
      status: "ok",
      campaignId: campaign.campaignId,
      postTitle: campaign.post.title,
      channelCount: 1,
      noteCount: 0,
      assetCount: 0,
      trend,
      recommendations: ["Capture a 24 hour snapshot."],
    });

    WarehouseExportContractSchema.parse({
      schemaVersion: 1,
      generatedAt: "2026-06-24T00:00:00.000Z",
      source: { campaignFiles: ["campaign.json"] },
      tables: {
        campaigns: [{ campaign_id: campaign.campaignId, views: 10, ready: true, note: null }],
        posts: [],
        notes: [],
        referrers: [],
        subscribers: [],
        revenue: [],
        run_logs: [],
      },
      diagnostics: [],
    });

    WarehouseAttributionContractSchema.parse({
      status: "ok",
      generatedAt: "2026-06-24T00:00:00.000Z",
      campaignCount: 1,
      campaigns: [{ campaignId: campaign.campaignId, views: 10, referrals: 1, revenue: 0 }],
    });

    WarehouseFunnelContractSchema.parse({
      status: "ok",
      generatedAt: "2026-06-24T00:00:00.000Z",
      campaignCount: 1,
      campaigns: [
        {
          campaignId: campaign.campaignId,
          plannedPosts: 1,
          observedPosts: 1,
          scheduledNotes: 1,
          successfulRunLogs: 1,
          views: 10,
          averageReadRate: 0.5,
          emailOpens: 8,
          emailClicks: 2,
          clickThroughRate: 0.25,
          subscriberNetChange: 3,
          revenue: 12,
        },
      ],
    });

    BackupSnapshotPlanContractSchema.parse({
      schemaVersion: 1,
      status: "ready",
      generatedAt: "2026-06-24T00:00:00.000Z",
      snapshotFile: "backup.json",
      publicationUrl: null,
      sources: ["warehouse.json"],
      sourceManifests: [
        {
          source: "warehouse.json",
          kind: "file",
          sizeBytes: 2,
          sha256: "44136fa355b3678a1146ad16f7e8649e94fb4fc21fe77e8310c060f61caaff8a",
        },
      ],
      validations: [{ code: "source-readable", status: "pass", message: "Source is readable." }],
      manualRestoreChecklist: [
        "Keep the snapshot outside the repository and dependency directories.",
        "Verify the redacted warehouse JSON/CSV files before restoring anything in Substack.",
        "Recreate drafts from local Markdown files before publishing.",
      ],
    });

    RunLogContractSchema.parse({
      schemaVersion: 1,
      timestamp: "2026-06-24T00:00:00.000Z",
      actionType: "campaign.plan",
      status: "success",
      publicationUrl: "local",
      publicationId: null,
      sourceFile: "examples/basic.md",
      campaignId: campaign.campaignId,
      resultMessage: "Campaign plan generated.",
    });

    CoverageDriftContractSchema.parse({
      operation: "coverage.drift",
      status: "ready",
      generatedAt: "2026-06-24T00:00:00.000Z",
      staleAfterDays: 30,
      summary: {
        officialDocCount: 0,
        freshOfficialDocCount: 0,
        blockedOfficialDocCount: 0,
        endpointDiagnosticCount: 0,
        missingDecisionRecordCount: 0,
      },
      officialDocs: [],
      endpointCaptureDiagnostics: [],
    });

    CaptureEvidenceContractSchema.parse({
      schemaVersion: 1,
      capabilityId: "native-video-posts",
      capturedAt: "2026-06-24T00:00:00.000Z",
      source: "browser",
      surface: "native video upload",
      endpoints: [{ method: "POST", url: "https://example.test/api/video", status: 200 }],
      evidenceHash: "sha256:abc",
      lastVerifiedAt: "2026-06-24T00:00:00.000Z",
    });
  });

  it("rejects unsupported contract versions and missing required fields", () => {
    assert.throws(() =>
      CampaignPlanContractSchema.parse({
        schemaVersion: 2,
        status: "ready",
      }),
    );
    assert.throws(() =>
      RunLogContractSchema.parse({
        schemaVersion: 1,
        timestamp: "2026-06-24T00:00:00.000Z",
        actionType: "post.delete",
        status: "success",
        publicationUrl: "local",
      }),
    );
    assert.doesNotThrow(() =>
      RunLogContractSchema.parse({
        schemaVersion: 1,
        timestamp: "2026-06-24T00:00:00.000Z",
        actionType: "draft.unschedule",
        status: "success",
        publicationUrl: "local",
      }));
    assert.doesNotThrow(() =>
      RunLogContractSchema.parse({
        schemaVersion: 1,
        timestamp: "2026-06-24T00:00:00.000Z",
        actionType: "draft.revise",
        status: "success",
        publicationUrl: "local",
      }));
  });
});
