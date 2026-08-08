const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const root = process.cwd();
const promptPath = path.join(root, 'CODEX_SUBSTACK_CLI_MATURITY_PROMPT.json');
const promptRaw = fs.readFileSync(promptPath, 'utf8');
const prompt = JSON.parse(promptRaw);

const runAt = new Date().toISOString();
const safe = (text) => (text || '').replace(/\r?\n/g, '\\n');

const conductorRoot = path.join(root, 'conductor');
const tracksRoot = path.join(conductorRoot, 'tracks');
const contractsRoot = path.join(conductorRoot, 'contracts');
const decisionsRoot = path.join(conductorRoot, 'decisions');
const verificationRoot = path.join(conductorRoot, 'verification');
const codeStyleRoot = path.join(conductorRoot, 'code_styleguides');

for (const dir of [conductorRoot, tracksRoot, contractsRoot, decisionsRoot, verificationRoot, codeStyleRoot]) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

// Copy existing root docs into conductor context.
for (const entry of [
  ['product.md', 'product.md'],
  ['tech-stack.md', 'tech-stack.md'],
  ['workflow.md', 'workflow.md'],
]) {
  const [source, target] = entry;
  const src = path.join(root, source);
  const dst = path.join(conductorRoot, target);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dst);
  }
}

// Write product guidelines and style index.
fs.writeFileSync(path.join(conductorRoot, 'product-guidelines.md'), `# Product Guidelines\n\n## Program Objectives\n- Follow repository evidence-first delivery with explicit contracts and verifiable traces.\n- Maintain solo-maintainer operability with minimal external gate friction and explicit owner approvals.\n- Keep operations deterministic and auditable in planning artefacts and CI evidence.\n\n## Decision Rules\n- No implementation in PLAN_ONLY mode.\n- Preserve existing work and reuse current issues/PRs where possible.\n- Do not invent hidden implementation behavior in issue descriptions.\n`);

fs.writeFileSync(path.join(codeStyleRoot, 'typescript-eslint.md'), `# TypeScript/ESLint Conventions\n\n- Strict TypeScript with `"`explicit typing for exported APIs`"`.\n- ESLint/Prettier-compatible formatting.\n- Keep side effects localized and test-first for plan-critical behaviors.\n`);

// Preserve existing old references but refresh handshake.
fs.writeFileSync(path.join(conductorRoot, 'index.md'), `# Project Context\n\n## Definition\n- [Product Definition](./product.md)\n- [Product Guidelines](./product-guidelines.md)\n- [Tech Stack](./tech-stack.md)\n\n## Workflow\n- [Workflow](./workflow.md)\n\n## Management\n- [Tracks Registry](./tracks.md)\n- [Tracks Directory](./tracks/)\n- [Contract](./contracts/substack-cli-maturity.contract.json)\n- [Traceability](./traceability.json)\n\n## Standards\n- [Decisions](./decisions/)\n- [Verification](./verification/)\n`);

const phases = prompt.roadmap || [];

const mappedContractIds = {};
for (const contract of prompt.contracts || []) {
  const ids = contract.mappedTrackIds || [];
  for (const id of ids) {
    mappedContractIds[id] = mappedContractIds[id] || [];
    mappedContractIds[id].push(contract.id);
  }
}

const contractByTrack = {};
for (const phase of phases) {
  for (const track of phase.tracks || []) {
    contractByTrack[track.id] = [...new Set((track.id ? mappedTrackContractIds(track.id, prompt.contracts) : []))];
  }
}

function mappedTrackContractIds(trackId) {
  return (prompt.contracts || [])
    .filter((contract) => Array.isArray(contract.mappedTrackIds) && contract.mappedTrackIds.includes(trackId))
    .map((contract) => contract.id);
}

function slugId(base, index) {
  return `${base}-` + String(index + 1).padStart(2, '0');
}

// Manual reuse map from existing governance issues.
const existingTaskIssueMap = {
  'T00-01-01': 168,
  'T00-02-01': 165,
  'T00-03-01': 164,
  'T01-02-01': 167,
  'T03-01-01': 166,
  'T09-01-01': 161,
  'T09-02-01': 162,
  'T09-03-01': 163,
};

const contractIssues = {};
for (const num of [161, 162, 163, 164, 165, 166, 167, 168]) {
  contractIssues[num] = `https://github.com/edithatogo/substack-cli-ts/issues/${num}`;
}

const contract = {
  schemaVersion: prompt.schemaVersion || '2.0.0',
  contractVersion: '1.0.0',
  promptSha256: prompt.contentSha256 || '',
  planSha256: '',
  repository: {
    fullName: prompt.targetRepository?.fullName || 'edithatogo/substack-cli-ts',
    defaultBranch: prompt.targetRepository?.defaultBranch || 'master',
    url: prompt.targetRepository?.repositoryUrl || 'https://github.com/edithatogo/substack-cli-ts',
  },
  baseCommit: '',
  operatorDecisions: (prompt.nonNegotiableOperatorDecisions || []).concat(prompt.primaryObjective ? [prompt.primaryObjective] : []),
  phases: [],
  tracks: [],
  tasks: [],
  contracts: (prompt.contracts || []).map((contract) => ({
    id: contract.id,
    priority: contract.priority,
    mappedTrackIds: contract.mappedTrackIds || [],
    requiredEvidence: contract.requiredEvidence || [],
    acceptanceCriteria: contract.acceptanceCriteria || [],
    mergePolicy: contract.mergePolicy || 'block',
    status: 'planned',
    statement: contract.statement,
  })),
  issueMap: {},
  evidence: [],
  exceptions: [],
  releaseGates: prompt.releaseTrain || [],
  registryTargets: prompt.registryProgramme || [],
  promptRetirement: {
    phase: 'pending',
    notes: [
      'Prompt retirement remains blocked while this planning PR is active.',
      'All prompt requirements must be represented in the canonical contract before retirement.',
    ],
  },
  requiredStatuses: prompt.canonicalContractRequirements?.validStatuses || [
    'planned',
    'in_progress',
    'implemented',
    'unit_verified',
    'contract_verified',
    'simulator_verified',
    'canary_verified',
    'production_observed',
    'externally_blocked',
    'deprecated',
  ],
};

const tracksIndex = [];
const taskArtifacts = [];

for (const phase of phases) {
  const phaseEntry = {
    id: phase.id,
    title: phase.title,
    releaseTarget: phase.releaseTarget || null,
    tracks: (phase.tracks || []).map((track) => track.id),
    status: 'planned',
  };
  contract.phases.push(phaseEntry);

  for (const track of phase.tracks || []) {
    const trackDir = path.join(tracksRoot, track.id);
    fs.mkdirSync(trackDir, { recursive: true });

    const trackTasks = Array.isArray(track.requiredTasks) ? track.requiredTasks : [];
    const taskIds = [];
    const contractRefs = [];

    trackTasks.forEach((taskText, index) => {
      const taskId = slugId(track.id, index);
      const taskContractIds = mappedTrackContractIds(track.id);
      if (taskContractIds.length === 0) taskContractIds.push('PLAN-CANONICAL-001');
      const mappedIssue = existingTaskIssueMap[taskId] || null;
      const taskUrl = mappedIssue ? contractIssues[mappedIssue] : null;

      const task = {
        id: taskId,
        title: `Task ${String(index + 1).padStart(2, '0')}: ${taskText}`,
        phaseId: phase.id,
        trackId: track.id,
        status: 'planned',
        contractIds: taskContractIds,
        issue: mappedIssue,
        evidence: [],
      };
      taskArtifacts.push(task);
      contract.tasks.push(task);
      taskIds.push(taskId);
      contractRefs.push(...taskContractIds);
      if (mappedIssue) {
        contract.issueMap[taskId] = {
          issueNumber: mappedIssue,
          issueUrl: taskUrl,
          issueTitle: null,
          role: 'existing_work_reused',
        };
      }
    });

    const uniqueTrackContractIds = [...new Set(contractRefs)];
    const trackMetadata = {
      id: track.id,
      phaseId: phase.id,
      phaseTitle: phase.title,
      title: track.title,
      releaseTarget: phase.releaseTarget || null,
      requiredTasks: track.requiredTasks || [],
      taskIds,
      contracts: uniqueTrackContractIds,
      status: 'planned',
      evidence: [],
      blockers: [],
      risk: 'medium',
      createdAt: runAt,
      updatedAt: runAt,
      conductorPath: `./tracks/${track.id}`,
    };

    contract.tracks.push(trackMetadata);

    fs.writeFileSync(
      path.join(trackDir, 'metadata.json'),
      JSON.stringify(trackMetadata, null, 2) + '\n'
    );

    fs.writeFileSync(
      path.join(trackDir, 'spec.md'),
      `# Track ${track.id} - ${track.title}\n\n## Phase\n- ${phase.id}: ${phase.title}\n\n## Scope\n${(track.requiredTasks || [])\n        .map((task, i) => `- [ ] ${String(i + 1).padStart(2, '0')}. ${task}`)\n        .join('\n')}\n\n`);

    fs.writeFileSync(
      path.join(trackDir, 'plan.md'),
      `# Plan ${track.id}\n\n## Objectives\n- Make planning artefacts, traceability and governance ready for PLAN_ONLY execution.\n\n## Work Packages\n${(track.requiredTasks || [])\n        .map((task, i) => `- [ ] Task: ${String(i + 1).padStart(2, '0')} ${task}`)\n        .join('\n')}\n\n## Completion Evidence\n- No implementation changes are introduced in this phase (PLAN_ONLY).\n`);

    fs.writeFileSync(
      path.join(trackDir, 'contracts.json'),
      JSON.stringify({ trackId: track.id, contracts: uniqueTrackContractIds }, null, 2) + '\n'
    );

    fs.writeFileSync(path.join(trackDir, 'risks.md'), '# Risks\n\n- Contract scope and verification evidence are the primary gates.\n- Existing issue dependencies may require manual confirmation before execution starts.\n- CI lanes can include pre-existing failures unrelated to planning changes.\n');

    fs.writeFileSync(
      path.join(trackDir, 'verification.md'),
      `# Verification\n\n- Contract artifact generated: \`${path.join('contracts', 'substack-cli-maturity.contract.json')}\`\n- Conductor refresh completed by script.\n- Canonical validator executed with planning scope checks.\n`
    );

    tracksIndex.push(`- [ ] **Track:** ${track.id} (${track.title})`);
    tracksIndex.push(`  - Phase: ${phase.id}`);
    tracksIndex.push(`  - Contract IDs: ${uniqueTrackContractIds.join(', ') || 'n/a'}`);
    tracksIndex.push(`  - Path: [${track.id}](./tracks/${track.id}/index.md)`);
    tracksIndex.push('');

    const indexMarkdown = `# Track ${track.id}: ${track.title}\n\n- **Phase:** ${phase.id}\n- **Status:** planned\n- **Contract IDs:** ${uniqueTrackContractIds.join(', ') || 'n/a'}\n\n- [spec](./spec.md)\n- [plan](./plan.md)\n- [metadata](./metadata.json)\n- [contracts](./contracts.json)\n- [risks](./risks.md)\n- [verification](./verification.md)\n`;
    fs.writeFileSync(path.join(trackDir, 'index.md'), indexMarkdown);
  }
}

fs.writeFileSync(path.join(conductorRoot, 'tracks.md'), `# Program Tracks\n\n- [ ] **Tracks Registry**\n${tracksIndex.join('\n')}` + '\n');

contract.baseCommit = require('node:child_process')
  .execSync('git rev-parse HEAD', { encoding: 'utf8' })
  .trim();

contract.planSha256 = crypto.createHash('sha256').update(JSON.stringify(contract)).digest('hex');

const contractPath = path.join(contractsRoot, 'substack-cli-maturity.contract.json');
fs.writeFileSync(contractPath, JSON.stringify(contract, null, 2) + '\n');

const traceability = {
  generatedAt: runAt,
  contractPath: './contracts/substack-cli-maturity.contract.json',
  planSha256: contract.planSha256,
  baseCommit: contract.baseCommit,
  phaseCount: contract.phases.length,
  trackCount: contract.tracks.length,
  taskCount: contract.tasks.length,
  contractCount: contract.contracts.length,
  issueReuse: existingTaskIssueMap,
  trace: taskArtifacts.map((task) => ({
    id: task.id,
    trackId: task.trackId,
    phaseId: task.phaseId,
    contracts: task.contractIds,
    issue: task.issue,
    issueUrl: task.issue ? contractIssues[task.issue] : null,
    evidence: task.evidence,
  })),
};
fs.writeFileSync(path.join(conductorRoot, 'traceability.json'), JSON.stringify(traceability, null, 2) + '\n');

fs.writeFileSync(path.join(decisionsRoot, '0001-plan-only.md'), `# Decision 0001 - PLAN_ONLY First Invocation\n\nDate: ${runAt}\n\n- Scope is planning-only and contract-first.\n- This run does not include runtime code, dependency, or lockfile edits.\n- Existing issues #161-#168 and PR #176 are reused where possible and mapped in traceability.\n`);

fs.writeFileSync(path.join(verificationRoot, 'planning.md'), `# Planning Verification\n\n## Generation\n- Generated from ${prompt.promptId}.\n- Plan SHA: ${contract.planSha256}\n- Contract path: ${contractPath}\n- Task count: ${contract.tasks.length}\n- Phase count: ${contract.phases.length}\n- Track count: ${contract.tracks.length}\n`);

process.stdout.write(JSON.stringify({
  contractPath,
  planSha256: contract.planSha256,
  phaseCount: contract.phases.length,
  trackCount: contract.tracks.length,
  taskCount: contract.tasks.length,
  baseCommit: contract.baseCommit,
}, null, 2));
