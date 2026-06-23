import type { ParsedPost } from "../types.js";
import {
  buildDraftDuplicateLookupReport,
  type DraftDuplicateLookupReport,
} from "./draft-lookup.js";
import type { DraftMapping } from "./draft-mappings.js";
import {
  buildDraftSectionResolutionReport,
  type DraftSectionResolutionReport,
} from "./draft-section.js";
import { type DraftWritePlan, planCreateDraft } from "./draft-write.js";
import { buildSubstackDraftPayload, validatePayloadCompatibility } from "./payload.js";
import type { ApiReadInventory } from "./read-model.js";

export interface DraftInspectionInput {
  post: ParsedPost;
  publicationUrl: string;
  inventory: ApiReadInventory;
  mappings?: DraftMapping[] | undefined;
  existingDraft?: DraftMapping | null | undefined;
}

export interface DraftInspectionReport {
  status: "ready" | "partial" | "blocked";
  sourceFile: string;
  publicationUrl: string;
  title: string;
  sectionResolutionApplied: boolean;
  resolvedSectionId?: number | undefined;
  compatibility: ReturnType<typeof validatePayloadCompatibility>;
  payload?: ReturnType<typeof buildSubstackDraftPayload> | undefined;
  plan?: DraftWritePlan | undefined;
  section: DraftSectionResolutionReport;
  duplicates: DraftDuplicateLookupReport;
  note: string;
}

export function buildDraftInspectionReport(input: DraftInspectionInput): DraftInspectionReport {
  const compatibility = validatePayloadCompatibility(input.post.document);
  const section = buildDraftSectionResolutionReport({
    post: input.post,
    inventory: input.inventory,
  });
  const duplicates = buildDraftDuplicateLookupReport({
    post: input.post,
    inventory: input.inventory,
    mappings: input.mappings,
  });

  if (!compatibility.ok) {
    return {
      status: "blocked",
      sourceFile: input.post.filePath,
      publicationUrl: input.publicationUrl,
      title: resolveTitle(input.post),
      sectionResolutionApplied: false,
      compatibility,
      section,
      duplicates,
      note: "Draft inspection is blocked because the ProseMirror payload contains unsupported content.",
    };
  }

  const plannedPost = applyResolvedSectionId(input.post, section);
  const payload = buildSubstackDraftPayload(plannedPost);
  const plan = planCreateDraft(plannedPost, input.publicationUrl, input.existingDraft ?? undefined);

  return {
    status:
      section.status === "resolved" && duplicates.status !== "inventory-unavailable"
        ? "ready"
        : "partial",
    sourceFile: input.post.filePath,
    publicationUrl: input.publicationUrl,
    title: payload.title,
    sectionResolutionApplied: plannedPost !== input.post,
    resolvedSectionId: plannedPost.metadata.sectionId,
    compatibility,
    payload,
    plan,
    section,
    duplicates,
    note: "This inspection combines payload validation, section resolution, duplicate lookup, and draft planning without touching live write endpoints.",
  };
}

function resolveTitle(post: ParsedPost): string {
  return post.metadata.title ?? "<untitled>";
}

function applyResolvedSectionId(
  post: ParsedPost,
  section: DraftSectionResolutionReport,
): ParsedPost {
  if (section.status !== "resolved" || post.metadata.sectionId !== undefined) {
    return post;
  }

  return {
    ...post,
    metadata: {
      ...post.metadata,
      sectionId: section.resolvedSection?.id,
    },
  };
}
