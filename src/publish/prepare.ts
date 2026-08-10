import { parseMarkdownFile } from "../parser/markdown.js";
import type { ParsedPost, PreparedPost, ProseMirrorNode, PublishMode } from "../types.js";
import { resolvePostTitle } from "./title.js";

export interface PreparePostOptions {
  mode?: PublishMode;
  scheduleAt?: string;
}

export async function preparePost(
  filePath: string,
  options: PreparePostOptions = {},
): Promise<PreparedPost> {
  const post = normalizeLeadingMetadata(await parseMarkdownFile(filePath));
  const mode = options.mode ?? "draft";
  const scheduleAt = options.scheduleAt ?? post.metadata.scheduleAt;

  if (mode === "schedule" && !scheduleAt) {
    throw new Error("Scheduling requires --at or scheduleAt front matter.");
  }

  if (mode === "schedule" && scheduleAt && Number.isNaN(Date.parse(scheduleAt))) {
    throw new Error(`Invalid schedule timestamp: ${scheduleAt}`);
  }

  return {
    mode,
    scheduleAt,
    post,
  };
}

function normalizeLeadingMetadata(post: ParsedPost): ParsedPost {
  const title = resolvePostTitle(post);
  let normalized = post;
  const firstBlock = normalized.document.content?.[0];

  const isExplicitTitleBlock =
    Boolean(post.metadata.title) &&
    (firstBlock?.type === "heading" || firstBlock?.type === "paragraph");
  const isFallbackTitleBlock = !post.metadata.title && firstBlock?.type === "heading";
  if (
    (isExplicitTitleBlock || isFallbackTitleBlock) &&
    firstBlock &&
    collectText(firstBlock).trim() === title.trim()
  ) {
    normalized = removeLeadingBlock(
      normalized,
      post.metadata.title ? post.metadata : { ...post.metadata, title },
    );
  }

  const subtitle = normalized.metadata.subtitle?.trim();
  const nextBlock = normalized.document.content?.[0];
  if (
    subtitle &&
    (nextBlock?.type === "paragraph" || nextBlock?.type === "heading") &&
    collectText(nextBlock).trim() === subtitle
  ) {
    normalized = removeLeadingBlock(normalized, normalized.metadata);
  }

  return normalized;
}

function removeLeadingBlock(post: ParsedPost, metadata: ParsedPost["metadata"]): ParsedPost {
  const firstBlock = post.document.content?.[0];
  if (!firstBlock) return post;

  return {
    ...post,
    metadata,
    markdown:
      firstBlock.type === "heading"
        ? stripLeadingMarkdownHeading(post.markdown)
        : stripLeadingMarkdownParagraph(post.markdown),
    html: post.html.replace(/^\s*<(h[1-6]|p)(?:\s[^>]*)?>[\s\S]*?<\/\1>\s*/i, ""),
    document: { ...post.document, content: post.document.content?.slice(1) },
  };
}

function collectText(node: ProseMirrorNode): string {
  return `${node.text ?? ""}${(node.content ?? []).map(collectText).join("")}`;
}

function stripLeadingMarkdownHeading(markdown: string): string {
  const withoutAtx = markdown.replace(
    /^(?:[ \t]*\r?\n)*[ \t]{0,3}#{1,6}[ \t]+[^\r\n]*(?:\r?\n|$)(?:[ \t]*\r?\n)?/,
    "",
  );
  if (withoutAtx !== markdown) return withoutAtx;

  return markdown.replace(
    /^(?:[ \t]*\r?\n)*[^\r\n]+\r?\n[ \t]{0,3}(?:=+|-+)[ \t]*(?:\r?\n|$)(?:[ \t]*\r?\n)?/,
    "",
  );
}

function stripLeadingMarkdownParagraph(markdown: string): string {
  return markdown.replace(/^(?:[ \t]*\r?\n)*(?:[^\r\n]+(?:\r?\n(?![ \t]*\r?$))?)+(?:(?:\r?\n)?[ \t]*\r?\n)?/, "");
}
