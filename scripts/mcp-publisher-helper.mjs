#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();

const usage = `Usage: node scripts/mcp-publisher-helper.mjs [mode] [options]

Modes:
  verify      Validate local registry metadata and publisher availability. Default.
  dry-run     Validate metadata and print the publish commands without running them.
  help        Validate metadata and show mcp-publisher help when installed.
  publish     Validate metadata, then run mcp-publisher publish. Requires prior login.

Options:
  --manifest <path>      Registry manifest path. Default: registry.server.json
  --publisher <command>  mcp-publisher executable. Default: mcp-publisher
  --json                 Emit a machine-readable summary for verify/dry-run.
  -h, --help             Show this help.
`;

const args = process.argv.slice(2);
let mode = "verify";
let manifestPath = "registry.server.json";
let publisherCommand = "mcp-publisher";
let jsonOutput = false;

for (let index = 0; index < args.length; index += 1) {
  const arg = args[index];
  if (arg === "-h" || arg === "--help") {
    console.log(usage.trimEnd());
    process.exit(0);
  }
  if (arg === "--manifest") {
    manifestPath = readOptionValue(args, index, "--manifest");
    index += 1;
    continue;
  }
  if (arg === "--publisher") {
    publisherCommand = readOptionValue(args, index, "--publisher");
    index += 1;
    continue;
  }
  if (arg === "--json") {
    jsonOutput = true;
    continue;
  }
  if (["verify", "dry-run", "help", "publish"].includes(arg)) {
    mode = arg;
    continue;
  }
  fail(`Unknown argument: ${arg}`);
}

const packageJson = readJson("package.json");
const manifest = readJson(manifestPath);
const checks = verifyManifest(packageJson, manifest, manifestPath);
const publisher = inspectPublisher(publisherCommand);
const commands = buildCommands(publisherCommand, manifestPath);

const summary = {
  manifest: manifestPath,
  registryName: manifest.name,
  packageName: packageJson.name,
  version: manifest.version,
  publisherInstalled: publisher.installed,
  publisherCommand,
  commands,
  checks,
};

if (mode === "help") {
  printSummary(summary);
  if (publisher.installed) {
    runChecked(publisherCommand, ["--help"], { allowFailure: false });
    runChecked(publisherCommand, ["publish", "--help"], { allowFailure: true });
  } else {
    printPublisherInstallHint();
  }
  process.exit(0);
}

if (mode === "publish") {
  printSummary(summary);
  if (!publisher.installed) {
    printPublisherInstallHint();
    process.exit(1);
  }
  console.log("Publishing requires prior registry authentication, for example:");
  console.log(`  ${commands.login}`);
  console.log("");
  runChecked(publisherCommand, ["publish", manifestPath], { allowFailure: false });
  process.exit(0);
}

if (jsonOutput) {
  console.log(JSON.stringify(summary, null, 2));
} else {
  printSummary(summary);
  if (!publisher.installed) {
    printPublisherInstallHint();
  }
  console.log("Next commands:");
  console.log(`  ${commands.login}`);
  console.log(`  ${commands.publish}`);
}

function readJson(path) {
  const fullPath = join(root, path);
  if (!existsSync(fullPath)) {
    fail(`Missing required file: ${path}`);
  }
  try {
    return JSON.parse(readFileSync(fullPath, "utf8").replace(/^\uFEFF/, ""));
  } catch (error) {
    fail(`Could not parse ${path}: ${error.message}`);
  }
}

function verifyManifest(pkg, registry, path) {
  const checks = [];
  const firstPackage = registry.packages?.[0];
  requireCheck(checks, registry.name === "io.github.edithatogo/substack-cli", "registry name matches GitHub namespace");
  requireCheck(checks, registry.transport === "stdio", "registry transport is stdio");
  requireCheck(checks, Array.isArray(registry.packages) && registry.packages.length === 1, "registry has one package");
  requireCheck(checks, firstPackage?.registryType === "npm", "package registry type is npm");
  requireCheck(checks, firstPackage?.identifier === pkg.name, "package identifier matches package.json name");
  requireCheck(checks, firstPackage?.mcpName === registry.name, "package mcpName matches registry name");
  requireCheck(checks, firstPackage?.entrypoint === pkg.main, "package entrypoint matches package.json main");
  requireCheck(checks, firstPackage?.transport === "stdio", "package transport is stdio");
  requireCheck(checks, registry.publisher?.type === "github", "publisher type is github");
  requireCheck(checks, registry.publisher?.owner === "edithatogo", "publisher owner is edithatogo");
  requireCheck(checks, registry.publisher?.repository === "substack-cli-ts", "publisher repository is substack-cli-ts");

  const warnings = [];
  if (pkg.mcpName && pkg.mcpName !== registry.name) {
    warnings.push("package.json mcpName does not match registry name");
  }
  if (!pkg.mcpName) {
    warnings.push("package.json does not define mcpName; confirm this against the installed mcp-publisher version before live publish");
  }
  if (registry.version !== pkg.version) {
    warnings.push("registry version does not match package.json version");
  }
  if (firstPackage && !firstPackage.version) {
    warnings.push("registry package entry does not include a version; current registry schema may require it");
  }

  return { passed: checks, warnings };
}

function requireCheck(checks, condition, label) {
  if (!condition) {
    fail(`Registry metadata check failed: ${label}`);
  }
  checks.push(label);
}

function inspectPublisher(command) {
  const result = spawnSync(command, ["--help"], { encoding: "utf8", stdio: "pipe" });
  return {
    installed: result.status === 0,
    status: result.status,
    error: result.error?.message,
  };
}

function readOptionValue(values, index, flag) {
  const value = values[index + 1];
  if (!value || value.startsWith("-")) {
    fail(`${flag} requires a value.`);
  }
  return value;
}

function buildCommands(command, path) {
  const quotedCommand = shellQuote(command);
  return {
    login: `${quotedCommand} login github`,
    publish: `${quotedCommand} publish ${shellQuote(path)}`,
  };
}

function runChecked(command, commandArgs, { allowFailure }) {
  const result = spawnSync(command, commandArgs, { encoding: "utf8", stdio: "inherit" });
  if (result.status !== 0 && !allowFailure) {
    process.exit(result.status ?? 1);
  }
}

function printSummary(summary) {
  console.log("MCP registry publisher helper");
  console.log(`Manifest: ${summary.manifest}`);
  console.log(`Registry: ${summary.registryName}`);
  console.log(`Package: ${summary.packageName}`);
  console.log(`Version: ${summary.version}`);
  console.log(`mcp-publisher installed: ${summary.publisherInstalled ? "yes" : "no"}`);
  if (summary.checks.warnings.length > 0) {
    console.log("");
    console.log("Warnings:");
    for (const warning of summary.checks.warnings) {
      console.log(`- ${warning}`);
    }
  }
  console.log("");
}

function printPublisherInstallHint() {
  console.log("Install mcp-publisher before live publishing:");
  console.log("  https://github.com/modelcontextprotocol/registry/releases/latest");
  console.log("Then move the binary onto PATH and run the login/publish commands above.");
  console.log("");
}

function shellQuote(value) {
  if (/^[A-Za-z0-9_./:-]+$/.test(value)) {
    return value;
  }
  return `'${value.replaceAll("'", "'\\''")}'`;
}

function fail(message) {
  console.error(message);
  process.exit(1);
}
