import { buildSubstackDraftPayload } from "./payload.js";
import type { ParsedPost } from "../types.js";

export interface DraftWritePlan {
  status: "planned";
  method: "POST";
  endpoint: string;
  draftUrl: string;
  payload: ReturnType<typeof buildSubstackDraftPayload>;
  duplicateKey: {
    title: string;
    slug?: string | undefined;
    sourceFile: string;
  };
  message: string;
}

export function planCreateDraft(
  post: ParsedPost,
  publicationUrl: string,
): DraftWritePlan {
  const payload = buildSubstackDraftPayload(post);
  const endpoint = new URL("/api/v1/drafts", publicationUrl).toString();
  const draftUrl = new URL("/publish/post", publicationUrl).toString();

  return {
    status: "planned",
    method: "POST",
    endpoint,
    draftUrl,
    payload,
    duplicateKey: {
      title: payload.title,
      slug: payload.slug,
      sourceFile: post.filePath,
    },
    message:
      "Draft write plan built locally. Live API creation is disabled until the endpoint contract is confirmed.",
  };
}
