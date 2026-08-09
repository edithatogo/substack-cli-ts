import { execFileSync, spawnSync } from "node:child_process";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const root = resolve(import.meta.dirname, "..");
const receiptPath = resolve(root, "reports/performance/receipt.json");

function elapsed(callback) {
  const started = performance.now();
  callback();
  return Math.round((performance.now() - started) * 100) / 100;
}

function runNode(args, env = {}) {
  execFileSync(process.execPath, args, {
    cwd: root,
    env: { ...process.env, ...env },
    encoding: "utf8",
    stdio: "pipe",
    timeout: 60_000,
  });
}

function compiler(args) {
  const tsc = resolve(root, "node_modules/typescript/bin/tsc");
  return elapsed(() => runNode([tsc, ...args]));
}

export async function runBenchmarks() {
  const simulator = await import(pathToFileURL(resolve(root, "src/test/harness/deterministic-simulator.ts")));
  const catalogue = await import(pathToFileURL(resolve(root, "dist/mcp/catalog.js")));
  const results = {
    "typescript.checkers": compiler(["--noEmit", "--checkers", "2"]),
    "typescript.builders": compiler(["--build", "--dry", "--builders", "2"]),
    "typescript.singleThreaded": compiler(["--noEmit", "--singleThreaded"]),
    "cli.startup": elapsed(() => runNode(["dist/cli.js", "--version"])),
    "parser.inspect": elapsed(() => runNode(["dist/cli.js", "inspect", "examples/basic.md"])),
    "state.configShow": elapsed(() => runNode(["dist/cli.js", "config", "show"])),
    "plan.campaign": elapsed(() =>
      runNode(["dist/cli.js", "campaign", "plan", "examples/basic.md"], {
        SUBSTACK_PUBLICATION_URL: "https://benchmark.substack.com",
      }),
    ),
    "simulator.retrySchedule": elapsed(() => simulator.simulateRetrySchedule(20260810, [503, 429, 200], 4)),
    "mcp.catalogue": elapsed(() => catalogue.buildMcpToolDescriptors()),
  };
  return results;
}

async function packageSize() {
  const npmCli = process.env.npm_execpath;
  const command = npmCli ? process.execPath : "npm";
  const args = npmCli
    ? [npmCli, "pack", "--dry-run", "--json", "--ignore-scripts"]
    : ["pack", "--dry-run", "--json", "--ignore-scripts"];
  const result = spawnSync(command, args, {
    cwd: root,
    encoding: "utf8",
    shell: false,
    timeout: 60_000,
  });
  if (result.status !== 0) throw new Error(`npm pack failed: ${result.stderr}`);
  const parsed = JSON.parse(result.stdout);
  const entry = Array.isArray(parsed) ? parsed[0] : (Object.values(parsed)[0] ?? parsed);
  if (!Number.isFinite(entry?.size)) throw new Error("npm pack did not report a tarball size.");
  return entry.size;
}

export function compareBudgets(results, budgets) {
  const failures = [];
  for (const [name, value] of Object.entries(results.timingsMs)) {
    const maximum = budgets.budgetsMs[name];
    if (!Number.isFinite(maximum)) failures.push(`${name} has no time budget`);
    else if (value > maximum) failures.push(`${name} ${value}ms exceeds ${maximum}ms`);
  }
  for (const [name, value] of Object.entries(results.sizesBytes)) {
    const maximum = budgets.budgetsBytes[name];
    if (!Number.isFinite(maximum)) failures.push(`${name} has no size budget`);
    else if (value > maximum) failures.push(`${name} ${value} bytes exceeds ${maximum} bytes`);
  }
  return failures;
}

async function profile() {
  const directory = resolve(root, "reports/profiling");
  await mkdir(directory, { recursive: true });
  runNode([
    "--cpu-prof",
    `--cpu-prof-dir=${directory}`,
    "--cpu-prof-name=substack-publisher.cpuprofile",
    "dist/cli.js",
    "inspect",
    "examples/basic.md",
  ]);
  runNode([
    "--heap-prof",
    `--heap-prof-dir=${directory}`,
    "--heap-prof-name=substack-publisher.heapprofile",
    "dist/cli.js",
    "inspect",
    "examples/basic.md",
  ]);
  return {
    "profile.cpu": (await stat(resolve(directory, "substack-publisher.cpuprofile"))).size,
    "profile.heap": (await stat(resolve(directory, "substack-publisher.heapprofile"))).size,
  };
}

async function main() {
  const budgets = JSON.parse(await readFile(resolve(root, "config/performance-budgets.json"), "utf8"));
  const timingsMs = await runBenchmarks();
  const sizesBytes = { "package.tarball": await packageSize() };
  if (process.argv.includes("--profile")) Object.assign(sizesBytes, await profile());
  const failures = compareBudgets({ timingsMs, sizesBytes }, budgets);
  const receipt = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    node: process.version,
    platform: process.platform,
    arch: process.arch,
    typescript: JSON.parse(await readFile(resolve(root, "node_modules/typescript/package.json"), "utf8")).version,
    timingsMs,
    sizesBytes,
    failures,
    status: failures.length === 0 ? "passed" : "failed",
  };
  await mkdir(dirname(receiptPath), { recursive: true });
  await writeFile(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`, "utf8");
  console.log(JSON.stringify(receipt, null, 2));
  if (failures.length > 0) process.exitCode = 1;
}

if (import.meta.url === pathToFileURL(resolve(process.argv[1] ?? "")).href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : "Performance suite failed.");
    process.exitCode = 1;
  });
}
