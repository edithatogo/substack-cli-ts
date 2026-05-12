import { resolvePostTitle } from "../publish/title.js";
import type { ParsedPost, PostMetadata, ProseMirrorNode } from "../types.js";

export interface SubstackDraftPayload {
  title: string;
  subtitle?: string | undefined;
  slug?: string | undefined;
  body: ProseMirrorNode;
  audience?: PostMetadata["audience"];
  tags: string[];
  section?: string | undefined;
  sectionId?: number | undefined;
  comments?: PostMetadata["comments"];
  shouldSendEmail?: boolean | undefined;
}

export interface PayloadValidationIssue {
  path: string;
  type: string;
  reason: string;
}

export interface PayloadCompatibilityReport {
  ok: boolean;
  nodeTypes: string[];
  markTypes: string[];
  issues: PayloadValidationIssue[];
}

const SUPPORTED_NODE_TYPES = new Set([
  "blockquote",
  "bulletList",
  "codeBlock",
  "doc",
  "embedNode",
  "hardBreak",
  "heading",
  "horizontalRule",
  "image",
  "listItem",
  "orderedList",
  "paragraph",
  "paywallDivider",
  "subscribeWidget",
  "table",
  "tableRow",
  "tableCell",
  "tableHeader",
  "text",
]);

const SUPPORTED_MARK_TYPES = new Set([
  "bold",
  "code",
  "italic",
  "link",
  "strike",
]);

export function buildSubstackDraftPayload(
  post: ParsedPost,
): SubstackDraftPayload {
  const compatibility = validatePayloadCompatibility(post.document);
  if (!compatibility.ok) {
    throw new Error(
      `Unsupported Substack payload content: ${compatibility.issues
        .map((issue) => `${issue.path} ${issue.reason}`)
        .join("; ")}`,
    );
  }

  return {
    title: resolvePostTitle(post),
    subtitle: post.metadata.subtitle,
    slug: post.metadata.slug,
    body: post.document,
    audience: post.metadata.audience,
    tags: post.metadata.tags,
    section: post.metadata.section,
    sectionId: post.metadata.sectionId,
    comments: post.metadata.comments,
    shouldSendEmail: post.metadata.shouldSendEmail,
  };
}

export interface DraftWriteRequestBody extends Record<string, unknown> {
  draft_title: string;
  draft_subtitle: string;
  draft_body: string;
  draft_podcast_url: null;
  draft_podcast_duration: null;
  draft_section_id: number | null;
  section_chosen: boolean;
  draft_bylines: Array<{ id: number; is_guest: boolean }>;
  audience?: string;
  type?: string;
  last_updated_at?: string;
}

export function buildDraftWriteRequestBody(
  payload: SubstackDraftPayload,
  userId: number,
  operation: "create" | "update",
  lastUpdatedAt?: string,
): DraftWriteRequestBody {
  const body: DraftWriteRequestBody = {
    draft_title: payload.title,
    draft_subtitle: payload.subtitle ?? "",
    draft_body: JSON.stringify(payload.body),
    draft_podcast_url: null,
    draft_podcast_duration: null,
    draft_section_id: payload.sectionId ?? null,
    section_chosen: payload.sectionId !== undefined,
    draft_bylines: [{ id: userId, is_guest: false }],
  };

  if (operation === "create") {
    body.audience = payload.audience ?? "everyone";
    body.type = "newsletter";
    if (payload.shouldSendEmail !== undefined) {
      body.should_send_email = payload.shouldSendEmail;
    }
  } else {
    body.last_updated_at = lastUpdatedAt ?? new Date().toISOString();
  }

  return body;
}

export function validatePayloadCompatibility(
  document: ProseMirrorNode,
): PayloadCompatibilityReport {
  const nodeTypes = new Set<string>();
  const markTypes = new Set<string>();
  const issues: PayloadValidationIssue[] = [];

  walk(document, "doc", (node, path) => {
    nodeTypes.add(node.type);
    if (!SUPPORTED_NODE_TYPES.has(node.type)) {
      issues.push({
        path,
        type: node.type,
        reason: "node type is not mapped for Substack API writes",
      });
    }

    for (const mark of node.marks ?? []) {
      markTypes.add(mark.type);
      if (!SUPPORTED_MARK_TYPES.has(mark.type)) {
        issues.push({
          path,
          type: mark.type,
          reason: "mark type is not mapped for Substack API writes",
        });
      }
    }
  });

  return {
    ok: issues.length === 0,
    nodeTypes: [...nodeTypes].sort(),
    markTypes: [...markTypes].sort(),
    issues,
  };
}

function walk(
  node: ProseMirrorNode,
  path: string,
  visit: (node: ProseMirrorNode, path: string) => void,
): void {
  visit(node, path);

  node.content?.forEach((child, index) => {
    walk(child, `${path}.content[${index}]`, visit);
  });
}
