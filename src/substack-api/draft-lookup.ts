import { buildSubstackDraftPayload } from "./payload.js";
import type { DraftMapping } from "./draft-mappings.js";
import type { ApiReadInventory, PostSummary, SectionSummary } from "./read-model.js";
import type { ParsedPost } from "../types.js";

export type DraftDuplicateSource = "inventory" | "mapping";

export interface DraftDuplicateCandidate {
  source: DraftDuplicateSource;
  score: number;
  matchType: "slug" | "title" | "section" | "mapping";
  title: string;
  slug?: string | undefined;
  publicationId?: number | undefined;
  sectionId?: number | undefined;
  canonicalUrl?: string | null | undefined;
  draftId?: string | undefined;
  draftUrl?: string | undefined;
  sourceFile?: string | undefined;
  reasons: string[];
}

export interface DraftDuplicateLookupReport {
  status: "matched" | "no-matches" | "inventory-unavailable";
  sourceFile: string;
  publicationUrl: string;
  title: string;
  slug?: string | undefined;
  section?: string | undefined;
  candidateCount: number;
  candidates: DraftDuplicateCandidate[];
  note: string;
}

export interface DraftDuplicateLookupInput {
  post: ParsedPost;
  inventory: ApiReadInventory;
  mappings?: DraftMapping[] | undefined;
}

export function buildDraftDuplicateLookupReport(
  input: DraftDuplicateLookupInput,
): DraftDuplicateLookupReport {
  if (!isOkInventory(input.inventory)) {
    return {
      status: "inventory-unavailable",
      sourceFile: input.post.filePath,
      publicationUrl: "",
      title: buildSubstackDraftPayload(input.post).title,
      slug: input.post.metadata.slug,
      section: input.post.metadata.section,
      candidateCount: 0,
      candidates: [],
      note: "The read-only API inventory was not available, so duplicate lookup could not run.",
    };
  }

  const payload = buildSubstackDraftPayload(input.post);
  const candidates = [
    ...findInventoryCandidates(payload, input.inventory),
    ...findMappingCandidates(payload, input.mappings ?? [], input.post.filePath),
  ].sort((left, right) => {
    if (right.score !== left.score) {
      return right.score - left.score;
    }
    return left.title.localeCompare(right.title);
  });

  return {
    status: candidates.length > 0 ? "matched" : "no-matches",
    sourceFile: input.post.filePath,
    publicationUrl: input.inventory.configuredPublication?.subdomain
      ? `https://${input.inventory.configuredPublication.subdomain}.substack.com/`
      : "",
    title: payload.title,
    slug: payload.slug,
    section: payload.section,
    candidateCount: candidates.length,
    candidates,
    note: "This lookup uses the read-only inventory and local mappings to identify likely duplicates. It does not require draft read endpoints.",
  };
}

function findInventoryCandidates(
  payload: ReturnType<typeof buildSubstackDraftPayload>,
  inventory: ApiReadInventory & { status: "ok" },
): DraftDuplicateCandidate[] {
  const posts = inventory.posts ?? [];
  const sections = inventory.sections ?? [];
  const candidates: DraftDuplicateCandidate[] = [];

  for (const post of posts) {
    candidates.push(...scorePostCandidate(post, sections, payload.title, payload.slug));
  }

  return candidates;
}

function findMappingCandidates(
  payload: ReturnType<typeof buildSubstackDraftPayload>,
  mappings: DraftMapping[],
  sourceFile: string,
): DraftDuplicateCandidate[] {
  const normalizedTitle = normalizeText(payload.title);
  const normalizedSlug = normalizeText(payload.slug ?? "");
  const candidates: DraftDuplicateCandidate[] = [];

  for (const mapping of mappings) {
    const reasons: string[] = [];
    let score = 0;

    if (normalizeText(mapping.title) === normalizedTitle) {
      score = Math.max(score, 94);
      reasons.push("Stored mapping title matches the prepared draft title.");
    }

    if (mapping.slug && normalizeText(mapping.slug) === normalizedSlug) {
      score = Math.max(score, 98);
      reasons.push("Stored mapping slug matches the prepared draft slug.");
    }

    if (normalizeText(mapping.sourceFile) === normalizeText(sourceFile)) {
      score = Math.max(score, 100);
      reasons.push("Stored mapping points to the same source file.");
    }

    if (score === 0) {
      continue;
    }

    candidates.push({
      source: "mapping",
      score,
      matchType: "mapping",
      title: mapping.title,
      slug: mapping.slug,
      draftId: mapping.draftId,
      draftUrl: mapping.draftUrl,
      sourceFile: mapping.sourceFile,
      reasons,
    });
  }

  return candidates;
}

function scorePostCandidate(
  post: PostSummary,
  sections: SectionSummary[],
  title: string,
  slug?: string,
): DraftDuplicateCandidate[] {
  const normalizedTitle = normalizeText(title);
  const normalizedPostTitle = normalizeText(post.title);
  const normalizedSlug = normalizeText(slug ?? "");
  const normalizedPostSlug = normalizeText(post.slug ?? "");
  let candidate: DraftDuplicateCandidate | null = null;

  if (normalizedSlug && normalizedPostSlug === normalizedSlug) {
    candidate = {
      source: "inventory",
      score: 100,
      matchType: "slug",
      title: post.title,
      slug: post.slug,
      publicationId: post.publicationId,
      sectionId: post.sectionId ?? undefined,
      canonicalUrl: post.canonicalUrl,
      reasons: ["Inventory slug matches the prepared draft slug exactly."],
    };
  }

  if (normalizedTitle && normalizedPostTitle === normalizedTitle) {
    if (candidate === null) {
      candidate = {
        source: "inventory",
        score: 92,
        matchType: "title",
        title: post.title,
        slug: post.slug,
        publicationId: post.publicationId,
        sectionId: post.sectionId ?? undefined,
        canonicalUrl: post.canonicalUrl,
        reasons: ["Inventory title matches the prepared draft title exactly."],
      };
    } else {
      candidate.score = Math.min(candidate.score + 2, 100);
      candidate.reasons.push("Inventory title matches the prepared draft title exactly.");
    }
  }

  if (
    normalizedTitle &&
    normalizedPostTitle.includes(normalizedTitle) &&
    normalizedPostTitle !== normalizedTitle &&
    candidate === null
  ) {
    candidate = {
      source: "inventory",
      score: 74,
      matchType: "title",
      title: post.title,
      slug: post.slug,
      publicationId: post.publicationId,
      sectionId: post.sectionId ?? undefined,
      canonicalUrl: post.canonicalUrl,
      reasons: ["Inventory title contains the prepared draft title."],
    };
  }

  const sectionName = sections.find((section) => section.id === post.sectionId)?.name;
  if (sectionName && candidate !== null) {
    candidate.score = Math.min(candidate.score + 5, 100);
    candidate.reasons.push(`Inventory post belongs to the ${sectionName} section.`);
  }

  return candidate === null ? [] : [candidate];
}

function normalizeText(value: string): string {
  return value.trim().toLowerCase().replaceAll(/\s+/g, " ");
}

function isOkInventory(
  inventory: ApiReadInventory,
): inventory is ApiReadInventory & { status: "ok" } {
  return inventory.status === "ok";
}
