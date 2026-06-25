#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import {
  buildFrontierDriftReport,
  parseDriftEvidenceSnapshots,
  renderFrontierDriftIssueBody,
} from "../dist/frontier-coverage/drift.js";

const args = parseArgs(process.argv.slice(2));
const snapshotFile =
  args.snapshotFile || process.env.DRIFT_SNAPSHOT_FILE || "fixtures/frontier-drift-snapshots.json";
const snapshots = parseDriftEvidenceSnapshots(JSON.parse(await readFile(snapshotFile, "utf8")));
const report = buildFrontierDriftReport({ snapshots });

if (args.out) {
  await writeTextFile(args.out, JSON.stringify(report, null, 2));
} else {
  console.log(JSON.stringify(report, null, 2));
}

if (args.issueBodyOut) {
  await writeTextFile(args.issueBodyOut, renderFrontierDriftIssueBody(report));
}

process.exitCode = report.status === "blocked" ? 1 : 0;

function parseArgs(argv) {
  const parsed = {};
  const positional = [];
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--out") {
      parsed.out = requireValue(argv, (index += 1), arg);
    } else if (arg === "--issue-body-out") {
      parsed.issueBodyOut = requireValue(argv, (index += 1), arg);
    } else if (arg === "--snapshot-file") {
      parsed.snapshotFile = requireValue(argv, (index += 1), arg);
    } else if (arg.startsWith("--")) {
      throw new Error(`Unknown option: ${arg}`);
    } else {
      positional.push(arg);
    }
  }
  if (!parsed.snapshotFile && positional[0]) parsed.snapshotFile = positional[0];
  if (positional.length > 1) {
    throw new Error(`Unexpected positional arguments: ${positional.slice(1).join(", ")}`);
  }
  return parsed;
}

function requireValue(argv, index, option) {
  const value = argv[index];
  if (!value || value.startsWith("--")) {
    throw new Error(`${option} requires a value.`);
  }
  return value;
}

async function writeTextFile(file, contents) {
  await mkdir(dirname(file), { recursive: true });
  await writeFile(file, `${contents}\n`, "utf8");
}
