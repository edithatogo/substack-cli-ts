#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const packageJson = JSON.parse(await readFile("package.json", "utf8"));
const version = process.argv[2] ?? packageJson.version;
if (!/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(version)) {
  throw new Error(`Invalid rollback version: ${version}`);
}

const packageSpec = `${packageJson.name}@${version}`;
const plan = {
  schemaVersion: 1,
  mode: "dry-run",
  package: packageJson.name,
  affectedVersion: version,
  lastKnownGood: "OWNER_MUST_SELECT_VERIFIED_VERSION",
  commands: [
    `npm deprecate ${JSON.stringify(packageSpec)} ${JSON.stringify("Withdrawn: use the last known-good or corrected release.")}`,
    `gh release edit ${JSON.stringify(`v${version}`)} --prerelease --notes ${JSON.stringify("Withdrawn: see the repository security/support notice.")}`,
  ],
  prohibitions: ["Do not broadly unpublish an npm release.", "Do not delete provenance or incident evidence."],
  followUp: ["Publish a corrected semver release.", "Update registry listings and support advisory."],
};

const output = resolve("reports/release/rollback-plan.json");
await mkdir(resolve("reports/release"), { recursive: true });
await writeFile(output, `${JSON.stringify(plan, null, 2)}\n`, "utf8");
console.log(JSON.stringify(plan));
