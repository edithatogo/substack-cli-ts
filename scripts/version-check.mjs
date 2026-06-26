#!/usr/bin/env node
/**
 * Version sync guard.
 *
 * `package.json` is the single source of truth for the package version.
 * Runtime surfaces (`src/version.ts`, `src/cli.ts`, `src/mcp/*`) read it
 * dynamically, but two static files still carry a literal version that must
 * stay aligned:
 *
 *   - `registry.server.json`  (MCP registry metadata, published externally)
 *   - `docs/api/substack-cli.contract.json`  (generated contract artifact)
 *
 * Usage:
 *   node scripts/version-check.mjs check   # exit 1 on drift
 *   node scripts/version-check.mjs sync    # rewrite the static files in place
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function writeJson(path, data) {
  const formatted = `${JSON.stringify(data, null, 2)}\n`;
  writeFileSync(path, formatted, "utf8");
}

const packageVersion = readJson(resolve(root, "package.json")).version;

if (typeof packageVersion !== "string" || packageVersion.trim() === "") {
  console.error("package.json is missing a non-empty `version` field.");
  process.exit(1);
}

// Files that carry a literal `version` field which must match package.json.
// The contract artifact is generated, but we keep it in the drift set so a
// forgotten `npm run contracts:generate` is caught before release.
const STATIC_VERSION_FILES = [
  {
    path: "registry.server.json",
    describe: (data) => [
      { path: ["version"], label: "top-level version" },
      { path: ["packages", 0, "version"], label: "packages[0].version" },
    ].map(({ path: p, label }) => ({ lens: p, label, current: p.reduce((acc, key) => acc?.[key], data) })),
    set: (data) => {
      data.version = packageVersion;
      if (Array.isArray(data.packages) && data.packages[0]) {
        data.packages[0].version = packageVersion;
      }
      return data;
    },
  },
  {
    path: "docs/api/substack-cli.contract.json",
    describe: (data) => [
      { lens: ["package", "version"], label: "package.version", current: data?.package?.version },
      {
        lens: ["contract", "version"],
        label: "contract.version",
        current: data?.contract?.version,
      },
    ],
    set: (data) => {
      if (data?.package) data.package.version = packageVersion;
      if (data?.contract) {
        data.contract.version = `${packageVersion}+contract.${data.contract.version?.split("+contract.")[1] ?? "1"}`;
      }
      return data;
    },
  },
];

const mode = process.argv[2] ?? "check";

if (mode !== "check" && mode !== "sync") {
  console.error(`Unsupported mode: ${mode}. Use "check" or "sync".`);
  process.exit(2);
}

let drifted = false;

for (const file of STATIC_VERSION_FILES) {
  const fullPath = resolve(root, file.path);
  let data;
  try {
    data = readJson(fullPath);
  } catch (error) {
    console.error(`Could not read ${file.path}: ${error.message}`);
    process.exit(1);
  }

  const fields = file.describe(data);
  const mismatches = fields.filter((f) => f.current !== packageVersion);

  if (mismatches.length === 0) {
    continue;
  }

  if (mode === "check") {
    for (const m of mismatches) {
      console.error(
        `Version drift in ${file.path} (${m.label}): expected ${packageVersion}, found ${m.current}`,
      );
    }
    drifted = true;
  } else {
    const updated = file.set(data);
    writeJson(fullPath, updated);
    for (const m of mismatches) {
      console.log(`Synced ${file.path} (${m.label}) -> ${packageVersion}`);
    }
  }
}

if (mode === "check" && drifted) {
  console.error("\nVersion drift detected. Run `npm run version:sync` to align, then regenerate contracts with `npm run contracts:generate`.");
  process.exit(1);
}

if (mode === "check") {
  console.log(`Version OK: ${packageVersion} (all static files aligned).`);
}
