#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import {
  buildFrontierDriftReport,
  parseDriftEvidenceSnapshots,
} from "../dist/frontier-coverage/drift.js";

const snapshotFile = process.argv[2];
const snapshots = snapshotFile
  ? parseDriftEvidenceSnapshots(JSON.parse(await readFile(snapshotFile, "utf8")))
  : [];
const report = buildFrontierDriftReport({ snapshots });

console.log(JSON.stringify(report, null, 2));
process.exitCode = report.status === "blocked" ? 1 : 0;
