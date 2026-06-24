#!/usr/bin/env node
import { execFileSync } from "node:child_process";

const LANES = {
  "playwright-next": {
    packages: ["playwright-core@next"],
    checks: [["npm", ["run", "build"]], ["node", ["dist/cli.js", "inspect", "examples/basic.md"]]],
  },
  "stagehand-alpha": {
    packages: ["@browserbasehq/stagehand@alpha"],
    checks: [["npm", ["run", "build"]]],
  },
  "typescript-rc": {
    packages: ["typescript@rc"],
    checks: [["npm", ["run", "typecheck"]], ["npm", ["run", "typecheck:strictest"]]],
  },
  "typescript-next": {
    packages: ["typescript@next"],
    checks: [["npm", ["run", "typecheck"]], ["npm", ["run", "typecheck:strictest"]]],
  },
  "vitest-beta": {
    packages: ["vitest@beta", "@vitest/coverage-v8@beta"],
    checks: [["npm", ["run", "test:coverage"]]],
  },
  "zod-canary": {
    packages: ["zod@canary"],
    checks: [["npm", ["run", "test:coverage"]]],
  },
  "prettier-alpha": {
    packages: ["prettier@next"],
    checks: [["npx", ["prettier", "--version"]], ["npm", ["run", "knip"]]],
  },
};

const laneName = process.argv[2] ?? process.env.EXPERIMENTAL_DEPENDENCY_LANE;
const lane = laneName ? LANES[laneName] : undefined;

if (!laneName || !lane) {
  console.error(`Usage: node scripts/experimental-dependency-lane.mjs <${Object.keys(LANES).join("|")}>`);
  process.exit(64);
}

run("npm", ["install", "--no-save", "--ignore-scripts", ...lane.packages]);
run("npm", ["ls", "--depth=0", ...lane.packages.map(packageName)], { allowFailure: true });

for (const [command, args] of lane.checks) {
  run(command, args);
}

function run(command, args, options = {}) {
  console.log(`\n> ${command} ${args.join(" ")}`);
  try {
    execFileSync(command, args, { stdio: "inherit" });
  } catch (error) {
    if (options.allowFailure) {
      console.log(`Advisory command failed with exit code ${error.status ?? "unknown"}. Continuing.`);
      return;
    }
    throw error;
  }
}

function packageName(specifier) {
  if (specifier.startsWith("@")) {
    const [scope, name] = specifier.split("/");
    return `${scope}/${name.split("@")[0]}`;
  }
  return specifier.split("@")[0];
}
