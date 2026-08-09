#!/usr/bin/env node
import { createHash } from "node:crypto";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const root = process.cwd();
const outputDirectory = resolve(process.argv[3] ?? "reports/release");
const packageJson = JSON.parse(await readFile(resolve(root, "package.json"), "utf8"));
const releaseTag = process.env.RELEASE_TAG ?? `v${packageJson.version}`;

run("node", ["scripts/version-check.mjs", "release", releaseTag]);
await rm(outputDirectory, { recursive: true, force: true });
await mkdir(outputDirectory, { recursive: true });

const packed = run("npm", ["pack", "--json", "--pack-destination", outputDirectory], true);
const packPayload = JSON.parse(packed);
const packResults = Array.isArray(packPayload) ? packPayload : Object.values(packPayload);
if (packResults.length !== 1 || !packResults[0]?.filename) {
  throw new Error("npm pack did not produce exactly one release artifact.");
}
const [packResult] = packResults;

const artifactPath = resolve(outputDirectory, packResult.filename);
const digest = await sha256(artifactPath);
await writeFile(
  resolve(outputDirectory, "SHA256SUMS"),
  `${digest}  ${basename(artifactPath)}\n`,
  "utf8",
);

const cleanRoom = await mkdtemp(join(tmpdir(), "substack-publisher-release-"));
try {
  await writeFile(
    join(cleanRoom, "package.json"),
    `${JSON.stringify({ private: true, type: "module" }, null, 2)}\n`,
    "utf8",
  );
  run("npm", [
    "install",
    "--ignore-scripts",
    "--no-audit",
    "--no-fund",
    "--package-lock=false",
    artifactPath,
  ], false, cleanRoom);
  const installed = JSON.parse(
    await readFile(join(cleanRoom, "node_modules", "@edithatogo", "substack-publisher", "package.json"), "utf8"),
  );
  if (installed.name !== packageJson.name || installed.version !== packageJson.version) {
    throw new Error("Clean-room installation metadata differs from the release package.");
  }
  const nonRegistry = Object.entries(installed.dependencies ?? {}).filter(([, spec]) =>
    /^(file:|link:|workspace:|git\+|https?:)/.test(String(spec)),
  );
  if (nonRegistry.length > 0) {
    throw new Error(`Release package contains non-registry dependencies: ${nonRegistry.map(([name]) => name).join(", ")}`);
  }
  run(
    "node",
    [join(cleanRoom, "node_modules", "@edithatogo", "substack-publisher", "dist", "cli.js"), "--version"],
    false,
    cleanRoom,
  );
} finally {
  await rm(cleanRoom, { recursive: true, force: true });
}

const receipt = {
  schemaVersion: 1,
  status: "verified",
  package: packageJson.name,
  version: packageJson.version,
  tag: releaseTag,
  commit: process.env.RELEASE_SHA ?? null,
  artifact: basename(artifactPath),
  sha256: digest,
  size: packResult.size,
  checks: {
    versionSynchronized: true,
    exactArtifactPacked: true,
    cleanRoomInstall: true,
    executableSmoke: true,
    registryDependenciesOnly: true,
  },
};
await writeFile(
  resolve(outputDirectory, "verification-receipt.json"),
  `${JSON.stringify(receipt, null, 2)}\n`,
  "utf8",
);
console.log(JSON.stringify(receipt));

function run(command, args, capture = false, cwd = root) {
  const npmExecPath = process.env.npm_execpath;
  const executable = command === "npm" && npmExecPath ? process.execPath : command;
  const executableArgs = command === "npm" && npmExecPath ? [npmExecPath, ...args] : args;
  const result = spawnSync(executable, executableArgs, {
    cwd,
    encoding: "utf8",
    stdio: capture ? ["ignore", "pipe", "inherit"] : "inherit",
  });
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(" ")} failed with status ${result.status}.`);
  }
  return result.stdout ?? "";
}

async function sha256(path) {
  return createHash("sha256").update(await readFile(path)).digest("hex");
}
