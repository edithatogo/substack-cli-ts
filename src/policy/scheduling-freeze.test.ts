import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "vitest";
import { evaluateSchedulingFreezePolicy } from "./scheduling-freeze.js";

describe("evaluateSchedulingFreezePolicy", () => {
  it("allows operations when no policy path is configured", async () => {
    const decision = await evaluateSchedulingFreezePolicy({
      freezePolicyPath: undefined,
      cataloguePath: undefined,
    });

    assert.equal(decision.allowed, true);
    assert.equal(decision.status, "inactive");
    assert.match(decision.reason, /not active/i);
  });

  it("blocks operations when policy status is explicitly active", async () => {
    const tempDir = await mkdtemp(join(tmpdir(), "substack-cli-scheduling-freeze-"));
    try {
      const policyPath = join(tempDir, "policy.json");
      await writeFile(
        policyPath,
        JSON.stringify(
          {
            status: "active",
            reason: "Release window closed",
          },
          null,
          2,
        ),
        "utf8",
      );

      const decision = await evaluateSchedulingFreezePolicy({
        freezePolicyPath: policyPath,
        cataloguePath: undefined,
      });

      assert.equal(decision.allowed, false);
      assert.equal(decision.status, "active");
      assert.equal(decision.policyPath, policyPath);
      assert.equal(decision.reason, "Release window closed");
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it("allows schedule operations when freeze window has expired", async () => {
    const tempDir = await mkdtemp(join(tmpdir(), "substack-cli-scheduling-freeze-"));
    try {
      const policyPath = join(tempDir, "policy.json");
      await writeFile(
        policyPath,
        JSON.stringify(
          {
            active: true,
            freezeUntil: "2020-01-01T00:00:00Z",
          },
          null,
          2,
        ),
        "utf8",
      );

      const decision = await evaluateSchedulingFreezePolicy({
        freezePolicyPath: policyPath,
        cataloguePath: undefined,
        now: new Date("2026-01-01T00:00:00Z"),
      });

      assert.equal(decision.allowed, true);
      assert.equal(decision.status, "inactive");
      assert.match(decision.reason, /not active/i);
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it("fails closed for missing required fields (legacy schema compatibility)", async () => {
    const tempDir = await mkdtemp(join(tmpdir(), "substack-cli-scheduling-freeze-"));
    try {
      const policyPath = join(tempDir, "policy.json");
      await writeFile(policyPath, "{}", "utf8");

      const decision = await evaluateSchedulingFreezePolicy({
        freezePolicyPath: policyPath,
        cataloguePath: undefined,
      });

      assert.equal(decision.allowed, false);
      assert.equal(decision.status, "active");
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it("treats invalid policy JSON as invalid", async () => {
    const tempDir = await mkdtemp(join(tmpdir(), "substack-cli-scheduling-freeze-"));
    try {
      const policyPath = join(tempDir, "policy.json");
      await writeFile(policyPath, "{not valid}", "utf8");

      const decision = await evaluateSchedulingFreezePolicy({
        freezePolicyPath: policyPath,
        cataloguePath: undefined,
      });

      assert.equal(decision.allowed, false);
      assert.equal(decision.status, "invalid");
      assert.match(decision.reason, /not valid JSON/i);
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it("loads a JSON catalogue and reports counts", async () => {
    const tempDir = await mkdtemp(join(tmpdir(), "substack-cli-scheduling-freeze-"));
    try {
      const cataloguePath = join(tempDir, "catalogue.json");
      await writeFile(
        cataloguePath,
        JSON.stringify(
          {
            drafts: [{ id: 1 }, { id: 2 }],
            posts: [{ id: 1 }],
          },
          null,
          2,
        ),
        "utf8",
      );

      const decision = await evaluateSchedulingFreezePolicy({
        cataloguePath,
        freezePolicyPath: undefined,
      });

      assert.equal(decision.allowed, true);
      assert.equal(decision.catalogueSummary?.loaded, true);
      assert.equal(decision.catalogueSummary?.draftCount, 2);
      assert.equal(decision.catalogueSummary?.postCount, 1);
      assert.equal(decision.catalogueSummary?.totalItems, 3);
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it("fails closed when catalogue is not JSON", async () => {
    const tempDir = await mkdtemp(join(tmpdir(), "substack-cli-scheduling-freeze-"));
    try {
      const cataloguePath = join(tempDir, "catalogue.json");
      await writeFile(cataloguePath, "[1,2,", "utf8");

      const decision = await evaluateSchedulingFreezePolicy({
        cataloguePath,
        freezePolicyPath: undefined,
      });

      assert.equal(decision.allowed, false);
      assert.equal(decision.status, "invalid");
      assert.equal(decision.reason, `External catalogue is not valid JSON: ${cataloguePath}`);
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });
});
