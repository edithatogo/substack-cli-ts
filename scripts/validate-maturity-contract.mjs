import fs from "node:fs";
import crypto from "node:crypto";

const contractPath = process.argv[2] ?? "conductor/contracts/substack-cli-maturity.contract.json";
const contract = JSON.parse(fs.readFileSync(contractPath, "utf8"));
const tracePath = process.argv[3] ?? "conductor/traceability.json";
const trace = fs.existsSync(tracePath) ? JSON.parse(fs.readFileSync(tracePath, "utf8")) : null;

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object") {
    return Object.keys(value)
      .sort()
      .reduce((acc, key) => {
        acc[key] = stable(value[key]);
        return acc;
      }, {});
  }
  return value;
}

const errors = [];
const required = [
  "schemaVersion",
  "contractVersion",
  "promptSha256",
  "planSha256",
  "repository",
  "baseCommit",
  "operatorDecisions",
  "contracts",
  "phases",
  "tracks",
  "tasks",
  "issueMap",
  "evidence",
  "exceptions",
  "releaseGates",
  "registryTargets",
  "promptRetirement",
];

for (const key of required) {
  if (!(key in contract)) errors.push(`missing required field: ${key}`);
}
if (!Array.isArray(contract.contracts)) errors.push("contracts missing or invalid");
if (!Array.isArray(contract.phases)) errors.push("phases missing or invalid");
if (!Array.isArray(contract.tracks)) errors.push("tracks missing or invalid");
if (!Array.isArray(contract.tasks)) errors.push("tasks missing or invalid");

const trackIds = new Set(contract.tracks.map((track) => track.id));
const taskIds = new Set();

for (const task of contract.tasks) {
  if (!task.id) errors.push("task missing id");
  if (taskIds.has(task.id)) errors.push(`duplicate task ${task.id}`);
  taskIds.add(task.id);
  if (!task.trackId) errors.push(`task ${task.id} missing trackId`);
  if (!Array.isArray(task.contractIds) || task.contractIds.length === 0) {
    errors.push(`task ${task.id} has no contractIds`);
  }
  if (!trackIds.has(task.trackId)) {
    errors.push(`task ${task.id} mapped to unknown track ${task.trackId}`);
  }
}

for (const phase of contract.phases) {
  if (!phase.phaseId || !phase.title) {
    errors.push(`invalid phase entry: ${JSON.stringify(phase)}`);
  }
  if (!Array.isArray(phase.tracks) || phase.tracks.length === 0) {
    errors.push(`phase ${phase.phaseId} has no tracks`);
  }
  for (const trackId of phase.tracks) {
    if (!trackIds.has(trackId)) {
      errors.push(`phase ${phase.phaseId} references unknown track ${trackId}`);
    }
  }
}

for (const track of contract.tracks) {
  if (!track.id) errors.push("track with missing id");
  if (!Array.isArray(track.contractIds)) {
    errors.push(`track ${track.id} missing contractIds`);
  }
  const issueMap = contract.issueMap?.taskIssues || {};
  const mappedTaskCount = contract.tasks.filter((task) => task.trackId === track.id).length;
  if (mappedTaskCount === 0) {
    errors.push(`track ${track.id} has no tasks`);
  }
  const missing = contract.tasks.filter((task) => task.trackId === track.id).some((task) => !issueMap[task.id]);
  if (missing) {
    errors.push(`track ${track.id} has unmapped task issue ids`);
  }
}

for (const contractEntry of contract.contracts) {
  const mapped = contract.tracks.filter((track) =>
    Array.isArray(track.contractIds) && track.contractIds.includes(contractEntry.id),
  );
  if (contractEntry.priority === "MUST" && mapped.length === 0) {
    errors.push(`must contract ${contractEntry.id} unmapped`);
  }
}

// Recompute hash using the original prompt-derived algorithm when prompt is available.
let calculatedHash = null;
try {
  const prompt = JSON.parse(fs.readFileSync("CODEX_SUBSTACK_CLI_MATURITY_PROMPT.json", "utf8"));
  const contracts = prompt.contracts || [];
  const roadmap = prompt.roadmap || [];
  const hashInput = stable({
    promptId: prompt.promptId,
    contracts: contracts.map((c) => ({
      id: c.id,
      priority: c.priority,
      mappedTrackIds: c.mappedTrackIds || [],
    })),
    phases: roadmap,
  });
  calculatedHash = crypto.createHash("sha256").update(JSON.stringify(hashInput)).digest("hex");
} catch (error) {
  errors.push(`unable to recompute plan hash: ${error.message}`);
}

if (calculatedHash && calculatedHash !== contract.planSha256) { console.log(`calculated planSha256: ${calculatedHash}`); }

if (trace && trace.planSha256 && trace.planSha256 !== contract.planSha256) {
  errors.push("traceability planSha256 mismatch");
}

if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}

console.log(
  `contract valid ${contract.contracts.length} contracts / ${contract.phases.length} phases / ${contract.tracks.length} tracks / ${contract.tasks.length} tasks`,
);
if (trace) {
  console.log(`traceability has ${Object.keys(trace.tasks || {}).length} tasks`);
}

