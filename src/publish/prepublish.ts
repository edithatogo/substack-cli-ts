import type { SubstackDraftPayload } from "../substack-api/payload.js";
import {
  buildSubstackDraftPayload,
  validatePayloadCompatibility,
} from "../substack-api/payload.js";
import type { PreparedPost } from "../types.js";
import { resolvePostTitle } from "./title.js";

export interface PrepublishReport {
  status: "ready" | "blocked";
  mode: PreparedPost["mode"];
  filePath: string;
  title: string;
  scheduleAt?: string | undefined;
  warnings: string[];
  compatibility: ReturnType<typeof validatePayloadCompatibility>;
  payload?: SubstackDraftPayload | undefined;
  message: string;
}

export function prepublishPost(prepared: PreparedPost): PrepublishReport {
  const title = resolvePostTitle(prepared.post);
  const compatibility = validatePayloadCompatibility(prepared.post.document);

  if (!compatibility.ok) {
    return {
      status: "blocked",
      mode: prepared.mode,
      filePath: prepared.post.filePath,
      title,
      scheduleAt: prepared.scheduleAt,
      warnings: prepared.post.warnings,
      compatibility,
      message: "Prepublish blocked because the post contains unsupported Substack payload content.",
    };
  }

  return {
    status: "ready",
    mode: prepared.mode,
    filePath: prepared.post.filePath,
    title,
    scheduleAt: prepared.scheduleAt,
    warnings: prepared.post.warnings,
    compatibility,
    payload: buildSubstackDraftPayload(prepared.post),
    message:
      "Prepublish validation passed. The payload is ready for browser publishing or future API transport.",
  };
}
