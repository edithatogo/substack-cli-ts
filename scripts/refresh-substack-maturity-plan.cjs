const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execSync } = require('child_process');

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object') {
    return Object.keys(value).sort().reduce((acc, key) => {
      acc[key] = stable(value[key]);
      return acc;
    }, {});
  }
  return value;
}

const promptPath = path.join(process.cwd(), 'CODEX_SUBSTACK_CLI_MATURITY_PROMPT.json');
const prompt = JSON.parse(fs.readFileSync(promptPath, 'utf8'));
const contractPath = path.join(process.cwd(), 'conductor', 'contracts', 'substack-cli-maturity.contract.json');
const traceabilityPath = path.join(process.cwd(), 'conductor', 'traceability.json');
const previousContract = fs.existsSync(contractPath) ? JSON.parse(fs.readFileSync(contractPath, 'utf8')) : null;
const previousTraceability = fs.existsSync(traceabilityPath) ? JSON.parse(fs.readFileSync(traceabilityPath, 'utf8')) : null;

const baseCommit = execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
const generatedOn = new Date().toISOString();

const ensureDir = (p) => {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
};
const writeJson = (file, obj) => fs.writeFileSync(file, `${JSON.stringify(obj, null, 2)}\n`, 'utf8');
const writeText = (file, txt) => fs.writeFileSync(file, `${txt}\n`, 'utf8');

const roadmap = prompt.roadmap || [];
const contracts = prompt.contracts || [];

const flattenedTracks = roadmap.flatMap((phase) =>
  (phase.tracks || []).map((t) => ({
    phaseId: phase.id,
    phaseTitle: phase.title,
    releaseTarget: phase.releaseTarget,
    id: t.id,
    title: t.title,
    requiredTasks: t.requiredTasks || [],
    existingIssues: t.existingIssues || [],
  }))
);

const contractByTrack = new Map();
for (const c of contracts) {
  for (const trackId of c.mappedTrackIds || []) {
    if (!contractByTrack.has(trackId)) contractByTrack.set(trackId, []);
    contractByTrack.get(trackId).push(c.id);
  }
}

const taskRecords = [];
for (const t of flattenedTracks) {
  for (let i = 0; i < (t.requiredTasks || []).length; i++) {
    const taskText = t.requiredTasks[i];
    const taskId = `${t.id}-TASK-${String(i + 1).padStart(2, '0')}`;
    const contractIds = contractByTrack.get(t.id) || [];
    const mustIds = contractIds.filter((id) => {
      const c = contracts.find((x) => x.id === id);
      return c && c.priority === 'MUST';
    });
    taskRecords.push({
      id: taskId,
      title: taskText,
      trackId: t.id,
      phaseId: t.phaseId,
      status: 'planned',
      contractIds,
      issue: previousContract?.issueMap?.taskIssues?.[taskId] ?? null,
      mustContractIds: mustIds,
      release: t.releaseTarget,
    });
  }
}

const phaseRecords = roadmap.map((p) => ({
  phaseId: p.id,
  title: p.title,
  releaseTarget: p.releaseTarget,
  tracks: (p.tracks || []).map((t) => t.id),
}));

const trackRecords = flattenedTracks.map((t) => ({
  id: t.id,
  phaseId: t.phaseId,
  title: t.title,
  status: 'planned',
  contractIds: contractByTrack.get(t.id) || [],
  requiredTaskCount: t.requiredTasks.length,
  existingIssues: t.existingIssues,
  issue: previousContract?.issueMap?.trackIssues?.[t.id] ?? null,
}));

const contract = {
  schemaVersion: '2.1.0',
  contractVersion: prompt.schemaVersion,
  promptSha256: prompt.contentSha256,
  planSha256: null,
  repository: 'substack-cli-ts',
  baseCommit,
  operatorDecisions: (prompt.nonNegotiableOperatorDecisions || []).map((d) => ({
    decision: d.decision || d,
    area: d.area || null,
    rationale: d.rationale || null,
    immutable: true,
  })),
  contracts: contracts.map((c) => ({
    id: c.id,
    priority: c.priority,
    statement: c.statement,
    acceptanceCriteria: c.acceptanceCriteria || [],
    requiredEvidence: c.requiredEvidence || [],
    mappedTrackIds: c.mappedTrackIds || [],
    mergePolicy: c.mergePolicy || 'block',
  })),
  phases: phaseRecords,
  tracks: trackRecords,
  tasks: taskRecords,
  issueMap: previousContract?.issueMap ?? {
    planningIssue: null,
    phaseIssues: {},
    trackIssues: {},
    taskIssues: {},
  },
  evidence: previousContract?.evidence ?? {
    generatedOn,
    conductor: {
      refreshed: false,
      filesCreated: [],
    },
    github: {
      hierarchyCreated: false,
      projectCreated: false,
      checks: [],
    },
    planningReceipt: {
      written: false,
      path: null,
    },
  },
  exceptions: [],
  releaseGates: (prompt.releaseTrain || []).map((r) => ({
    version: r.version,
    theme: r.theme,
    minimumGate: r.minimumGate,
    status: 'planned',
  })),
  registryTargets: (prompt.registryProgramme?.requiredPrimaryTargets || []).map((r) => ({
    name: r.name,
    purpose: r.purpose,
    completion: r.completion,
    status: 'not_started',
    verifiedUrl: null,
    receipt: null,
  })),
  promptRetirement: {
    blocked: true,
    status: 'pending',
    canRetireUntil: null,
    rules: prompt.registryProgramme?.submissionRules || [],
  },
};

const planHashInput = stable({
  promptId: prompt.promptId,
  phases: roadmap,
  contracts,
});
contract.planSha256 = crypto.createHash('sha256').update(JSON.stringify(planHashInput)).digest('hex');

// write structure
const root = process.cwd();
const conductorRoot = path.join(root, 'conductor');
const tracksRoot = path.join(conductorRoot, 'tracks');

['', 'tracks', 'contracts', 'code_styleguides', 'decisions', 'verification'].forEach((p) => ensureDir(path.join(conductorRoot, p)));
ensureDir(path.join(root, 'docs', 'architecture'));
ensureDir(path.join(root, 'docs', 'decisions'));
ensureDir(path.join(root, 'scripts'));

for (const t of flattenedTracks) {
  const dir = path.join(tracksRoot, t.id);
  ensureDir(dir);
  const contractIds = contractByTrack.get(t.id) || [];
  const mustContracts = contracts.filter((c) => (c.mappedTrackIds || []).includes(t.id) && c.priority === 'MUST');

  const spec = [
    `# Track ${t.id}: ${t.title}`,
    '',
    `Phase: ${t.phaseId} ${t.phaseTitle}`,
    `Release target: ${t.releaseTarget}`,
    '',
    '## Scope',
    '- Implementation work for the track scope, including runtime code, tests, and required planning artifacts.',
    '- Native hierarchy, contract, and traceability preparation.',
    '',
  ].join('\n');

  const planText = [
    `# Plan ${t.id}`,
    '',
    `## Tasks`,
    ...t.requiredTasks.map((task, i) => `- [ ] ${t.id}-TASK-${String(i + 1).padStart(2, '0')} ${task}`),
    '',
    `## Contract IDs`,
    ...contractIds.map((id) => `- ${id}`),
    '',
    `## Existing issues`,
    ...((t.existingIssues || []).map((n) => `- #${n}`)),
    '',
    '## Risk controls',
    '- Preserve native hierarchy and evidence-first progress.',
  ].join('\n');

  const metadata = {
    id: t.id,
    phaseId: t.phaseId,
    phaseTitle: t.phaseTitle,
    title: t.title,
    status: 'planned',
    contractIds,
    requiredTaskCount: t.requiredTasks.length,
    existingIssues: t.existingIssues,
    riskLevel: mustContracts.length ? 'high' : 'medium',
    issue: previousContract?.issueMap?.trackIssues?.[t.id] ?? null,
  };

  const contractsMap = {
    trackId: t.id,
    contractIds,
    mappedContracts: contracts.filter((c) => (c.mappedTrackIds || []).includes(t.id)).map((c) => ({
      id: c.id,
      priority: c.priority,
      statement: c.statement,
      acceptanceCriteria: c.acceptanceCriteria || [],
      requiredEvidence: c.requiredEvidence || [],
    })),
  };

  const risks = [
    '# Risks',
    '',
    ...mustContracts.map((c) => `- ${c.id}: ${c.statement}`),
    '- Implementation scope must remain bounded by the track contract and verification evidence.',
    '- Some legacy issue lineage may not support native subissue links.',
    '- Registry claims need deferred verification in implementation',
  ].join('\n');

  const verification = [
    '# Verification',
    '',
    '- [ ] Contract generated and validated',
    '- [ ] Traceability map generated',
    '- [ ] All phase/track/task artefacts in Conductor',
  ].join('\n');

  writeText(path.join(dir, 'spec.md'), spec);
  writeText(path.join(dir, 'plan.md'), planText);
  writeJson(path.join(dir, 'metadata.json'), metadata);
  writeJson(path.join(dir, 'contracts.json'), contractsMap);
  writeText(path.join(dir, 'risks.md'), risks);
  writeText(path.join(dir, 'verification.md'), verification);
}

writeText(path.join(conductorRoot, 'product.md'), [
  '# Product',
  '',
  `Repository: ${prompt.targetRepository?.name || 'substack-cli-ts'}`,
  `Plan hash: ${contract.planSha256}`,
  '',
  '## Mission',
  prompt.primaryObjective || '',
  '',
  '## Mandatory decisions',
  ...contract.operatorDecisions.map((x) => `- ${x.area || 'global'}: ${x.decision}`),
].join('\n'));

writeText(path.join(conductorRoot, 'product-guidelines.md'), [
  '# Product Guidelines',
  '- Contract-first planning and traceability.',
  '- Runtime implementation is permitted after the plan-only first-invocation gate and must pass required verification.',
  '- Native GitHub hierarchy and canonical mapping.',
  '- Explicit evidence for every mapped contract.',
  '- Every implementation task must add or update automated tests, or record a bounded applicability receipt explaining why tests do not apply.',
].join('\n'));

writeText(path.join(conductorRoot, 'tech-stack.md'), [
  '# Tech Stack',
  '- TypeScript CLI implementation remains unchanged in planning.',
  '- GitHub CLI orchestration for issues, issues hierarchy, project, and checks.',
  '- Node script driven planning artifacts and validator.',
].join('\n'));

writeText(path.join(conductorRoot, 'workflow.md'), [
  '# Workflow',
  '',
  '## Plan-only protocol',
  ...prompt.executionProtocol.planningWorkflow.map((s) => `- ${s}`),
].join('\n'));

writeText(path.join(conductorRoot, 'tracks.md'), [
  '# Tracks',
  '',
  ...phaseRecords.map((p) => [`## ${p.phaseId} ${p.title}`, ...p.tracks.map((id) => `- ${id}`), ''].join('\n')),
].join('\n'));

writeText(path.join(conductorRoot, 'index.md'), [
  '# Conductor context',
  '- [product.md](./product.md)',
  '- [product-guidelines.md](./product-guidelines.md)',
  '- [tech-stack.md](./tech-stack.md)',
  '- [workflow.md](./workflow.md)',
  '- [tracks.md](./tracks.md)',
  '- [contracts/substack-cli-maturity.contract.json](./contracts/substack-cli-maturity.contract.json)',
  '- [traceability.json](./traceability.json)',
  '',
  `planSha256: ${contract.planSha256}`,
].join('\n'));

writeJson(path.join(conductorRoot, 'contracts', 'substack-cli-maturity.contract.json'), contract);

const traceability = {
  generatedOn,
  promptId: prompt.promptId,
  promptSha256: prompt.contentSha256,
  planSha256: contract.planSha256,
  repository: 'edithatogo/substack-cli-ts',
  promptFile: 'CODEX_SUBSTACK_CLI_MATURITY_PROMPT.json',
  phaseCount: roadmap.length,
  trackCount: flattenedTracks.length,
  taskCount: taskRecords.length,
  contractCount: contracts.length,
  phases: Object.fromEntries(phaseRecords.map((p) => [p.phaseId, { ...p }])),
  tracks: Object.fromEntries(trackRecords.map((t) => [t.id, { ...t }])),
  tasks: Object.fromEntries(taskRecords.map((t) => [t.id, { ...t }])),
  contractMap: Object.fromEntries(contract.records || []),
  issueRelations: previousTraceability?.issueRelations ?? {
    programme: contract.issueMap.planningIssue?.number ?? null,
    phases: Object.fromEntries(Object.entries(contract.issueMap.phaseIssues || {}).map(([id, issue]) => [id, issue.number])),
    tracks: Object.fromEntries(Object.entries(contract.issueMap.trackIssues || {}).map(([id, issue]) => [id, issue.number])),
    tasks: Object.fromEntries(Object.entries(contract.issueMap.taskIssues || {}).map(([id, issue]) => [id, issue.number])),
  },
};

writeJson(path.join(conductorRoot, 'traceability.json'), traceability);

ensureDir(path.join(conductorRoot, 'code_styleguides'));
writeText(path.join(conductorRoot, 'code_styleguides', 'README.md'), [
  '# Code style guides',
  '- Strict TypeScript with explicit boundaries',
  '- Minimal side effects in planning scripts',
  '- Evidence-first updates',
].join('\n'));

writeJson(path.join(conductorRoot, 'decisions', 'exceptions.schema.json'), {
  id: 'exceptions',
  type: 'object',
  required: ['id', 'owner', 'rationale', 'compensatingControl', 'expiry', 'approvalReference'],
  properties: {
    id: { type: 'string' },
    owner: { type: 'string' },
    rationale: { type: 'string' },
    compensatingControl: { type: 'string' },
    expiry: { type: 'string' },
    approvalReference: { type: 'string' },
  },
});

writeJson(path.join(conductorRoot, 'decisions', 'prompt-retirement.schema.json'), {
  type: 'object',
  required: ['status', 'blockedBy', 'rationale'],
  properties: {
    status: { type: 'string' },
    blockedBy: { type: 'array', items: { type: 'string' } },
    rationale: { type: 'string' },
  },
});

writeJson(path.join(conductorRoot, 'verification', 'verification-receipt.schema.json'), {
  type: 'object',
  required: ['artifact', 'status', 'evidence', 'timestamp'],
  properties: {
    artifact: { type: 'string' },
    status: { type: 'string' },
    evidence: { type: 'array', items: { type: 'string' } },
    timestamp: { type: 'string' },
  },
});

writeText(path.join(root, 'docs/architecture', 'frontier-mainline-maturity.md'), [
  '# Frontier-mainline maturity architecture',
  '',
  '- Source of truth: canonical contract.',
  '- Execution: Conductor + nested GitHub hierarchy + tracked project board.',
  '- Validation: local deterministic validator + hosted checks on planning PR.',
].join('\n'));

writeText(path.join(root, 'docs/decisions', 'prompt-retirement.md'), [
  '# Prompt retirement',
  '- Do not delete prompt during planning.',
  '- Retirement remains blocked while unmapped requirements remain.',
].join('\n'));

writeText(path.join(root, 'scripts', 'validate-maturity-contract.mjs'), [
  'import fs from "node:fs";',
  'import crypto from "node:crypto";',
  'const contract = JSON.parse(fs.readFileSync(process.argv[2] ?? "conductor/contracts/substack-cli-maturity.contract.json", "utf8"));',
  'const errors = [];',
  'const required = ["schemaVersion","contractVersion","promptSha256","planSha256","repository","baseCommit","operatorDecisions","contracts","phases","tracks","tasks","issueMap","evidence","exceptions","releaseGates","registryTargets","promptRetirement"];',
  'for (const k of required) { if (!(k in contract)) errors.push(`missing ${k}`); }',
  'if (!Array.isArray(contract.contracts)) errors.push("contracts not array");',
  'if (!Array.isArray(contract.phases) || contract.phases.length === 0) errors.push("phases missing");',
  'if (!Array.isArray(contract.tracks) || contract.tracks.length === 0) errors.push("tracks missing");',
  'if (!Array.isArray(contract.tasks) || contract.tasks.length === 0) errors.push("tasks missing");',
  'const taskIds = new Set();',
  'for (const t of contract.tasks) {',
  '  if (!t.id) errors.push("task missing id"); else if (taskIds.has(t.id)) errors.push(`duplicate task ${t.id}`); else taskIds.add(t.id);',
  '  if (!t.trackId) errors.push(`task ${t.id} missing trackId`);',
  '}',
  'const trackIds = new Set(contract.tracks.map(t=>t.id));',
  'for (const t of contract.tasks) if (!trackIds.has(t.trackId)) errors.push(`task ${t.id} missing track ${t.trackId}`);',
  'for (const t of contract.tasks) { if (!Array.isArray(t.contractIds) || t.contractIds.length === 0) errors.push(`task ${t.id} no contracts`); }',
  'for (const c of contract.contracts) { if ((c.priority === "MUST") && !contract.tracks.some(t=> (t.contractIds||[]).includes(c.id))) errors.push(`must contract ${c.id} unmapped`); }',
  'const hashInput = JSON.stringify({',
  `  promptId: "${prompt.promptId}",`,
  '  contracts: contract.contracts.map(x=>({id:x.id,priority:x.priority,mappedTrackIds:x.mappedTrackIds||[]})),',
  '  phases: contract.phases',
  '});',
  'const checksum = crypto.createHash("sha256").update(hashInput).digest("hex");',
  'if (checksum !== contract.planSha256) errors.push("planSha256 mismatch");',
  'if (errors.length) { console.error(errors.join("\n")); process.exit(1); }',
  'console.log(`contract valid ${contract.contracts.length} contracts / ${contract.phases.length} phases / ${contract.tracks.length} tracks / ${contract.tasks.length} tasks`);',
].join('\n'));

writeJson(path.join(root, 'docs/architecture/plan-summary.json'), {
  promptId: prompt.promptId,
  promptSha256: prompt.contentSha256,
  planSha256: contract.planSha256,
  generatedOn,
  phaseCount: roadmap.length,
  trackCount: flattenedTracks.length,
  taskCount: taskRecords.length,
  contractCount: contracts.length,
  generatedBy: 'PLAN_ONLY',
});

console.log(JSON.stringify({
  planSha256: contract.planSha256,
  phaseCount: roadmap.length,
  trackCount: flattenedTracks.length,
  taskCount: taskRecords.length,
}, null, 2));
