import { access, readFile } from "node:fs/promises";
import { join } from "node:path";
import { FRONTIER_LAUNCH_CHECKLIST, validateLaunchChecklist } from "./launch-checklist.js";

export interface ReleaseScorecardItem {
  id: string;
  title: string;
  status: "ready" | "blocked" | "owner-gate";
  evidence: string[];
  nextAction?: string | undefined;
}

export interface ReleaseScorecard {
  operation: "release.scorecard";
  status: "ready" | "blocked";
  generatedAt: string;
  localReadiness: ReleaseScorecardItem[];
  externalGates: ReleaseScorecardItem[];
}

export async function buildReleaseScorecard(
  options: { baseDir?: string | undefined } = {},
): Promise<ReleaseScorecard> {
  const baseDir = options.baseDir ?? ".";
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
    await fileItem("api-contract", "docs/api/substack-cli.contract.json", baseDir),
    await fileItem("artifact-schema", "docs/api/substack-cli.schema.json", baseDir),
    await fileItem("strictest-tsconfig", "tsconfig.strictest.json", baseDir),
    await fileItem("hardening-workflow", ".github/workflows/hardening.yml", baseDir),
  ];

  const checklist = validateLaunchChecklist();
  const externalGates: ReleaseScorecardItem[] = FRONTIER_LAUNCH_CHECKLIST.map((item) => ({
    id: item.surface,
    title: item.title,
    status: "owner-gate",
    evidence: item.evidence,
    nextAction: item.ownerGate,
  }));

  const blocked =
    localReadiness.some((item) => item.status === "blocked") || checklist.status === "blocked";
  return {
    operation: "release.scorecard",
    status: blocked ? "blocked" : "ready",
    generatedAt: new Date().toISOString(),
    localReadiness,
    externalGates,
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
