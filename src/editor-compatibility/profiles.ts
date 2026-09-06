import { createHash } from "node:crypto";

export type ProfileId = "public-render" | "primary-editor" | "auxiliary-editor";

export interface EditorCapabilityProfile {
  id: ProfileId;
  name: string;
  description: string;
  version: string;
  supportedNodeTypes: ReadonlySet<string>;
  supportedMarkTypes: ReadonlySet<string>;
  schemaFingerprint: string;
}

const PUBLIC_RENDER_NODE_TYPES = [
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
  "tableCell",
  "tableHeader",
  "tableRow",
  "text",
] as const;

const PUBLIC_RENDER_MARK_TYPES = ["bold", "code", "italic", "link", "strike", "underline"] as const;

/**
 * The Primary Draft Editor profile represents Substack's main post editor.
 * Crucially: it supports rich elements, headings, images, and tables, but
 * rejects 'tableHeader' nodes with "RangeError: Unknown node type: tableHeader".
 */
const PRIMARY_EDITOR_NODE_TYPES = [
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
  "tableCell",
  "tableRow",
  "text",
] as const;

const PRIMARY_EDITOR_MARK_TYPES = [
  "bold",
  "code",
  "italic",
  "link",
  "strike",
  "underline",
] as const;

/**
 * The Auxiliary / Restricted Editor profile represents secondary editor mounts
 * (observed during published-post revisions and auxiliary views).
 * It rejects images, headings, blockquotes, lists, and tables with
 * "[tiptap error]: Invalid JSON content".
 */
const AUXILIARY_EDITOR_NODE_TYPES = [
  "doc",
  "hardBreak",
  "paragraph",
  "paywallDivider",
  "subscribeWidget",
  "text",
] as const;

const AUXILIARY_EDITOR_MARK_TYPES = ["bold", "code", "italic", "link", "strike"] as const;

function computeFingerprint(nodes: readonly string[], marks: readonly string[]): string {
  const content = `nodes:${[...nodes].sort().join(",")};marks:${[...marks].sort().join(",")}`;
  return createHash("sha256").update(content).digest("hex").slice(0, 16);
}

export const PUBLIC_RENDER_PROFILE: EditorCapabilityProfile = {
  id: "public-render",
  name: "Public Render Profile",
  description:
    "Standard web reader rendering capabilities supporting full rich prose and GFM tables",
  version: "2026-08-12",
  supportedNodeTypes: new Set(PUBLIC_RENDER_NODE_TYPES),
  supportedMarkTypes: new Set(PUBLIC_RENDER_MARK_TYPES),
  schemaFingerprint: computeFingerprint(PUBLIC_RENDER_NODE_TYPES, PUBLIC_RENDER_MARK_TYPES),
};

export const PRIMARY_EDITOR_PROFILE: EditorCapabilityProfile = {
  id: "primary-editor",
  name: "Primary Draft Editor Profile",
  description: "Substack primary draft editor schema; rejects tableHeader nodes",
  version: "2026-08-12",
  supportedNodeTypes: new Set(PRIMARY_EDITOR_NODE_TYPES),
  supportedMarkTypes: new Set(PRIMARY_EDITOR_MARK_TYPES),
  schemaFingerprint: computeFingerprint(PRIMARY_EDITOR_NODE_TYPES, PRIMARY_EDITOR_MARK_TYPES),
};

export const AUXILIARY_EDITOR_PROFILE: EditorCapabilityProfile = {
  id: "auxiliary-editor",
  name: "Auxiliary Restricted Editor Profile",
  description:
    "Substack secondary editor schema mounted in published revision views; rejects rich blocks",
  version: "2026-08-12",
  supportedNodeTypes: new Set(AUXILIARY_EDITOR_NODE_TYPES),
  supportedMarkTypes: new Set(AUXILIARY_EDITOR_MARK_TYPES),
  schemaFingerprint: computeFingerprint(AUXILIARY_EDITOR_NODE_TYPES, AUXILIARY_EDITOR_MARK_TYPES),
};

export const EDITOR_PROFILES: Record<ProfileId, EditorCapabilityProfile> = {
  "public-render": PUBLIC_RENDER_PROFILE,
  "primary-editor": PRIMARY_EDITOR_PROFILE,
  "auxiliary-editor": AUXILIARY_EDITOR_PROFILE,
};
