import { z } from "zod";
import type { PostMetadata } from "../types.js";

const MetadataSchema = z.object({
  title: z.string().optional(),
  subtitle: z.string().optional(),
  slug: z.string().optional(),
  tags: z.union([z.array(z.string()), z.string()]).optional(),
  audience: z.enum(["everyone", "free", "paid", "founding"]).optional(),
  section: z.string().optional(),
  sectionId: z.coerce.number().int().positive().optional(),
  comments: z.enum(["enabled", "disabled", "paid", "free"]).optional(),
  scheduleAt: z.string().optional(),
  shouldSendEmail: z.coerce.boolean().optional(),
});

export interface FrontmatterResult {
  metadata: PostMetadata;
  body: string;
  warnings: string[];
}

export function parseFrontmatter(markdown: string): FrontmatterResult {
  const match = markdown.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);

  if (!match) {
    return {
      metadata: { tags: [] },
      body: markdown,
      warnings: [],
    };
  }

  const raw = parseSimpleYaml(match[1] ?? "");
  const parsed = MetadataSchema.parse(raw);
  const tags = normalizeTags(parsed.tags);

  return {
    metadata: {
      title: parsed.title,
      subtitle: parsed.subtitle,
      slug: parsed.slug,
      tags,
      audience: parsed.audience,
      section: parsed.section,
      sectionId: parsed.sectionId,
      comments: parsed.comments,
      scheduleAt: parsed.scheduleAt,
      shouldSendEmail: parsed.shouldSendEmail,
    },
    body: markdown.slice(match[0].length),
    warnings: [],
  };
}

function parseSimpleYaml(source: string): Record<string, unknown> {
  const output: Record<string, unknown> = {};
  const lines = source.split(/\r?\n/);

  for (let index = 0; index < lines.length; index += 1) {
    const rawLine = lines[index] ?? "";
    const line = rawLine.trim();
    if (!line || line.startsWith("#") || line.startsWith("-")) {
      continue;
    }

    const separator = line.indexOf(":");
    if (separator === -1) {
      continue;
    }

    const key = line.slice(0, separator).trim();
    const value = line.slice(separator + 1).trim();

    if (!value) {
      const blockList = collectBlockList(lines, index + 1);
      output[key] = blockList.length > 0 ? blockList : "";
      continue;
    }

    output[key] = parseScalar(value);
  }

  return output;
}

function collectBlockList(lines: string[], startIndex: number): string[] {
  const items: string[] = [];

  for (let index = startIndex; index < lines.length; index += 1) {
    const rawLine = lines[index] ?? "";
    const trimmed = rawLine.trim();

    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    if (!trimmed.startsWith("-")) {
      break;
    }

    const item = stripQuotes(trimmed.slice(1).trim());
    if (item) {
      items.push(item);
    }
  }

  return items;
}

function normalizeTags(tags: string[] | string | undefined): string[] {
  if (Array.isArray(tags)) {
    return tags.map((tag) => tag.trim()).filter(Boolean);
  }

  if (tags) {
    return tags.split(",").map((tag) => tag.trim()).filter(Boolean);
  }

  return [];
}

function parseScalar(value: string): unknown {
  if (!value) {
    return "";
  }

  if (value.startsWith("[") && value.endsWith("]")) {
    return value
      .slice(1, -1)
      .split(",")
      .map((item) => stripQuotes(item.trim()))
      .filter(Boolean);
  }

  return stripQuotes(value);
}

function stripQuotes(value: string): string {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }

  return value;
}
