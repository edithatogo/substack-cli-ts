import { readFile } from "node:fs/promises";
import { generateJSON } from "@tiptap/html";
import StarterKit from "@tiptap/starter-kit";
import { marked } from "marked";
import type { ParsedPost, ProseMirrorNode } from "../types.js";
import { getTiptapExtensions } from "./extensions.js";
import { parseFrontmatter } from "./frontmatter.js";
import { buildMediaManifest } from "./media.js";
import { validateProseMirrorDocument } from "./schema.js";

export async function parseMarkdownFile(filePath: string): Promise<ParsedPost> {
  const markdown = await readFile(filePath, "utf8");
  return parseMarkdownString(markdown, filePath);
}

export async function parseMarkdownString(
  markdown: string,
  filePath = "<memory>",
): Promise<ParsedPost> {
  const { metadata, body, warnings } = parseFrontmatter(markdown);
  const normalized = normalizeMarkdownImages(normalizeSubstackShortcodes(body));
  const html = String(await marked.parse(normalized, { gfm: true }));
  const document = htmlToProseMirrorJson(html);
  const media = buildMediaManifest(document, filePath);
  const parserWarnings = lintAdjacentRiskyBlocks(document);

  return {
    filePath,
    metadata,
    markdown: body,
    html,
    document,
    media,
    warnings: [...warnings, ...parserWarnings],
  };
}

export function htmlToProseMirrorJson(html: string): ProseMirrorNode {
  const document = generateJSON(html, [StarterKit, ...getTiptapExtensions()]);
  return validateProseMirrorDocument(document);
}

function normalizeSubstackShortcodes(markdown: string): string {
  return markdown
    .replace(/^\s*(?:<!--\s*paywall\s*-->|{{\s*paywall\s*}})\s*$/gim, paywallHtml())
    .replace(/^\s*{{\s*subscribe(?::([^}]+))?\s*}}\s*$/gim, (_match, label: string | undefined) =>
      subscribeHtml(
        typeof label === "string" && label.trim().length > 0 ? label.trim() : "Subscribe",
      ),
    )
    .replace(
      /^\s*{{\s*(youtube|embed|podcast)\s*[:|]\s*(https?:\/\/\S+?)\s*}}\s*$/gim,
      (_match, type: string, url: string) => embedHtml(type.toLowerCase(), url.trim()),
    );
}

function normalizeMarkdownImages(markdown: string): string {
  return markdown.replace(
    /!\[([^\]]*)\]\((\S+?)(?:\s+"([^"]*)")?\)/g,
    (_match, alt: string, src: string, title: string | undefined) => {
      const titleAttribute = title === undefined ? "" : ` title="${escapeHtml(title)}"`;
      return `<img src="${escapeHtml(src)}" alt="${escapeHtml(alt)}"${titleAttribute}>`;
    },
  );
}

function embedHtml(type: string, url: string): string {
  const escapedUrl = escapeHtml(url);
  return `<div data-substack-cli-node="embed" data-embed-type="${escapeHtml(type)}" data-url="${escapedUrl}"></div>`;
}

function paywallHtml(): string {
  return '<div data-substack-cli-node="paywall"></div>';
}

function subscribeHtml(label: string): string {
  return `<div data-substack-cli-node="subscribe-widget" data-label="${escapeHtml(label)}"></div>`;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

interface BlockSummary {
  kind: "image" | "custom" | "horizontalRule" | "content";
  type: string;
}

const riskyCustomNodeTypes = new Set(["embedNode", "paywallDivider", "subscribeWidget"]);

function lintAdjacentRiskyBlocks(document: ProseMirrorNode): string[] {
  const warnings: string[] = [];
  const blocks = (document.content ?? []).map(summarizeTopLevelBlock);

  for (let index = 0; index < blocks.length - 1; index += 1) {
    const current = blocks[index]!;
    const next = blocks[index + 1]!;

    if (!isRiskyAdjacency(current, next)) continue;

    warnings.push(
      `Adjacent ${describeBlock(current)} and ${describeBlock(next)} blocks at positions ${index + 1}-${index + 2} may render unpredictably in Substack; add a paragraph or spacer between them before publishing.`,
    );
  }

  return warnings;
}

function summarizeTopLevelBlock(node: ProseMirrorNode): BlockSummary {
  if (node.type === "image") return { kind: "image", type: node.type };
  if (node.type === "horizontalRule") return { kind: "horizontalRule", type: node.type };
  if (riskyCustomNodeTypes.has(node.type)) return { kind: "custom", type: node.type };

  return { kind: "content", type: node.type };
}

function isRiskyAdjacency(left: BlockSummary, right: BlockSummary): boolean {
  const riskyKinds = new Set<BlockSummary["kind"]>(["image", "custom", "horizontalRule"]);

  return (
    riskyKinds.has(left.kind) &&
    riskyKinds.has(right.kind) &&
    !(left.kind === "custom" && right.kind === "custom")
  );
}

function describeBlock(block: BlockSummary): string {
  if (block.kind === "custom") return `custom ${block.type}`;
  return block.type;
}
