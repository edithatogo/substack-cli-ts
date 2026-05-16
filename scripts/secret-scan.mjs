#!/usr/bin/env node
import { readdir, readFile } from "node:fs/promises";
import { join, relative } from "node:path";

const ROOT = process.cwd();
const IGNORED_DIRS = new Set([
  ".git",
  "node_modules",
  "dist",
  "coverage",
  ".substack-cli",
  ".stryker-tmp",
  "stryker-tmp",
  "reports",
  "research",
  "playwright-report",
  "test-results",
  "traces",
  ".kilo",
]);

const IGNORED_FILES = new Set([
  ".env",
  ".aider.chat.history.md",
  ".aider.input.history",
  ".aider.tags.cache.v4",
  "_cookie_header.txt",
  "AUTHORS.md",
  "CITATION.cff",
  "scripts/secret-scan.mjs",
]);

const PATTERNS = [
  /bb_live/i,
  /SUBSTACK_PASSWORD=.+/i,
  /jc!x\$ZC%NZR6xC\$/i,
  /d\.a\.mordaunt@gmail\.com/i,
  /BROWSERBASE_API_KEY=bb_/i,
  /connect\.sid=.*s%3A/i,
  /SUBSTACK_EMAIL=.+@/i,
  /password\s+"[^"]+"/i,
];

let findings = 0;

for await (const file of walk(ROOT)) {
  const raw = await readFile(file, "utf8").catch(() => null);
  if (!raw) {
    continue;
  }

  for (const pattern of PATTERNS) {
    if (!pattern.test(raw)) {
      continue;
    }

    findings += 1;
    process.stdout.write(`${relative(ROOT, file)} (${pattern})\n`);
    break;
  }
}

if (findings > 0) {
  process.exitCode = 1;
}

async function* walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);

    if (entry.isDirectory()) {
      if (IGNORED_DIRS.has(entry.name)) {
        continue;
      }

      yield* walk(fullPath);
      continue;
    }

    if (entry.isFile()) {
      const relativePath = relative(ROOT, fullPath).replaceAll("\\", "/");
      if (IGNORED_FILES.has(entry.name) || IGNORED_FILES.has(relativePath)) {
        continue;
      }

      yield fullPath;
    }
  }
}
