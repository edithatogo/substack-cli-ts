import type { ApiAuthMaterial } from "./auth.js";
import type { DraftMapping } from "./draft-mappings.js";
import type { FetchLike } from "./client.js";
import { apiHeaders, requestWrite } from "./client.js";

export interface PublishWritePlan {
  status: "planned";
  operation: "prepublish" | "publish" | "schedule";
  method: "POST";
  endpoint: string;
  draftId: string;
  draftUrl: string;
  scheduleAt?: string | undefined;
  existingDraft?: DraftMapping | undefined;
  message: string;
}

export interface PublishWriteResult {
  status: "prepublish-ok" | "published" | "scheduled" | "failed";
  operation: "prepublish" | "publish" | "schedule";
  method: "POST";
  endpoint: string;
  draftId: string;
  postUrl?: string | undefined;
  message: string;
  existingDraft?: DraftMapping | undefined;
  error?: string | undefined;
}

const PREPUBLISH_PATH = "/api/v1/drafts/{id}/prepublish";
const PUBLISH_PATH = "/api/v1/drafts/{id}/publish";
const SCHEDULE_PATH = "/api/v1/drafts/{id}/schedule";

export function planPublishWrite(
  draftId: string,
  draftUrl: string,
  operation: "prepublish" | "publish" | "schedule",
  publicationUrl: string,
  scheduleAt?: string,
  existingDraft?: DraftMapping | null,
): PublishWritePlan {
  const pathTemplate = operation === "schedule" ? SCHEDULE_PATH : PUBLISH_PATH;
  const path = pathTemplate.replace("{id}", encodeURIComponent(draftId));
  const endpoint = new URL(path, publicationUrl).toString();

  return {
    status: "planned",
    operation,
    method: "POST",
    endpoint,
    draftId,
    draftUrl,
    scheduleAt,
    existingDraft: existingDraft ?? undefined,
    message: `Publish write plan built locally. Endpoint: ${endpoint}. Use --live to execute.`,
  };
}

export async function executePublishWrite(
  plan: PublishWritePlan,
  material: ApiAuthMaterial,
  fetchImpl: FetchLike,
): Promise<PublishWriteResult> {
  const headers = apiHeaders(material);

  const body: Record<string, unknown> = {};

  if (plan.operation === "schedule" && plan.scheduleAt) {
    body.draft_scheduled_at = plan.scheduleAt;
  }

  const response = await requestWrite(fetchImpl, plan.endpoint, "POST", headers, body);

  if (response.status >= 400) {
    return {
      status: "failed",
      operation: plan.operation,
      method: "POST",
      endpoint: plan.endpoint,
      draftId: plan.draftId,
      message: `Substack returned HTTP ${response.status}.`,
      existingDraft: plan.existingDraft,
      error: `HTTP ${response.status}`,
    };
  }

  if (plan.operation === "prepublish") {
    return {
      status: "prepublish-ok",
      operation: "prepublish",
      method: "POST",
      endpoint: plan.endpoint,
      draftId: plan.draftId,
      message: `Prepublish validation passed for draft ${plan.draftId}.`,
      existingDraft: plan.existingDraft,
    };
  }

  const bodyRecord = response.body as Record<string, unknown> | undefined;
  const postUrl =
    typeof bodyRecord?.post_url === "string"
      ? bodyRecord.post_url
      : typeof bodyRecord?.url === "string"
        ? bodyRecord.url
        : typeof bodyRecord?.canonical_url === "string"
          ? bodyRecord.canonical_url
          : response.draftUrl
            ? response.draftUrl.replace("/publish/post/", "/p/")
            : undefined;

  return {
    status: plan.operation === "schedule" ? "scheduled" : "published",
    operation: plan.operation,
    method: "POST",
    endpoint: plan.endpoint,
    draftId: plan.draftId,
    postUrl,
    message: `Draft ${plan.operation === "schedule" ? "scheduled" : "published"} (ID: ${plan.draftId}).`,
    existingDraft: plan.existingDraft,
  };
}
