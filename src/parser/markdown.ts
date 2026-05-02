import { readFile } from "node:fs/promises";
import { generateJSON } from "@tiptap/html";
import StarterKit from "@tiptap/starter-kit";
import { marked } from "marked";
import { parseFrontmatter } from "./frontmatter.js";
import { getTiptapExtensions } from "./extensions.js";
import { buildMediaManifest } from "./media.js";
import { validateProseMirrorDocument } from "./schema.js";
import type { ParsedPost, ProseMirrorNode } from "../types.js";

export async function parseMarkdownFile(filePath: string): Promise<ParsedPost> {
  const markdown = await readFile(filePath, "utf8");
  return parseMarkdownString(markdown, filePath);
}

export async function parseMarkdownString(
  markdown: string,
  filePath = "<memory>",
): Promise<ParsedPost> {
  const { metadata, body } = parseFrontmatter(markdown);
  const normalized = normalizeSubstackShortcodes(body);
  const html = String(await marked.parse(normalized, { gfm: true }));
  const document = htmlToProseMirrorJson(html);
  const media = buildMediaManifest(document, filePath);

  return {
    filePath,
    metadata,
    markdown: body,
    html,
    document,
    media,
  };
}

export function htmlToProseMirrorJson(html: string): ProseMirrorNode {
  const document = generateJSON(html, [StarterKit, ...getTiptapExtensions()]);
  return validateProseMirrorDocument(document);
}

function normalizeSubstackShortcodes(markdown: string): string {
  return markdown
    .replace(
      /^\s*(?:<!--\s*paywall\s*-->|{{\s*paywall\s*}})\s*$/gim,
      paywallHtml(),
    )
    .replace(
      /^\s*{{\s*subscribe(?::([^}]+))?\s*}}\s*$/gim,
      (_match, label: string | undefined) =>
        subscribeHtml(
          typeof label === "string" && label.trim().length > 0
            ? label.trim()
            : "Subscribe",
        ),
    )
    .replace(
      /^\s*{{\s*(youtube|embed|podcast)\s*[:|]\s*(https?:\/\/\S+?)\s*}}\s*$/gim,
      (_match, type: string, url: string) =>
        embedHtml(type.toLowerCase(), url.trim()),
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
