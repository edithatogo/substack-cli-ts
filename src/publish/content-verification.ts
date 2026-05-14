import type { ParsedPost, ProseMirrorNode } from "../types.js";

export interface ContentVerificationIssue {
  path: string;
  severity: "error" | "warning";
  message: string;
}

export interface ContentVerificationReport {
  ok: boolean;
  issues: ContentVerificationIssue[];
  totalNodes: number;
  textLength: number;
  hasTitle: boolean;
  hasBody: boolean;
  linkCount: number;
  brokenLinkCount: number;
}

export function verifyDraftContent(post: ParsedPost): ContentVerificationReport {
  const issues: ContentVerificationIssue[] = [];
  const title = post.metadata.title;
  const doc = post.document;
  const body = post.markdown.trim();

  // Check title
  const hasTitle = typeof title === "string" && title.trim().length > 0;
  if (!hasTitle) {
    issues.push({
      path: "metadata.title",
      severity: "error",
      message: "Post has no title. Add a `title` field in front matter.",
    });
  }

  // Check body content
  const bodyContent = doc.content?.filter((n) => n.type !== "heading" || n.attrs?.level !== 1);
  const hasBody = body.length > 0 && (bodyContent?.length ?? 0) > 0 && hasNonEmptyContent(doc);

  if (!hasBody) {
    issues.push({
      path: "markdown",
      severity: "error",
      message: "Post body is empty or contains only whitespace.",
    });
  }

  // Check for broken links
  const linkCount = countLinks(doc);
  const brokenLinkCount = countBrokenLinks(doc);
  if (brokenLinkCount > 0) {
    issues.push({
      path: "document.links",
      severity: "warning",
      message: `${brokenLinkCount} of ${linkCount} link(s) have empty or invalid href.`,
    });
  }

  // Check for potentially lost content (tables that may not render)
  const tableCount = countNodes(doc, "table");
  if (tableCount > 0) {
    issues.push({
      path: "document.tables",
      severity: "warning",
      message: `${tableCount} table(s) detected. Ensure Substack's editor renders tables correctly, or use a table-to-image fallback.`,
    });
  }

  const totalNodes = countAllNodes(doc);
  const textLength = extractText(doc).length;

  return {
    ok: issues.filter((i) => i.severity === "error").length === 0,
    issues,
    totalNodes,
    textLength,
    hasTitle,
    hasBody,
    linkCount,
    brokenLinkCount,
  };
}

function hasNonEmptyContent(node: ProseMirrorNode): boolean {
  if (node.text && node.text.trim().length > 0) return true;
  if (node.content) return node.content.some(hasNonEmptyContent);
  return false;
}

function countLinks(doc: ProseMirrorNode): number {
  let count = 0;
  walk(doc, (node) => {
    if (node.marks?.some((m) => m.type === "link")) count++;
  });
  return count;
}

function countBrokenLinks(doc: ProseMirrorNode): number {
  let count = 0;
  walk(doc, (node) => {
    const linkMark = node.marks?.find((m) => m.type === "link");
    if (linkMark) {
      const href = linkMark.attrs?.href;
      if (!href || typeof href !== "string" || href.trim().length === 0) {
        count++;
      }
    }
  });
  return count;
}

function countNodes(doc: ProseMirrorNode, type: string): number {
  let count = 0;
  walk(doc, (node) => {
    if (node.type === type) count++;
  });
  return count;
}

function countAllNodes(doc: ProseMirrorNode): number {
  let count = 0;
  walk(doc, () => count++);
  return count;
}

function extractText(node: ProseMirrorNode): string {
  const parts: string[] = [];
  walk(node, (n) => {
    if (n.text) parts.push(n.text);
  });
  return parts.join(" ");
}

function walk(node: ProseMirrorNode, visit: (node: ProseMirrorNode) => void): void {
  visit(node);
  node.content?.forEach((child) => walk(child, visit));
}
