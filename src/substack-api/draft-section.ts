import type { ParsedPost } from "../types.js";
import type { ApiReadInventory, SectionSummary } from "./read-model.js";

export type DraftSectionResolutionStatus =
  | "resolved"
  | "ambiguous"
  | "unresolved"
  | "inventory-unavailable";

export interface DraftSectionCandidate {
  id: number;
  name: string;
  slug: string;
  description?: string | null | undefined;
  score: number;
  reasons: string[];
}

export interface DraftSectionResolutionReport {
  status: DraftSectionResolutionStatus;
  sourceFile: string;
  publicationUrl: string;
  requestedSection?: string | undefined;
  requestedSectionId?: number | undefined;
  resolvedSection?: DraftSectionCandidate | undefined;
  candidateCount: number;
  candidates: DraftSectionCandidate[];
  note: string;
}

export interface DraftSectionResolutionInput {
  post: ParsedPost;
  inventory: ApiReadInventory;
}

export function buildDraftSectionResolutionReport(
  input: DraftSectionResolutionInput,
): DraftSectionResolutionReport {
  if (input.inventory.status !== "ok") {
    return {
      status: "inventory-unavailable",
      sourceFile: input.post.filePath,
      publicationUrl: "",
      requestedSection: input.post.metadata.section,
      requestedSectionId: input.post.metadata.sectionId,
      candidateCount: 0,
      candidates: [],
      note: "The read-only inventory was not available, so section resolution could not run.",
    };
  }

  const requestedSection = input.post.metadata.section;
  const requestedSectionId = input.post.metadata.sectionId;
  const candidates = scoreSections(
    input.inventory.sections ?? [],
    requestedSection,
    requestedSectionId,
  ).sort((left, right) => right.score - left.score || left.name.localeCompare(right.name));

  return {
    status:
      candidates.length === 1 ? "resolved" : candidates.length > 1 ? "ambiguous" : "unresolved",
    sourceFile: input.post.filePath,
    publicationUrl: input.inventory.configuredPublication?.subdomain
      ? `https://${input.inventory.configuredPublication.subdomain}.substack.com/`
      : "",
    requestedSection,
    requestedSectionId,
    resolvedSection: candidates[0],
    candidateCount: candidates.length,
    candidates,
    note: "This lookup maps draft section metadata to the current read inventory without touching live draft endpoints.",
  };
}

function scoreSections(
  sections: SectionSummary[],
  requestedSection: string | undefined,
  requestedSectionId: number | undefined,
): DraftSectionCandidate[] {
  const normalizedRequestedSection = normalizeText(requestedSection ?? "");
  const candidates: DraftSectionCandidate[] = [];

  for (const section of sections) {
    let score = 0;
    const reasons: string[] = [];

    if (requestedSectionId !== undefined && section.id === requestedSectionId) {
      score = 100;
      reasons.push("Section ID matches the requested section ID exactly.");
    }

    const normalizedName = normalizeText(section.name);
    const normalizedSlug = normalizeText(section.slug);

    if (normalizedRequestedSection && normalizedName === normalizedRequestedSection) {
      score = Math.max(score, 95);
      reasons.push("Section name matches the requested section exactly.");
    }

    if (normalizedRequestedSection && normalizedSlug === normalizedRequestedSection) {
      score = Math.max(score, 97);
      reasons.push("Section slug matches the requested section exactly.");
    }

    if (
      normalizedRequestedSection &&
      (normalizedName.includes(normalizedRequestedSection) ||
        normalizedSlug.includes(normalizedRequestedSection))
    ) {
      score = Math.max(score, 75);
      reasons.push("Section name or slug contains the requested section.");
    }

    if (score === 0) {
      continue;
    }

    candidates.push({
      id: section.id,
      name: section.name,
      slug: section.slug,
      description: section.description,
      score,
      reasons,
    });
  }

  return candidates;
}

function normalizeText(value: string): string {
  return value.trim().toLowerCase().replaceAll(/\s+/g, " ");
}
