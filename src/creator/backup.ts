import { createHash } from "node:crypto";
import { access, mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { dirname, relative, resolve } from "node:path";
import { redact, redactUrl } from "../util/redact.js";

export interface BackupSourceManifest {
  source: string;
  kind: "file" | "directory" | "other" | "missing";
  sizeBytes: number | null;
  sha256: string | null;
}

export interface BackupSnapshotPlan {
  schemaVersion: 1;
  status: "ready" | "blocked";
  generatedAt: string;
  snapshotFile: string;
  publicationUrl: string | null;
  sources: string[];
  sourceManifests: BackupSourceManifest[];
  validations: Array<{ code: string; status: "pass" | "fail"; message: string }>;
  manualRestoreChecklist: string[];
}

export const BACKUP_RESTORE_CHECKLIST = [
  "Keep the snapshot outside the repository and dependency directories.",
  "Verify the redacted warehouse JSON/CSV files before restoring anything in Substack.",
  "Recreate drafts from local Markdown files before publishing.",
  "Restore schedules manually from campaign notes and run-log timestamps.",
  "Use Substack dashboard exports for subscribers/revenue; do not import subscriber CSVs without owner approval.",
  "Capture a new run log after each manual restore action.",
] as const;

export async function buildBackupSnapshotPlan(input: {
  snapshotFile: string;
  publicationUrl?: string | undefined;
  sources: string[];
}): Promise<BackupSnapshotPlan> {
  const validations = [];
  const sourceManifests = [];
  for (const source of input.sources) {
    validations.push(await sourceExists(source));
    sourceManifests.push(await buildSourceManifest(source));
  }
  if (input.sources.length === 0) {
    validations.push({
      code: "source-required",
      status: "fail" as const,
      message: "At least one local export, campaign, snapshot, or run-log source is required.",
    });
  }
  validations.push(validateSnapshotLocation(input.snapshotFile, input.sources));

  const status = validations.some((validation) => validation.status === "fail")
    ? "blocked"
    : "ready";
  return {
    schemaVersion: 1,
    status,
    generatedAt: new Date().toISOString(),
    snapshotFile: input.snapshotFile,
    publicationUrl: redactSensitive(redactUrl(input.publicationUrl) ?? null),
    sources: input.sources.map((source) => redactSensitive(redact(source) ?? source) ?? source),
    sourceManifests,
    validations,
    manualRestoreChecklist: [...BACKUP_RESTORE_CHECKLIST],
  };
}

function redactSensitive(value: string | null): string | null {
  if (!value) return null;
  return value.replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[REDACTED_EMAIL]");
}

export async function writeBackupSnapshotPlan(
  plan: BackupSnapshotPlan,
  outFile: string,
): Promise<BackupSnapshotPlan> {
  await mkdir(dirname(outFile), { recursive: true });
  await writeFile(outFile, `${JSON.stringify(plan, null, 2)}\n`, "utf8");
  return plan;
}

export async function validateBackupSnapshotFile(file: string): Promise<{
  status: "ready" | "blocked";
  snapshotFile: string;
  validations: BackupSnapshotPlan["validations"];
  manualRestoreChecklist: string[];
}> {
  const validations = [];
  let plan: BackupSnapshotPlan | null = null;
  try {
    plan = JSON.parse(await readFile(file, "utf8")) as BackupSnapshotPlan;
    validations.push({
      code: "snapshot-readable",
      status: "pass" as const,
      message: "Snapshot plan is readable JSON.",
    });
  } catch (error) {
    validations.push({
      code: "snapshot-readable",
      status: "fail" as const,
      message: `Snapshot plan is not readable JSON: ${error instanceof Error ? error.message : String(error)}`,
    });
  }
  if (plan?.schemaVersion !== 1) {
    validations.push({
      code: "schema-version",
      status: "fail" as const,
      message: "Snapshot plan schemaVersion must be 1.",
    });
  }
  if (!Array.isArray(plan?.manualRestoreChecklist) || plan.manualRestoreChecklist.length < 3) {
    validations.push({
      code: "restore-checklist",
      status: "fail" as const,
      message: "Snapshot plan must include a manual restore checklist.",
    });
  }
  const sourceCount = Array.isArray(plan?.sources) ? plan.sources.length : 0;
  if (!Array.isArray(plan?.sourceManifests) || plan.sourceManifests.length !== sourceCount) {
    validations.push({
      code: "source-manifests",
      status: "fail" as const,
      message: "Snapshot plan must include one source manifest per source.",
    });
  }
  return {
    status: validations.some((validation) => validation.status === "fail") ? "blocked" : "ready",
    snapshotFile: file,
    validations,
    manualRestoreChecklist: plan?.manualRestoreChecklist ?? [],
  };
}

async function sourceExists(source: string) {
  try {
    await access(source);
    return {
      code: "source-readable",
      status: "pass" as const,
      message: `Source is readable: ${source}`,
    };
  } catch {
    return {
      code: "source-readable",
      status: "fail" as const,
      message: `Source is not readable: ${source}`,
    };
  }
}

async function buildSourceManifest(source: string): Promise<BackupSourceManifest> {
  const redactedSource = redactSensitive(redact(source) ?? source) ?? source;
  try {
    const sourceStat = await stat(source);
    if (sourceStat.isFile()) {
      return {
        source: redactedSource,
        kind: "file",
        sizeBytes: sourceStat.size,
        sha256: await sha256File(source),
      };
    }
    return {
      source: redactedSource,
      kind: sourceStat.isDirectory() ? "directory" : "other",
      sizeBytes: sourceStat.isDirectory() ? null : sourceStat.size,
      sha256: null,
    };
  } catch {
    return {
      source: redactedSource,
      kind: "missing",
      sizeBytes: null,
      sha256: null,
    };
  }
}

async function sha256File(file: string): Promise<string> {
  const hash = createHash("sha256");
  hash.update(await readFile(file));
  return hash.digest("hex");
}

function validateSnapshotLocation(snapshotFile: string, sources: string[]) {
  const snapshotPath = resolve(snapshotFile);
  const nestedSource = sources.find((source) => isPathInside(snapshotPath, resolve(source)));
  if (nestedSource) {
    return {
      code: "snapshot-location",
      status: "fail" as const,
      message: `Snapshot file must not be written inside source artifact: ${nestedSource}`,
    };
  }

  return {
    code: "snapshot-location",
    status: "pass" as const,
    message: "Snapshot file is not nested inside a source artifact.",
  };
}

function isPathInside(candidate: string, parent: string): boolean {
  const path = relative(parent, candidate);
  return path.length > 0 && !path.startsWith("..") && !path.startsWith("/");
}
