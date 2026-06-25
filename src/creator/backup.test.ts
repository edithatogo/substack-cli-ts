import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "vitest";
import {
  buildBackupSnapshotPlan,
  validateBackupSnapshotFile,
  writeBackupSnapshotPlan,
} from "./backup.js";

describe("creator backup plans", () => {
  it("builds redacted backup plans and validates restore checklists", async () => {
    const temp = await mkdtemp(join(tmpdir(), "substack-backup-"));
    try {
      const source = join(temp, "warehouse.json");
      const sourceContent = "{}";
      const snapshot = join(temp, "snapshot.json");
      await writeFile(source, sourceContent);

      const plan = await buildBackupSnapshotPlan({
        snapshotFile: snapshot,
        publicationUrl: "https://private.example/p/account@example.com",
        sources: [source],
      });
      assert.equal(plan.status, "ready");
      assert.match(plan.publicationUrl ?? "", /\[REDACTED_EMAIL\]/);
      assert.equal(plan.sourceManifests[0]?.kind, "file");
      assert.equal(plan.sourceManifests[0]?.sizeBytes, Buffer.byteLength(sourceContent));
      assert.equal(
        plan.sourceManifests[0]?.sha256,
        createHash("sha256").update(sourceContent).digest("hex"),
      );
      assert.equal(
        plan.validations.find((validation) => validation.code === "snapshot-location")?.status,
        "pass",
      );
      assert.ok(plan.manualRestoreChecklist.length >= 3);

      await writeBackupSnapshotPlan(plan, snapshot);
      const validation = await validateBackupSnapshotFile(snapshot);
      assert.equal(validation.status, "ready");

      const nonPrivateUrl = await buildBackupSnapshotPlan({
        snapshotFile: join(temp, "snapshot-public.json"),
        publicationUrl: "https://private.example/p/public",
        sources: [source],
      });
      assert.equal(nonPrivateUrl.publicationUrl, "https://private.example/p/public");

      const privateSource = join(temp, "account@example.com.json");
      await writeFile(privateSource, "{}");
      const privateSourcePlan = await buildBackupSnapshotPlan({
        snapshotFile: join(temp, "snapshot-private-source.json"),
        sources: [privateSource],
      });
      assert.doesNotMatch(
        privateSourcePlan.sourceManifests[0]?.source ?? "",
        /account@example\.com/,
      );
    } finally {
      await rm(temp, { recursive: true, force: true });
    }
  });

  it("blocks missing sources", async () => {
    const plan = await buildBackupSnapshotPlan({
      snapshotFile: "snapshot.json",
      sources: ["missing.json"],
    });
    assert.equal(plan.status, "blocked");
    assert.equal(plan.sourceManifests[0]?.kind, "missing");
    assert.equal(plan.sourceManifests[0]?.sha256, null);
  });

  it("blocks backup plans without any source artifacts", async () => {
    const plan = await buildBackupSnapshotPlan({
      snapshotFile: "snapshot.json",
      publicationUrl: undefined,
      sources: [],
    });

    assert.equal(plan.status, "blocked");
    assert.equal(plan.publicationUrl, null);
    assert.deepEqual(plan.sourceManifests, []);
    assert.ok(plan.validations.some((validation) => validation.code === "source-required"));
    assert.equal(
      plan.validations.find((validation) => validation.code === "snapshot-location")?.status,
      "pass",
    );
  });

  it("records directory sources without recursive hashing", async () => {
    const temp = await mkdtemp(join(tmpdir(), "substack-backup-dir-"));
    try {
      const sourceDir = join(temp, "warehouse");
      await mkdir(sourceDir);
      await writeFile(join(sourceDir, "campaign.json"), "{}");

      const plan = await buildBackupSnapshotPlan({
        snapshotFile: join(temp, "snapshot.json"),
        publicationUrl: undefined,
        sources: [sourceDir],
      });

      assert.equal(plan.status, "ready");
      assert.equal(plan.sourceManifests[0]?.kind, "directory");
      assert.equal(plan.sourceManifests[0]?.sizeBytes, null);
      assert.equal(plan.sourceManifests[0]?.sha256, null);
    } finally {
      await rm(temp, { recursive: true, force: true });
    }
  });

  it("blocks snapshots written inside a source artifact directory", async () => {
    const temp = await mkdtemp(join(tmpdir(), "substack-backup-nested-"));
    try {
      const sourceDir = join(temp, "warehouse");
      await mkdir(sourceDir);

      const plan = await buildBackupSnapshotPlan({
        snapshotFile: join(sourceDir, "snapshot.json"),
        sources: [sourceDir],
      });

      assert.equal(plan.status, "blocked");
      assert.equal(
        plan.validations.find((validation) => validation.code === "snapshot-location")?.status,
        "fail",
      );
    } finally {
      await rm(temp, { recursive: true, force: true });
    }
  });

  it("blocks snapshots that would overwrite a source artifact", async () => {
    const temp = await mkdtemp(join(tmpdir(), "substack-backup-same-path-"));
    try {
      const source = join(temp, "warehouse.json");
      await writeFile(source, "{}");

      const plan = await buildBackupSnapshotPlan({
        snapshotFile: source,
        sources: [source],
      });

      assert.equal(plan.status, "blocked");
      assert.equal(
        plan.validations.find((validation) => validation.code === "snapshot-location")?.status,
        "fail",
      );
    } finally {
      await rm(temp, { recursive: true, force: true });
    }
  });

  it("blocks empty and malformed snapshot plans", async () => {
    const temp = await mkdtemp(join(tmpdir(), "substack-backup-invalid-"));
    try {
      const malformed = join(temp, "malformed.json");
      await writeFile(malformed, "{");
      const unreadable = await validateBackupSnapshotFile(malformed);
      assert.equal(unreadable.status, "blocked");
      assert.equal(unreadable.manualRestoreChecklist.length, 0);

      const incomplete = join(temp, "incomplete.json");
      await writeFile(incomplete, JSON.stringify({ schemaVersion: 1 }));
      const missingChecklist = await validateBackupSnapshotFile(incomplete);
      assert.equal(missingChecklist.status, "blocked");
      assert.ok(
        missingChecklist.validations.some((validation) => validation.code === "restore-checklist"),
      );
      assert.ok(
        missingChecklist.validations.some((validation) => validation.code === "source-manifests"),
      );

      const mismatchedManifests = join(temp, "mismatched-manifests.json");
      await writeFile(
        mismatchedManifests,
        JSON.stringify({
          schemaVersion: 1,
          sources: ["warehouse.json"],
          sourceManifests: [],
          manualRestoreChecklist: [
            "Keep the snapshot outside the repository and dependency directories.",
            "Verify the redacted warehouse JSON/CSV files before restoring anything in Substack.",
            "Recreate drafts from local Markdown files before publishing.",
          ],
        }),
      );
      const mismatched = await validateBackupSnapshotFile(mismatchedManifests);
      assert.equal(mismatched.status, "blocked");
      assert.ok(
        mismatched.validations.some((validation) => validation.code === "source-manifests"),
      );
    } finally {
      await rm(temp, { recursive: true, force: true });
    }
  });
});
