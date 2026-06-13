import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import type { BrowserWorkflowResult } from "./browser-workflow.js";
import type { PreparedPost } from "../types.js";
import { redactUrl } from "../util/redact.js";
import type { DraftWritePlan, DraftWriteResult } from "../substack-api/draft-write.js";
import type { PublishWritePlan, PublishWriteResult } from "../substack-api/publish-write.js";
import { resolvePostTitle } from "./title.js";

export type RunLogActionType = "draft.create" | "draft.update" | "post.publish" | "post.schedule";

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
  };
  resultMessage?: string | undefined;
  error?:
    | {
        message: string;
        body?: string | null | undefined;
      }
    | undefined;
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
