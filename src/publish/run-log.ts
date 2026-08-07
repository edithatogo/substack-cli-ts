import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { DraftWritePlan, DraftWriteResult } from "../substack-api/draft-write.js";
import type { NoteWritePlan, NoteWriteResult } from "../substack-api/note-write.js";
import type {
  DraftMutationExecutionPlan,
  DraftMutationExecutionResult,
} from "../substack-api/draft-operations.js";
import type { PublishWritePlan, PublishWriteResult } from "../substack-api/publish-write.js";
import type { PreparedPost } from "../types.js";
import { redactUrl } from "../util/redact.js";
import type { BrowserWorkflowResult } from "./browser-workflow.js";
import { resolvePostTitle } from "./title.js";

export type RunLogActionType =
  | "draft.create"
  | "draft.update"
  | "draft.unschedule"
  | "draft.revise"
  | "post.publish"
  | "post.schedule"
  | "note.create"
  | "note.schedule"
  | "campaign.plan"
  | "campaign.execute"
  | "analytics.snapshot"
  | "media.video.plan"
  | "media.audio.plan"
  | "live.plan"
  | "coverage.audit"
  | "coverage.validate"
  | "coverage.drift"
  | "launch.check"
  | "endpoint.capture.review"
  | "decision.record";

export interface RunLogArtifact {
  schemaVersion: 1;
  timestamp: string;
  actionType: RunLogActionType;
  status: "success" | "failure";
  publicationUrl: string;
  publicationId?: number | null | undefined;
  sourceFile?: string | undefined;
  selectorSourceFile?: string | undefined;
  title?: string | undefined;
  draftId?: string | undefined;
  draftUrl?: string | undefined;
  sectionName?: string | undefined;
  sectionId?: number | undefined;
  slug?: string | undefined;
  tags?: string[] | undefined;
  scheduledTimeRequested?: string | undefined;
  scheduledTimeReturned?: string | undefined;
  apiResponseIds?: {
    draftId?: string | undefined;
    postUrl?: string | undefined;
    noteId?: string | undefined;
  };
  campaignId?: string | undefined;
  channel?: string | undefined;
  assetFile?: string | undefined;
  diagnostics?:
    | {
        unsupportedEndpoints?: string[] | undefined;
        manualAdminGates?: string[] | undefined;
        staleDocs?: string[] | undefined;
      }
    | undefined;
  resultMessage?: string | undefined;
  error?:
    | {
        message: string;
        body?: string | null | undefined;
      }
    | undefined;
}

export function buildCreatorWorkflowRunLog(input: {
  actionType: Extract<
    RunLogActionType,
    | "campaign.plan"
    | "campaign.execute"
    | "analytics.snapshot"
    | "media.video.plan"
    | "media.audio.plan"
    | "live.plan"
    | "coverage.audit"
    | "coverage.validate"
    | "coverage.drift"
    | "launch.check"
    | "endpoint.capture.review"
    | "decision.record"
  >;
  status?: "success" | "failure" | undefined;
  publicationUrl?: string | undefined;
  sourceFile?: string | undefined;
  title?: string | undefined;
  scheduledTimeRequested?: string | undefined;
  campaignId?: string | undefined;
  channel?: string | undefined;
  assetFile?: string | undefined;
  unsupportedEndpoints?: string[] | undefined;
  manualAdminGates?: string[] | undefined;
  staleDocs?: string[] | undefined;
  resultMessage?: string | undefined;
  errorMessage?: string | undefined;
}): RunLogArtifact {
  return {
    schemaVersion: 1,
    timestamp: new Date().toISOString(),
    actionType: input.actionType,
    status: input.status ?? "success",
    publicationUrl: input.publicationUrl ?? "local",
    publicationId: null,
    sourceFile: input.sourceFile,
    title: input.title,
    scheduledTimeRequested: input.scheduledTimeRequested,
    campaignId: input.campaignId,
    channel: input.channel,
    assetFile: input.assetFile,
    diagnostics: buildRunLogDiagnostics(input),
    resultMessage: input.resultMessage,
    error: input.errorMessage
      ? {
          message: input.errorMessage,
          body: redactErrorBody(input.errorMessage),
        }
      : undefined,
  };
}

function buildRunLogDiagnostics(input: {
  unsupportedEndpoints?: string[] | undefined;
  manualAdminGates?: string[] | undefined;
  staleDocs?: string[] | undefined;
}): RunLogArtifact["diagnostics"] {
  const diagnostics = {
    unsupportedEndpoints: redactDiagnostics(input.unsupportedEndpoints),
    manualAdminGates: redactDiagnostics(input.manualAdminGates),
    staleDocs: redactDiagnostics(input.staleDocs),
  };
  return diagnostics.unsupportedEndpoints?.length ||
    diagnostics.manualAdminGates?.length ||
    diagnostics.staleDocs?.length
    ? diagnostics
    : undefined;
}

export function buildDraftMutationRunLog(input: {
  publicationUrl: string;
  plan: DraftMutationExecutionPlan;
  result: DraftMutationExecutionResult;
  sourceFile?: string | undefined;
  selectorSourceFile?: string | undefined;
}): RunLogArtifact {
  const actionType = input.plan.operation === "unschedule" ? "draft.unschedule" : "draft.revise";
  const resultMessage = input.result.message;

  return {
    schemaVersion: 1,
    timestamp: new Date().toISOString(),
    actionType,
    status: input.result.status === "failed" ? "failure" : "success",
    publicationUrl: input.publicationUrl,
    publicationId: null,
    sourceFile: input.sourceFile,
    selectorSourceFile: input.selectorSourceFile,
    draftId: input.plan.draftId,
    draftUrl: redactUrl(input.plan.draftUrl) ?? undefined,
    apiResponseIds: {
      draftId: input.result.draftId,
      postUrl: input.result.publishedUrl ?? undefined,
    },
    resultMessage,
    error:
      input.result.status === "failed"
        ? {
            message: input.result.error ?? resultMessage,
            body: redactErrorBody(input.result.error),
          }
        : undefined,
  };
}

export async function writeRunLog(
  runLogDir: string | undefined,
  artifact: RunLogArtifact,
): Promise<string | undefined> {
  if (!runLogDir) {
    return undefined;
  }

  await mkdir(runLogDir, { recursive: true });
  const fileName = `${safeFilePart(artifact.timestamp)}-${safeFilePart(artifact.actionType)}-${artifact.status}-${randomUUID()}.json`;
  const filePath = join(runLogDir, fileName);
  await writeFile(filePath, `${JSON.stringify(artifact, null, 2)}\n`, "utf8");
  return filePath;
}

export function buildBrowserWorkflowRunLog(input: {
  publicationUrl: string;
  prepared: PreparedPost;
  result: BrowserWorkflowResult | Record<string, unknown>;
}): RunLogArtifact {
  const resultRecord = input.result as Record<string, unknown>;
  const status = String(resultRecord.status ?? "");
  const metadata = asRecord(resultRecord.metadata);
  const draftId = valueAsString(resultRecord.draftId);
  const publishedUrl = valueAsString(resultRecord.publishedUrl);
  const scheduleAt = valueAsString(resultRecord.scheduleAt) ?? input.prepared.scheduleAt;
  const actionType = actionTypeForMode(input.prepared.mode, valueAsString(resultRecord.operation));
  const isFailure = status.includes("failed") || status === "error";

  return {
    schemaVersion: 1,
    timestamp: new Date().toISOString(),
    actionType,
    status: isFailure ? "failure" : "success",
    publicationUrl: input.publicationUrl,
    publicationId: null,
    sourceFile: input.prepared.post.filePath,
    title: valueAsString(resultRecord.title) ?? resolvePostTitle(input.prepared.post),
    draftId,
    draftUrl: redactUrl(valueAsString(resultRecord.draftUrl)) ?? undefined,
    sectionName: valueAsString(metadata.section) ?? input.prepared.post.metadata.section,
    sectionId: input.prepared.post.metadata.sectionId,
    slug: input.prepared.post.metadata.slug,
    tags: input.prepared.post.metadata.tags,
    scheduledTimeRequested: scheduleAt,
    scheduledTimeReturned: status === "scheduled" ? scheduleAt : undefined,
    apiResponseIds: {
      draftId,
      postUrl: publishedUrl,
    },
    resultMessage: valueAsString(resultRecord.message) ?? valueAsString(input.result.finalState),
    error: isFailure
      ? {
          message: valueAsString(resultRecord.message) ?? "Workflow failed.",
          body: redactErrorBody(valueAsString(resultRecord.error)),
        }
      : undefined,
  };
}

export function buildDraftWriteRunLog(input: {
  publicationUrl: string;
  prepared: PreparedPost;
  plan: DraftWritePlan;
  result: DraftWriteResult;
  selectorSourceFile?: string | undefined;
}): RunLogArtifact {
  const draftId = input.result.draftId !== undefined ? String(input.result.draftId) : undefined;
  return {
    schemaVersion: 1,
    timestamp: new Date().toISOString(),
    actionType: input.plan.operation === "update" ? "draft.update" : "draft.create",
    status: input.result.status === "failed" ? "failure" : "success",
    publicationUrl: input.publicationUrl,
    publicationId: null,
    sourceFile: input.prepared.post.filePath,
    selectorSourceFile: input.selectorSourceFile,
    title: resolvePostTitle(input.prepared.post),
    draftId,
    draftUrl: redactUrl(input.result.draftUrl) ?? undefined,
    sectionName: input.prepared.post.metadata.section,
    sectionId: input.plan.resolvedSectionId ?? input.prepared.post.metadata.sectionId,
    slug: input.plan.duplicateKey.slug,
    tags: input.prepared.post.metadata.tags,
    apiResponseIds: {
      draftId,
    },
    resultMessage: input.result.message,
    error:
      input.result.status === "failed"
        ? {
            message: input.result.error ?? input.result.message,
            body: redactErrorBody(input.result.error),
          }
        : undefined,
  };
}

export function buildPublishWriteRunLog(input: {
  publicationUrl: string;
  prepared?: PreparedPost | undefined;
  title?: string | undefined;
  plan: PublishWritePlan;
  result: PublishWriteResult;
  selectorSourceFile?: string | undefined;
}): RunLogArtifact {
  return {
    schemaVersion: 1,
    timestamp: new Date().toISOString(),
    actionType: input.plan.operation === "schedule" ? "post.schedule" : "post.publish",
    status: input.result.status === "failed" ? "failure" : "success",
    publicationUrl: input.publicationUrl,
    publicationId: null,
    sourceFile: input.prepared?.post.filePath,
    selectorSourceFile: input.selectorSourceFile,
    title: input.title ?? (input.prepared ? resolvePostTitle(input.prepared.post) : undefined),
    draftId: input.plan.draftId,
    draftUrl: redactUrl(input.plan.draftUrl) ?? undefined,
    sectionName: input.prepared?.post.metadata.section,
    sectionId: input.prepared?.post.metadata.sectionId,
    slug: input.prepared?.post.metadata.slug ?? input.plan.existingDraft?.slug,
    tags: input.prepared?.post.metadata.tags,
    scheduledTimeRequested: input.plan.scheduleAt,
    scheduledTimeReturned: input.result.status === "scheduled" ? input.plan.scheduleAt : undefined,
    apiResponseIds: {
      draftId: input.plan.draftId,
      postUrl: input.result.postUrl,
    },
    resultMessage: input.result.message,
    error:
      input.result.status === "failed"
        ? {
            message: input.result.error ?? input.result.message,
            body: redactErrorBody(input.result.error),
          }
        : undefined,
  };
}

export function buildNoteWriteRunLog(input: {
  publicationUrl: string;
  plan: NoteWritePlan;
  result: NoteWriteResult;
  title?: string | undefined;
  sourceFile?: string | undefined;
  selectorSourceFile?: string | undefined;
}): RunLogArtifact {
  return {
    schemaVersion: 1,
    timestamp: new Date().toISOString(),
    actionType: input.plan.operation === "schedule" ? "note.schedule" : "note.create",
    status: input.result.status === "failed" ? "failure" : "success",
    publicationUrl: input.publicationUrl,
    publicationId: null,
    sourceFile: input.sourceFile,
    selectorSourceFile: input.selectorSourceFile,
    title: input.title,
    scheduledTimeRequested: input.plan.scheduledAt,
    scheduledTimeReturned:
      input.result.status === "scheduled" ? input.result.scheduledAt : undefined,
    apiResponseIds: {
      noteId: input.result.noteId,
      postUrl: input.plan.postUrl,
    },
    resultMessage: input.result.message,
    error:
      input.result.status === "failed"
        ? {
            message: input.result.error ?? input.result.message,
            body: redactErrorBody(input.result.error),
          }
        : undefined,
  };
}

function actionTypeForMode(mode: PreparedPost["mode"], operation?: string): RunLogActionType {
  if (mode === "publish") return "post.publish";
  if (mode === "schedule") return "post.schedule";
  return operation === "update" ? "draft.update" : "draft.create";
}

function safeFilePart(value: string): string {
  return value.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "");
}

function valueAsString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function redactErrorBody(value: string | undefined): string | null {
  if (!value) {
    return null;
  }

  return value
    .replace(/(cookie|authorization|password|token)=([^;]+)/gi, "$1=[REDACTED]")
    .replace(/(Bearer|Basic)\s+[A-Za-z0-9._~+/=-]+/gi, "$1 [REDACTED]");
}

function redactDiagnostics(values: string[] | undefined): string[] | undefined {
  if (!values?.length) return undefined;
  return values.map((value) =>
    value
      .replace(/(cookie|authorization|password|token)\s*[:=]\s*([^;&\n]+)/gi, "$1=[REDACTED]")
      .replace(
        /(session|sid|auth|access[_-]?token|refresh[_-]?token)\s*[:=]\s*([^;&\n]+)/gi,
        "$1=[REDACTED]",
      )
      .replace(/(Bearer|Basic)\s+[A-Za-z0-9._~+/=-]+/gi, "$1 [REDACTED]"),
  );
}
