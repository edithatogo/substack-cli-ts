import type { ApiReadInventory, DraftSummary } from "./read-model.js";

export interface DraftIdInspectionReport {
  status: "found" | "missing" | "inventory-unavailable";
  draftId: string;
  publicationUrl: string;
  draft?: DraftSummary | undefined;
  draftUrl?: string | undefined;
  inspectedDraftCount: number;
  hasMore?: boolean | undefined;
  message: string;
}

export function buildDraftIdInspectionReport(input: {
  draftId: string | number;
  publicationUrl: string;
  inventory: ApiReadInventory;
}): DraftIdInspectionReport {
  const draftId = String(input.draftId);

  if (input.inventory.status !== "ok") {
    return {
      status: "inventory-unavailable",
      draftId,
      publicationUrl: input.publicationUrl,
      inspectedDraftCount: 0,
      hasMore: input.inventory.draftHasMore,
      message: input.inventory.message,
    };
  }

  const drafts = input.inventory.drafts ?? [];
  const draft = drafts.find((candidate) => String(candidate.id) === draftId);

  if (!draft) {
    return {
      status: "missing",
      draftId,
      publicationUrl: input.publicationUrl,
      inspectedDraftCount: drafts.length,
      hasMore: input.inventory.draftHasMore,
      message: input.inventory.draftHasMore
        ? `Draft ${draftId} was not found in the fetched draft window; increase --draft-limit and retry.`
        : `Draft ${draftId} was not found in the current draft inventory.`,
    };
  }

  return {
    status: "found",
    draftId,
    publicationUrl: input.publicationUrl,
    draft,
    draftUrl: new URL(
      `/publish/post/${encodeURIComponent(draftId)}`,
      input.publicationUrl,
    ).toString(),
    inspectedDraftCount: drafts.length,
    hasMore: input.inventory.draftHasMore,
    message: `Draft ${draftId} found.`,
  };
}
