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
}

export function parseFrontmatter(markdown: string): FrontmatterResult {
  const match = markdown.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);

  if (!match) {
    return {
      metadata: { tags: [] },
      body: markdown,
    };
  }

  const raw = parseSimpleYaml(match[1] ?? "");
  const parsed = MetadataSchema.parse(raw);
  const tags = Array.isArray(parsed.tags)
    ? parsed.tags
    : parsed.tags
      ? parsed.tags
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean)
      : [];

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
  };
}

function parseSimpleYaml(source: string): Record<string, unknown> {
  const output: Record<string, unknown> = {};

  for (const rawLine of source.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }

    const separator = line.indexOf(":");
    if (separator === -1) {
      continue;
    }

    const key = line.slice(0, separator).trim();
    const value = line.slice(separator + 1).trim();
    output[key] = parseScalar(value);
  }

  return output;
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
