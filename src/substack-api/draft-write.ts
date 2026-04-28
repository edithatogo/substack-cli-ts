import { buildSubstackDraftPayload } from "./payload.js";
import type { DraftMapping } from "./draft-mappings.js";
import type { ParsedPost } from "../types.js";

export interface DraftWritePlan {
  status: "planned";
  operation: "create" | "update";
  method: "POST" | "PUT";
  endpoint: string;
  draftUrl: string;
  payload: ReturnType<typeof buildSubstackDraftPayload>;
  duplicateKey: {
    title: string;
    slug?: string | undefined;
    sourceFile: string;
  };
  existingDraft?: DraftMapping | undefined;
  message: string;
}

export function planCreateDraft(
  post: ParsedPost,
  publicationUrl: string,
  existingDraft?: DraftMapping | null,
): DraftWritePlan {
  const payload = buildSubstackDraftPayload(post);
  const draftId = existingDraft?.draftId;
  const endpoint = new URL(
    draftId
      ? `/api/v1/drafts/${encodeURIComponent(draftId)}`
      : "/api/v1/drafts",
    publicationUrl,
  ).toString();
  const draftUrl =
    existingDraft?.draftUrl ??
    new URL(
      draftId
        ? `/publish/post/${encodeURIComponent(draftId)}`
        : "/publish/post",
      publicationUrl,
    ).toString();

  return {
    status: "planned",
    operation: draftId ? "update" : "create",
    method: draftId ? "PUT" : "POST",
    endpoint,
    draftUrl,
    payload,
    duplicateKey: {
      title: payload.title,
      slug: payload.slug,
      sourceFile: post.filePath,
    },
    existingDraft: existingDraft ?? undefined,
    message:
      "Draft write plan built locally. Live API creation is disabled until the endpoint contract is confirmed.",
  };
}
