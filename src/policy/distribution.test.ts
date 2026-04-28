import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "vitest";
import { evaluateDistributionPolicy } from "./distribution.js";

describe("evaluateDistributionPolicy", () => {
  it("reports private packages as ready but not distributable", async () => {
    const temp = await mkdtemp(join(tmpdir(), "substack-cli-policy-"));

    try {
      await writeFile(
        join(temp, "package.json"),
        JSON.stringify(
          {
            private: true,
            dependencies: {
              example: "^1.0.0",
            },
          },
          null,
          2,
        ),
        "utf8",
      );

      const report = await evaluateDistributionPolicy(temp);

      assert.equal(report.status, "ok");
      assert.equal(report.privatePackage, true);
      assert.equal(report.distributable, false);
      assert.match(report.message, /marked private/i);
    } finally {
      await rm(temp, { recursive: true, force: true });
    }
  });

  it("warns for public packages without license metadata", async () => {
    const temp = await mkdtemp(join(tmpdir(), "substack-cli-policy-"));

    try {
      await mkdir(join(temp, "src"), { recursive: true });
      await writeFile(
        join(temp, "package.json"),
        JSON.stringify(
          {
            private: false,
            dependencies: {
              "local-package": "file:../local-package",
            },
          },
          null,
          2,
        ),
        "utf8",
      );

      const report = await evaluateDistributionPolicy(temp);

      assert.equal(report.status, "warn");
      assert.equal(report.privatePackage, false);
      assert.equal(report.distributable, true);
      assert.deepEqual(report.nonRegistryDependencies, ["local-package"]);
    } finally {
      await rm(temp, { recursive: true, force: true });
    }
  });
});
