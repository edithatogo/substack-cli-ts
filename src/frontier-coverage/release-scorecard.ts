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
      hasStringRecordEntry(packageJson.bin, "substack-cli"),
      "package.json",
      {
        ready: "substack-cli binary is declared.",
        blocked: "Declare the substack-cli binary in package.json bin.",
      },
    ),
    releaseMetadataItem(
      "package-files",
      stringArrayIncludes(packageJson.files, "dist/"),
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
      "repository-url",
      typeof asRecord(packageJson.repository).url === "string",
      "package.json",
      {
        ready: "Repository URL is declared.",
        blocked: "Declare package repository.url for release consumers.",
      },
    ),
    await fileItem("api-contract", "docs/api/substack-cli.contract.json", baseDir),
    await fileItem("artifact-schema", "docs/api/substack-cli.schema.json", baseDir),
    await fileItem("strictest-tsconfig", "tsconfig.strictest.json", baseDir),
    await fileItem("hardening-workflow", ".github/workflows/hardening.yml", baseDir),
    await fileItem("publish-workflow", ".github/workflows/publish.yml", baseDir),
    await fileItem("release-checklist", "docs/release-checklist.md", baseDir),
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

function stringArrayIncludes(value: unknown, expected: string): boolean {
  return Array.isArray(value) && value.includes(expected);
}

function hasStringRecordEntry(value: unknown, key: string): boolean {
  const record = asRecord(value);
  return typeof record[key] === "string";
}
