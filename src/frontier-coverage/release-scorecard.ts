import { access, readFile } from "node:fs/promises";
import { join } from "node:path";
import {
  FRONTIER_LAUNCH_CHECKLIST,
  type LaunchChecklistItem,
  type LaunchSurface,
  validateLaunchChecklist,
} from "./launch-checklist.js";

export interface ReleaseScorecardItem {
  id: string;
  title: string;
  status: "ready" | "blocked" | "owner-gate";
  evidence: string[];
  nextAction?: string | undefined;
}

export interface ReleaseScorecardExternalGate extends ReleaseScorecardItem {
  id: LaunchSurface;
  status: "owner-gate";
  checks: string[];
  rollback: string;
}

export interface ReleaseScorecardSummary {
  local: {
    ready: number;
    blocked: number;
    total: number;
  };
  external: {
    ownerGates: number;
    missingSurfaces: LaunchSurface[];
    total: number;
  };
}

export interface ReleaseScorecard {
  operation: "release.scorecard";
  status: "ready" | "blocked";
  generatedAt: string;
  localStatus: "ready" | "blocked";
  externalStatus: "owner-gated" | "blocked";
  releaseVerdict: "ready-for-owner-launch" | "blocked-local-readiness";
  summary: ReleaseScorecardSummary;
  localReadiness: ReleaseScorecardItem[];
  externalGates: ReleaseScorecardExternalGate[];
  nextActions: string[];
}

export async function buildReleaseScorecard(
  options: {
    baseDir?: string | undefined;
    launchChecklist?: LaunchChecklistItem[] | undefined;
  } = {},
): Promise<ReleaseScorecard> {
  const baseDir = options.baseDir ?? ".";
  const launchChecklist = options.launchChecklist ?? FRONTIER_LAUNCH_CHECKLIST;
  const packageJson = await readJsonFile(join(baseDir, "package.json"));
  const scripts = asRecord(packageJson.scripts);
  const localReadiness: ReleaseScorecardItem[] = [
    scriptItem("typecheck", scripts),
    scriptItem("typecheck:strictest", scripts),
    scriptItem("test", scripts),
    scriptItem("test:coverage", scripts),
    scriptItem("frontier:drift", scripts),
    scriptItem("audit:prod", scripts),
    scriptItem("scan:secrets", scripts),
    scriptItem("sbom", scripts),
    scriptItem("prepublishOnly", scripts),
    releaseMetadataItem("package-public", packageJson.private === false, "package.json", {
      ready: "Package is marked public.",
      blocked: "Set package.json private to false for npm publication.",
    }),
    releaseMetadataItem(
      "package-bin",
      hasStringRecordEntry(packageJson.bin, "substack-publisher"),
      "package.json",
      {
        ready: "substack-publisher binary is declared.",
        blocked: "Declare the substack-publisher binary in package.json bin.",
      },
    ),
    releaseMetadataItem(
      "package-files",
      packageFilesInclude(packageJson.files, "dist"),
      "package.json",
      {
        ready: "Package files include dist/.",
        blocked: "Include dist/ in package.json files.",
      },
    ),
    releaseMetadataItem(
      "publish-access",
      asRecord(packageJson.publishConfig).access === "public",
      "package.json",
      {
        ready: "npm publishConfig access is public.",
        blocked: "Set publishConfig.access to public.",
      },
    ),
    releaseMetadataItem(
      "package-name",
      packageJson.name === "@edithatogo/substack-publisher",
      "package.json",
      {
        ready: "Registry package name is stable.",
        blocked: "Set package.json name to @edithatogo/substack-publisher.",
      },
    ),
    releaseMetadataItem(
      "mcp-name",
      typeof packageJson.mcpName === "string" && packageJson.mcpName.length > 0,
      "package.json",
      {
        ready: "MCP registry package name is declared.",
        blocked: "Declare package.json mcpName for registry consumers.",
      },
    ),
    releaseMetadataItem("repository-url", hasRepository(packageJson.repository), "package.json", {
      ready: "Repository URL is declared.",
      blocked: "Declare package repository.url for release consumers.",
    }),
    await fileItem("api-contract", "docs/api/substack-cli.contract.json", baseDir),
    await fileItem("artifact-schema", "docs/api/substack-cli.schema.json", baseDir),
    await fileItem("strictest-tsconfig", "tsconfig.strictest.json", baseDir),
    await fileItem("hardening-workflow", ".github/workflows/hardening.yml", baseDir),
    await fileItem("publish-workflow", ".github/workflows/publish.yml", baseDir),
    await fileTextItem(
      "publish-provenance",
      ".github/workflows/publish.yml",
      "npm publish --provenance --access public",
      baseDir,
      {
        ready: "Publish workflow uses npm provenance.",
        blocked: "Publish workflow must run npm publish --provenance --access public.",
      },
    ),
    await filePatternItem(
      "publish-oidc",
      ".github/workflows/publish.yml",
      /id-token:\s*write/,
      baseDir,
      {
        ready: "Publish workflow grants OIDC id-token write.",
        blocked: "Publish workflow needs id-token: write for npm provenance.",
      },
    ),
    await fileItem("release-checklist", "docs/release-checklist.md", baseDir),
    await fileItem("branch-protection", "docs/branch-protection.md", baseDir),
    await fileItem("security-policy", "SECURITY.md", baseDir),
    await fileItem("changelog", "CHANGELOG.md", baseDir),
  ];

  const checklist = validateLaunchChecklist(launchChecklist);
  const externalGates: ReleaseScorecardExternalGate[] = launchChecklist.map((item) => ({
    id: item.surface,
    title: item.title,
    status: "owner-gate",
    evidence: item.evidence,
    nextAction: item.ownerGate,
    checks: item.checks,
    rollback: item.rollback,
  }));

  const localBlocked = localReadiness.filter((item) => item.status === "blocked");
  const localStatus = localBlocked.length === 0 ? "ready" : "blocked";
  const externalStatus = checklist.status === "ready" ? "owner-gated" : "blocked";
  const status = localStatus === "ready" && externalStatus === "owner-gated" ? "ready" : "blocked";
  const nextActions = [
    ...localBlocked.map((item) => `${item.id}: ${item.nextAction}`),
    ...checklist.missing.map((surface) => `launch:${surface}: Add launch checklist coverage.`),
    ...externalGates.map((item) => `${item.id}: ${item.nextAction}`),
  ];

  return {
    operation: "release.scorecard",
    status,
    generatedAt: new Date().toISOString(),
    localStatus,
    externalStatus,
    releaseVerdict: localStatus === "ready" ? "ready-for-owner-launch" : "blocked-local-readiness",
    summary: {
      local: {
        ready: localReadiness.length - localBlocked.length,
        blocked: localBlocked.length,
        total: localReadiness.length,
      },
      external: {
        ownerGates: externalGates.length,
        missingSurfaces: checklist.missing,
        total: externalGates.length + checklist.missing.length,
      },
    },
    localReadiness,
    externalGates,
    nextActions,
  };
}

function scriptItem(name: string, scripts: Record<string, unknown>): ReleaseScorecardItem {
  const exists = typeof scripts[name] === "string";
  return {
    id: `script:${name}`,
    title: `npm run ${name}`,
    status: exists ? "ready" : "blocked",
    evidence: ["package.json"],
    nextAction: exists ? undefined : `Add package script ${name}.`,
  };
}

function releaseMetadataItem(
  id: string,
  ready: boolean,
  evidence: string,
  messages: { ready: string; blocked: string },
): ReleaseScorecardItem {
  return {
    id: `release:${id}`,
    title: messages.ready,
    status: ready ? "ready" : "blocked",
    evidence: [evidence],
    nextAction: ready ? undefined : messages.blocked,
  };
}

async function fileItem(id: string, path: string, baseDir: string): Promise<ReleaseScorecardItem> {
  const exists = await fileExists(join(baseDir, path));
  return {
    id: `file:${id}`,
    title: path,
    status: exists ? "ready" : "blocked",
    evidence: [path],
    nextAction: exists ? undefined : `Generate or document ${path}.`,
  };
}

async function fileTextItem(
  id: string,
  path: string,
  expectedText: string,
  baseDir: string,
  messages: { ready: string; blocked: string },
): Promise<ReleaseScorecardItem> {
  return fileContentItem(id, path, baseDir, messages, (content) => content.includes(expectedText));
}

async function filePatternItem(
  id: string,
  path: string,
  pattern: RegExp,
  baseDir: string,
  messages: { ready: string; blocked: string },
): Promise<ReleaseScorecardItem> {
  return fileContentItem(id, path, baseDir, messages, (content) => pattern.test(content));
}

async function fileContentItem(
  id: string,
  path: string,
  baseDir: string,
  messages: { ready: string; blocked: string },
  predicate: (content: string) => boolean,
): Promise<ReleaseScorecardItem> {
  const fullPath = join(baseDir, path);
  let ready = false;
  try {
    ready = predicate(await readFile(fullPath, "utf8"));
  } catch {
    ready = false;
  }
  return {
    id: `file:${id}`,
    title: ready ? messages.ready : path,
    status: ready ? "ready" : "blocked",
    evidence: [path],
    nextAction: ready ? undefined : messages.blocked,
  };
}

async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function readJsonFile(path: string): Promise<Record<string, unknown>> {
  return JSON.parse(await readFile(path, "utf8")) as Record<string, unknown>;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function packageFilesInclude(value: unknown, expectedDirectory: string): boolean {
  if (!Array.isArray(value)) return false;
  return value.some(
    (entry) =>
      typeof entry === "string" &&
      entry.replace(/^\.\//, "").replace(/\/$/, "") === expectedDirectory,
  );
}

function hasStringRecordEntry(value: unknown, key: string): boolean {
  const record = asRecord(value);
  return typeof record[key] === "string";
}

function hasRepository(value: unknown): boolean {
  return typeof value === "string" || typeof asRecord(value).url === "string";
}
