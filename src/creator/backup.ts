import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { redact, redactUrl } from "../util/redact.js";

export interface BackupSnapshotPlan {
  schemaVersion: 1;
  status: "ready" | "blocked";
  generatedAt: string;
  snapshotFile: string;
  publicationUrl: string | null;
  sources: string[];
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
  for (const source of input.sources) {
    validations.push(await sourceExists(source));
  }
  if (input.sources.length === 0) {
    validations.push({
      code: "source-required",
      status: "fail" as const,
      message: "At least one local export, campaign, snapshot, or run-log source is required.",
    });
  }

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
