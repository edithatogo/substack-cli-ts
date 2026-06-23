import type { ParsedPost } from "../types.js";
import type { ApiAuthMaterial } from "./auth.js";
import type { FetchLike } from "./client.js";
import { apiHeaders, requestWrite } from "./client.js";
import type { DraftMapping, SaveDraftMappingInput } from "./draft-mappings.js";
import { saveDraftMapping } from "./draft-mappings.js";
import type { DraftSectionResolutionReport } from "./draft-section.js";
import type { MediaUploadOptions } from "./media-upload.js";
import { uploadDraftMedia } from "./media-upload.js";
import { buildDraftWriteRequestBody, buildSubstackDraftPayload } from "./payload.js";

export interface DraftWriteResult {
  status: "created" | "updated" | "failed";
  operation: "create" | "update";
  method: "POST" | "PUT";
  endpoint: string;
  draftUrl: string;
  draftId?: number | undefined;
  message: string;
  existingDraft?: DraftMapping | undefined;
  mappingSaved?: DraftMapping | undefined;
  error?: string | undefined;
  mediaUploaded?: number | undefined;
  mediaFailed?: number | undefined;
  retryAttempts?: number | undefined;
  mediaDetails?:
    | Array<{ source: string; url: string | undefined; error: string | undefined }>
    | undefined;
}

export interface DraftWritePlan {
  status: "planned";
  operation: "create" | "update";
  method: "POST" | "PUT";
  endpoint: string;
  draftUrl: string;
  payload: ReturnType<typeof buildSubstackDraftPayload>;
  sectionResolutionApplied: boolean;
  resolvedSectionId?: number | undefined;
  duplicateKey: {
    title: string;
    slug?: string | undefined;
    sourceFile: string;
  };
  existingDraft?: DraftMapping | undefined;
  uploadEndpoint?: string | undefined;
  uploadResponseField?: string | undefined;
  message: string;
}

export function planCreateDraft(
  post: ParsedPost,
  publicationUrl: string,
  existingDraft?: DraftMapping | null,
  sectionResolution?: DraftSectionResolutionReport | null,
  mediaUploadOptions?: MediaUploadOptions,
): DraftWritePlan {
  const plannedPost = applyResolvedSectionId(post, sectionResolution);
  const payload = buildSubstackDraftPayload(plannedPost);
  const draftId = existingDraft?.draftId;
  const endpoint = new URL(
    draftId ? `/api/v1/drafts/${encodeURIComponent(draftId)}` : "/api/v1/drafts",
    publicationUrl,
  ).toString();
  const draftUrl =
    existingDraft?.draftUrl ??
    new URL(
      draftId ? `/publish/post/${encodeURIComponent(draftId)}` : "/publish/post",
      publicationUrl,
    ).toString();

  return {
    status: "planned",
    operation: draftId ? "update" : "create",
    method: draftId ? "PUT" : "POST",
    endpoint,
    draftUrl,
    payload,
    sectionResolutionApplied: plannedPost !== post,
    resolvedSectionId: plannedPost.metadata.sectionId,
    duplicateKey: {
      title: payload.title,
      slug: payload.slug,
      sourceFile: post.filePath,
    },
    existingDraft: existingDraft ?? undefined,
    uploadEndpoint: mediaUploadOptions?.uploadEndpoint,
    uploadResponseField: mediaUploadOptions?.responseUrlField,
    message:
      "Draft write plan built locally. Use --live to execute the write against the Substack API.",
  };
}

export async function executeDraftWrite(
  plan: DraftWritePlan,
  material: ApiAuthMaterial,
  userId: number,
  fetchImpl: FetchLike,
): Promise<DraftWriteResult> {
  const headers = apiHeaders(material);

  // Upload local images before building the request body
  const media = await uploadDraftMedia(
    plan.duplicateKey.sourceFile,
    plan.payload.body,
    material.publicationUrl,
    headers,
    fetchImpl,
    {
      uploadEndpoint: plan.uploadEndpoint,
      responseUrlField: plan.uploadResponseField,
    },
  );

  const updatedPayload = { ...plan.payload, body: media.document };

  // For updates, use the server's last known updated_at for optimistic concurrency
  const serverUpdatedAt = plan.existingDraft?.serverUpdatedAt;
  const requestBody = buildDraftWriteRequestBody(
    updatedPayload,
    userId,
    plan.operation,
    serverUpdatedAt,
  );

  const response = await requestWrite(fetchImpl, plan.endpoint, plan.method, headers, requestBody);

  if (response.status === 0) {
    return {
      status: "failed",
      operation: plan.operation,
      method: plan.method,
      endpoint: plan.endpoint,
      draftUrl: plan.draftUrl,
      message: "Network error: failed to reach Substack.",
      existingDraft: plan.existingDraft,
      error: "Network error",
      mediaUploaded: media.report.uploaded,
      mediaFailed: media.report.failed,
      retryAttempts: response.retryAttempts,
      mediaDetails: media.report.assets.map((a) => ({
        source: a.asset.source,
        url: a.result.status === "ok" ? a.result.url : undefined,
        error: a.result.status === "failed" ? a.result.error : undefined,
      })),
    };
  }

  if (response.status === 409) {
    return {
      status: "failed",
      operation: plan.operation,
      method: plan.method,
      endpoint: plan.endpoint,
      draftUrl: plan.draftUrl,
      message:
        "Substack returned HTTP 409 (Conflict). The draft was modified on another session. Use `api draft fetch` to get the current state, then retry.",
      existingDraft: plan.existingDraft,
      error: "HTTP 409 (optimistic concurrency conflict)",
      mediaUploaded: media.report.uploaded,
      mediaFailed: media.report.failed,
      retryAttempts: response.retryAttempts,
      mediaDetails: media.report.assets.map((a) => ({
        source: a.asset.source,
        url: a.result.status === "ok" ? a.result.url : undefined,
        error: a.result.status === "failed" ? a.result.error : undefined,
      })),
    };
  }

  if (response.status >= 400) {
    return {
      status: "failed",
      operation: plan.operation,
      method: plan.method,
      endpoint: plan.endpoint,
      draftUrl: plan.draftUrl,
      message: `Substack returned HTTP ${response.status}.`,
      existingDraft: plan.existingDraft,
      error: `HTTP ${response.status}`,
      mediaUploaded: media.report.uploaded,
      mediaFailed: media.report.failed,
      retryAttempts: response.retryAttempts,
      mediaDetails: media.report.assets.map((a) => ({
        source: a.asset.source,
        url: a.result.status === "ok" ? a.result.url : undefined,
        error: a.result.status === "failed" ? a.result.error : undefined,
      })),
    };
  }

  const draftId = response.draftId;
  if (!draftId) {
    return {
      status: "failed",
      operation: plan.operation,
      method: plan.method,
      endpoint: plan.endpoint,
      draftUrl: plan.draftUrl,
      message: "Substack responded 200 but no draft ID was found in the response.",
      existingDraft: plan.existingDraft,
      error: "Missing draft ID",
      mediaUploaded: media.report.uploaded,
      mediaFailed: media.report.failed,
      retryAttempts: response.retryAttempts,
      mediaDetails: media.report.assets.map((a) => ({
        source: a.asset.source,
        url: a.result.status === "ok" ? a.result.url : undefined,
        error: a.result.status === "failed" ? a.result.error : undefined,
      })),
    };
  }

  // Extract server's updated_at from response body for optimistic concurrency
  const bodyRecord = response.body as Record<string, unknown> | undefined;
  const responseServerUpdatedAt =
    typeof bodyRecord?.draft_updated_at === "string" ? bodyRecord.draft_updated_at : undefined;

  // Persist the draft mapping
  const mappingInput: SaveDraftMappingInput = {
    sourceFile: plan.duplicateKey.sourceFile,
    publicationUrl: material.publicationUrl,
    draftId,
    draftUrl: response.draftUrl ?? plan.draftUrl,
    title: plan.duplicateKey.title,
    slug: plan.duplicateKey.slug,
    serverUpdatedAt: responseServerUpdatedAt,
  };

  const mappingSaved = await saveDraftMapping(mappingInput);

  return {
    status: plan.operation === "create" ? "created" : "updated",
    operation: plan.operation,
    method: plan.method,
    endpoint: plan.endpoint,
    draftUrl: response.draftUrl ?? plan.draftUrl,
    draftId,
    message: `Draft ${plan.operation === "create" ? "created" : "updated"} (ID: ${draftId}).`,
    existingDraft: plan.existingDraft,
    mappingSaved,
    mediaUploaded: media.report.uploaded,
    mediaFailed: media.report.failed,
    retryAttempts: response.retryAttempts,
    mediaDetails: media.report.assets.map((a) => ({
      source: a.asset.source,
      url: a.result.status === "ok" ? a.result.url : undefined,
      error: a.result.status === "failed" ? a.result.error : undefined,
    })),
  };
}

function applyResolvedSectionId(
  post: ParsedPost,
  sectionResolution: DraftSectionResolutionReport | null | undefined,
): ParsedPost {
  if (sectionResolution?.status !== "resolved" || post.metadata.sectionId !== undefined) {
    return post;
  }

  return {
    ...post,
    metadata: {
      ...post.metadata,
      sectionId: sectionResolution.resolvedSection?.id,
    },
  };
}
