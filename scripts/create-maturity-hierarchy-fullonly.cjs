const fs = require('fs');
const { execSync } = require('child_process');

const prompt = JSON.parse(fs.readFileSync('CODEX_SUBSTACK_CLI_MATURITY_PROMPT.json', 'utf8'));
const contractPath = 'conductor/contracts/substack-cli-maturity.contract.json';
const contract = JSON.parse(fs.readFileSync(contractPath, 'utf8'));

const ownerRepo = 'edithatogo/substack-cli-ts';
const programmeTitle = prompt.conductorAndGitHubRules.githubHierarchy.programmeIssue;

function run(cmd) { return execSync(cmd, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim(); }
function issueFromCreate(out) {
  const lines = (out || '').trim().split(/\r?\n/).map((x) => x.trim()).filter(Boolean);
  const last = lines.pop();
  const match = /\/(issues\/(\d+))$/.exec(last);
  if (!match) throw new Error(`Unexpected issue create output: ${out}`);
  return { number: Number(match[1].replace('issues/', '')), url: last };
}

const existing = new Map();
const issueListOut = run(`gh issue list --repo ${ownerRepo} --state all --limit 400 --json number,title,url`);
for (const i of JSON.parse(issueListOut || '[]')) {
  existing.set(i.title, { number: i.number, url: i.url, title: i.title });
}

function ensureIssue(title, body, parent) {
  if (existing.has(title)) return existing.get(title);
  const parentFlag = parent ? ` --parent ${parent}` : '';
  const out = run(`gh issue create --repo ${ownerRepo} --title ${JSON.stringify(title)} --body ${JSON.stringify(body)}${parentFlag}`);
  const created = issueFromCreate(out);
  created.title = title;
  existing.set(title, created);
  return created;
}

const roadmap = prompt.roadmap || [];
const trackContractMap = new Map();
for (const c of contract.contracts || []) {
  for (const t of c.mappedTrackIds || []) {
    if (!trackContractMap.has(t)) trackContractMap.set(t, []);
    trackContractMap.get(t).push(c.id);
  }
}

const result = { planningIssue: null, phaseIssues: {}, trackIssues: {}, taskIssues: {} };

result.planningIssue = ensureIssue(programmeTitle, `# ${programmeTitle}\n\nPlan hash: ${contract.planSha256}`, null);
for (const phase of roadmap) {
  const phaseIssue = ensureIssue(`${phase.id} ${phase.title}`, `# ${phase.id}: ${phase.title}\n\nRelease target: ${phase.releaseTarget}`, result.planningIssue.number);
  result.phaseIssues[phase.id] = phaseIssue;

  for (const track of phase.tracks || []) {
    const cids = trackContractMap.get(track.id) || [];
    const trackIssue = ensureIssue(`${track.id} ${track.title}`, `# ${track.id}: ${track.title}\n\nPhase: ${phase.id}\nRelease: ${phase.releaseTarget}\nContracts: ${cids.join(', ') || 'none'}`, phaseIssue.number);
    result.trackIssues[track.id] = trackIssue;

    for (let i = 0; i < (track.requiredTasks || []).length; i++) {
      const taskId = `${track.id}-TASK-${String(i + 1).padStart(2, '0')}`;
      const task = track.requiredTasks[i];
      const title = `${track.id} ${taskId}`;
      const body = `# ${taskId}\n\nTrack: ${track.id}\nPhase: ${phase.id}\nContracts: ${cids.join(', ') || 'none'}\n\n${task}`;
      const issue = ensureIssue(title, body, trackIssue.number);
      result.taskIssues[taskId] = issue;
      const rec = contract.tasks.find((x) => x.id === taskId);
      if (rec) rec.issue = issue;
    }
  }
}

contract.issueMap.planningIssue = result.planningIssue;
contract.issueMap.phaseIssues = result.phaseIssues;
contract.issueMap.trackIssues = result.trackIssues;
contract.issueMap.taskIssues = result.taskIssues;
contract.evidence.github.hierarchyCreated = true;
fs.writeFileSync(contractPath, `${JSON.stringify(contract, null, 2)}\n`, 'utf8');
fs.writeFileSync('docs/architecture/issue-hierarchy-receipt.json', JSON.stringify({ ...result, taskCount: Object.keys(result.taskIssues).length, phaseCount: Object.keys(result.phaseIssues).length, trackCount: Object.keys(result.trackIssues).length }, null, 2) + '\n', 'utf8');

console.log(JSON.stringify({ phases: Object.keys(result.phaseIssues).length, tracks: Object.keys(result.trackIssues).length, tasks: Object.keys(result.taskIssues).length, issuesMapped: Object.keys(contract.tasks).length }, null, 2));

