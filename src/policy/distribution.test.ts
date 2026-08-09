import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
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

  it("reports public packages with license metadata as ready", async () => {
    const temp = await mkdtemp(join(tmpdir(), "substack-cli-policy-"));

    try {
      await writeFile(
        join(temp, "package.json"),
        JSON.stringify(
          {
            private: false,
            license: "MIT",
            dependencies: {},
          },
          null,
          2,
        ),
        "utf8",
      );
      await writeFile(join(temp, "LICENSE"), "MIT\n", "utf8");

      const report = await evaluateDistributionPolicy(temp);

      assert.equal(report.status, "ok");
      assert.equal(report.license, "MIT");
      assert.equal(report.licenseFilePresent, true);
    } finally {
      await rm(temp, { recursive: true, force: true });
    }
  });

  it("rejects vendored file dependencies even when package files include them", async () => {
    const temp = await mkdtemp(join(tmpdir(), "substack-cli-policy-"));

    try {
      await writeFile(
        join(temp, "package.json"),
        JSON.stringify(
          {
            private: false,
            license: "Apache-2.0",
            files: [
              "dist/",
              "vendor/substack-api/dist/",
              "vendor/substack-api/src/",
              "vendor/substack-api/package.json",
              "vendor/substack-api/README.md",
              "vendor/substack-api/LICENSE",
            ],
            dependencies: {
              "substack-api": "file:vendor/substack-api",
            },
          },
          null,
          2,
        ),
        "utf8",
      );
      await writeFile(join(temp, "LICENSE"), "Apache-2.0\n", "utf8");

      const report = await evaluateDistributionPolicy(temp);

      assert.equal(report.status, "warn");
      assert.deepEqual(report.nonRegistryDependencies, ["substack-api"]);
    } finally {
      await rm(temp, { recursive: true, force: true });
    }
  });
});
