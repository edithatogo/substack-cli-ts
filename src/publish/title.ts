import { basename, extname } from "node:path";
import type { ParsedPost, ProseMirrorNode } from "../types.js";

export function resolvePostTitle(post: ParsedPost): string {
  if (post.metadata.title) {
    return post.metadata.title;
  }

  const heading = findFirstHeadingText(post.document);
  if (heading) {
    return heading;
  }

  return basename(post.filePath, extname(post.filePath));
}

function findFirstHeadingText(node: ProseMirrorNode): string | null {
  if (node.type === "heading") {
    return collectText(node).trim() || null;
  }

  for (const child of node.content ?? []) {
    const heading = findFirstHeadingText(child);
    if (heading) {
      return heading;
    }
  }

  return null;
}

function collectText(node: ProseMirrorNode): string {
  const ownText = node.text ?? "";
  const childText = (node.content ?? []).map(collectText).join("");
  return `${ownText}${childText}`;
}
