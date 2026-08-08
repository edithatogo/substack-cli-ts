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
  const post = promoteLeadingTitle(await parseMarkdownFile(filePath));
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

function promoteLeadingTitle(post: ParsedPost): ParsedPost {
  const firstBlock = post.document.content?.[0];
  if (firstBlock?.type !== "heading") return post;

  const title = resolvePostTitle(post);
  if (collectText(firstBlock).trim() !== title.trim()) return post;

  return {
    ...post,
    metadata: post.metadata.title ? post.metadata : { ...post.metadata, title },
    markdown: stripLeadingMarkdownHeading(post.markdown),
    html: post.html.replace(/^\s*<h[1-6](?:\s[^>]*)?>[\s\S]*?<\/h[1-6]>\s*/i, ""),
    document: {
      ...post.document,
      content: post.document.content?.slice(1),
    },
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
