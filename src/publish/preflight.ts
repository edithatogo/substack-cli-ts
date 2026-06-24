import type { ExpectedScheduleItem } from "../substack-api/schedule-reconcile.js";
import { parseScheduleFileContent } from "../substack-api/schedule-reconcile.js";
import type { PreparedPost } from "../types.js";
import { prepublishPost, type PrepublishReport } from "./prepublish.js";
import { resolvePostTitle } from "./title.js";

export type PreflightSeverity = "error" | "warning";

export interface PreflightCheck {
  code: string;
  status: "pass" | "fail" | "warn";
  severity: PreflightSeverity;
  message: string;
}

export interface PreflightReport {
  status: "ready" | "blocked";
  strict: boolean;
  mode: PreparedPost["mode"];
  filePath: string;
  title: string;
  publicationUrl?: string | undefined;
  draftId?: string | undefined;
  scheduleAt?: string | undefined;
  checks: PreflightCheck[];
  prepublish: PrepublishReport;
  payload?: unknown;
  message: string;
}

export interface BuildPreflightOptions {
  publicationUrl?: string | undefined;
  draftId?: string | undefined;
  strict?: boolean | undefined;
  scheduleItems?: ExpectedScheduleItem[] | undefined;
}

export function buildPreflightReport(
  prepared: PreparedPost,
  options: BuildPreflightOptions = {},
): PreflightReport {
  const strict = options.strict ?? false;
  const prepublish = prepublishPost(prepared);
  const title = resolvePostTitle(prepared.post);
  const checks: PreflightCheck[] = [
    requiredCheck(
      "publication-target",
      Boolean(options.publicationUrl),
      "Publication target is explicit.",
      "Set SUBSTACK_PUBLICATION_URL or run `substack-cli config set-publication <url>`.",
    ),
    requiredCheck(
      "title-present",
      title.trim().length > 0,
      "Title is present.",
      "Post title is missing.",
    ),
    optionalCheck(
      "subtitle-present",
      Boolean(prepared.post.metadata.subtitle),
      "Subtitle is present.",
      "Subtitle is missing.",
      strict,
    ),
    optionalCheck(
      "preview-text-present",
      Boolean(prepared.post.metadata.previewText ?? prepared.post.metadata.seoDescription),
      "Preview text is present.",
      "Preview text is missing. Add previewText or seoDescription front matter.",
      strict,
    ),
    requiredCheck(
      "subject-length",
      title.trim().length > 0 && title.trim().length <= 90,
      "Subject length is deliverable.",
      "Subject should be 1-90 characters for email clients.",
    ),
    optionalCheck(
      "preview-text-length",
      isPreviewTextLengthReady(
        prepared.post.metadata.previewText ?? prepared.post.metadata.seoDescription,
      ),
      "Preview text length is deliverable.",
      "Preview text should be 35-160 characters.",
      strict,
    ),
    optionalCheck(
      "slug-present",
      Boolean(prepared.post.metadata.slug),
      "Slug is present.",
      "Slug is missing.",
      strict,
    ),
    requiredCheck(
      "slug-valid",
      !prepared.post.metadata.slug || isValidSlug(prepared.post.metadata.slug),
      "Slug format is valid.",
      "Slug must use lowercase letters, numbers, and hyphens.",
    ),
    optionalCheck(
      "section-resolved",
      Boolean(prepared.post.metadata.section || prepared.post.metadata.sectionId),
      "Section is resolved.",
      "Section is missing.",
      strict,
    ),
    optionalCheck(
      "tags-resolved",
      prepared.post.metadata.tags.length > 0,
      "Tags are present.",
      "Tags are missing.",
      strict,
    ),
    optionalCheck(
      "cover-image-present",
      prepared.post.media.assets.length > 0,
      "At least one media asset is available as a cover candidate.",
      "Cover image is missing.",
      strict,
    ),
    optionalCheck(
      "canonical-url-present",
      Boolean(prepared.post.metadata.canonicalUrl),
      "Canonical URL is present.",
      "Canonical URL is missing.",
      strict,
    ),
    requiredCheck(
      "canonical-url-valid",
      !prepared.post.metadata.canonicalUrl || isValidHttpUrl(prepared.post.metadata.canonicalUrl),
      "Canonical URL is valid.",
      "Canonical URL must be an http or https URL.",
    ),
    optionalCheck(
      "social-image-present",
      Boolean(prepared.post.metadata.socialImage || prepared.post.media.assets.length > 0),
      "Social image is present.",
      "Social image is missing.",
      strict,
    ),
    requiredCheck(
      "social-image-valid",
      !prepared.post.metadata.socialImage ||
        isValidHttpUrl(prepared.post.metadata.socialImage) ||
        !hasUrlScheme(prepared.post.metadata.socialImage),
      "Social image reference is valid.",
      "Social image must be an http URL or local file path.",
    ),
    requiredCheck(
      "image-alt-text",
      prepared.post.media.assets.every((asset) => Boolean(asset.alt?.trim())),
      "All media assets have alt text.",
      "One or more media assets are missing alt text.",
    ),
    requiredCheck(
      "links-http-valid",
      collectMarkdownLinks(prepared.post.markdown).every((url) => isValidHttpUrl(url)),
      "Markdown links are valid http or https URLs.",
      "One or more Markdown links are invalid or non-http URLs.",
    ),
    optionalCheck(
      "utm-present",
      Boolean(
        prepared.post.metadata.utm ||
          prepared.post.metadata.campaign ||
          markdownHasUtm(prepared.post.markdown),
      ),
      "Campaign attribution is present.",
      "No campaign, utm front matter, or UTM-tagged links were detected.",
      strict,
    ),
    optionalCheck(
      "audience-present",
      Boolean(prepared.post.metadata.audience),
      "Audience is explicit.",
      "Audience is missing.",
      strict,
    ),
    requiredCheck(
      "no-editorial-placeholders",
      !hasEditorialPlaceholders(prepared.post.markdown),
      "No editorial placeholders were detected.",
      "Post body contains editorial placeholders or comments.",
    ),
    requiredCheck(
      "payload-printable",
      prepublish.status === "ready",
      "Dry-run payload is printable.",
      "Dry-run payload could not be built.",
    ),
  ];

  checks.push(...scheduleChecks(prepared, options.scheduleItems, options.draftId));

  if (prepublish.status === "blocked") {
    checks.push({
      code: "payload-compatible",
      status: "fail",
      severity: "error",
      message: prepublish.message,
    });
  } else {
    checks.push({
      code: "payload-compatible",
      status: "pass",
      severity: "error",
      message: "Payload is compatible with the Substack draft schema.",
    });
  }

  const errorCount = checks.filter((check) => check.status === "fail").length;
  const status = errorCount > 0 ? "blocked" : "ready";

  return {
    status,
    strict,
    mode: prepared.mode,
    filePath: prepared.post.filePath,
    title,
    publicationUrl: options.publicationUrl,
    draftId: options.draftId,
    scheduleAt: prepared.scheduleAt,
    checks,
    prepublish,
    payload: prepublish.payload,
    message:
      status === "ready"
        ? "Preflight passed. The post is ready for live publish or schedule mutation."
        : `Preflight blocked live mutation with ${errorCount} failed check${errorCount === 1 ? "" : "s"}.`,
  };
}

export function parsePreflightScheduleFile(content: string, sourceName?: string) {
  return parseScheduleFileContent(content, sourceName);
}

function scheduleChecks(
  prepared: PreparedPost,
  scheduleItems: ExpectedScheduleItem[] | undefined,
  draftId: string | undefined,
): PreflightCheck[] {
  if (prepared.mode !== "schedule") return [];

  const scheduleAt = prepared.scheduleAt;
  const parsed = scheduleAt ? Date.parse(scheduleAt) : Number.NaN;
  const checks = [
    requiredCheck(
      "schedule-time-parseable",
      Boolean(scheduleAt) && !Number.isNaN(parsed),
      "Schedule time is parseable.",
      "Schedule time is missing or invalid.",
    ),
    requiredCheck(
      "schedule-time-future",
      !Number.isNaN(parsed) && parsed > Date.now(),
      "Schedule time is in the future.",
      "Schedule time must be in the future.",
    ),
  ];

  if (scheduleItems) {
    const collision = findScheduleCollision(prepared, scheduleItems, draftId);
    checks.push(
      requiredCheck(
        "schedule-time-no-collision",
        !collision,
        "Schedule time does not collide with another planned item.",
        collision
          ? `Schedule time collides with ${collision.sourceFile ?? collision.title ?? "another item"}.`
          : "Schedule time collides with another planned item.",
      ),
    );
  }

  return checks;
}

function findScheduleCollision(
  prepared: PreparedPost,
  scheduleItems: ExpectedScheduleItem[],
  draftId: string | undefined,
): ExpectedScheduleItem | undefined {
  if (!prepared.scheduleAt) return undefined;
  const currentTime = Date.parse(prepared.scheduleAt);
  const currentTitle = normalize(resolvePostTitle(prepared.post));
  const currentFile = prepared.post.filePath;

  return scheduleItems.find((item) => {
    if (Number.isNaN(Date.parse(item.scheduledAt))) return false;
    if (Date.parse(item.scheduledAt) !== currentTime) return false;
    if (draftId && item.draftId === draftId) return false;
    if (item.sourceFile && item.sourceFile === currentFile) return false;
    if (item.title && normalize(item.title) === currentTitle) return false;
    return true;
  });
}

function requiredCheck(
  code: string,
  passed: boolean,
  passMessage: string,
  failMessage: string,
): PreflightCheck {
  return {
    code,
    status: passed ? "pass" : "fail",
    severity: "error",
    message: passed ? passMessage : failMessage,
  };
}

function optionalCheck(
  code: string,
  passed: boolean,
  passMessage: string,
  failMessage: string,
  strict: boolean,
): PreflightCheck {
  return {
    code,
    status: passed ? "pass" : strict ? "fail" : "warn",
    severity: strict ? "error" : "warning",
    message: passed ? passMessage : failMessage,
  };
}

function isValidSlug(value: string): boolean {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value);
}

function isPreviewTextLengthReady(value: string | undefined): boolean {
  if (!value) return false;
  const length = value.trim().length;
  return length >= 35 && length <= 160;
}

function isValidHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function hasUrlScheme(value: string): boolean {
  return /^[a-z][a-z0-9+.-]*:/i.test(value);
}

function collectMarkdownLinks(markdown: string): string[] {
  const links: string[] = [];
  for (const match of markdown.matchAll(/\[[^\]]+\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g)) {
    const url = match[1] ?? "";
    if (!url.startsWith("#") && !url.startsWith("mailto:")) links.push(url);
  }
  for (const match of markdown.matchAll(/<a\s+[^>]*href=["']([^"']+)["']/gi)) {
    const url = match[1] ?? "";
    if (!url.startsWith("#") && !url.startsWith("mailto:")) links.push(url);
  }
  return links;
}

function markdownHasUtm(markdown: string): boolean {
  return /[?&]utm_(source|medium|campaign)=/i.test(markdown);
}

function hasEditorialPlaceholders(markdown: string): boolean {
  const editorialToken = /\b(TODO|FIXME|TK|PLACEHOLDER)\b|\{\{\s*comment[:\s]/i;
  if (editorialToken.test(markdown)) return true;

  const comments = markdown.matchAll(/<!--([\s\S]*?)-->/g);
  for (const comment of comments) {
    if (editorialToken.test(comment[1] ?? "")) return true;
  }

  return false;
}

function normalize(value: string | undefined): string {
  return value?.trim().toLowerCase() ?? "";
}
