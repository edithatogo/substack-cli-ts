const fs = require('fs');
const { execSync } = require('child_process');

const prompt = JSON.parse(fs.readFileSync('CODEX_SUBSTACK_CLI_MATURITY_PROMPT.json', 'utf8'));
const contractPath = 'conductor/contracts/substack-cli-maturity.contract.json';
const contract = JSON.parse(fs.readFileSync(contractPath, 'utf8'));

function run(cmd) {
  return execSync(cmd, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
}

function listIssues() {
  const all = [];
  for (let page = 1; page <= 20; page++) {
    const out = run(`gh api "repos/edithatogo/substack-cli-ts/issues?state=all&per_page=100&page=${page}"`);
    const arr = JSON.parse(out || '[]');
    if (!Array.isArray(arr) || arr.length === 0) break;
    all.push(...arr);
    if (arr.length < 100) break;
  }
  return all;
}

const byTitle = new Map();
for (const i of listIssues()) {
  if (!byTitle.has(i.title)) byTitle.set(i.title, i);
}

function createIssueREST(title, body) {
  if (byTitle.has(title)) return byTitle.get(title);
  const out = run(`gh api repos/edithatogo/substack-cli-ts/issues -X POST -f title=${JSON.stringify(title)} -f body=${JSON.stringify(body)}`);
  const created = JSON.parse(out);
  byTitle.set(title, created);
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

const out = { planning: null, phases: {}, tracks: {}, tasks: {} };
out.planning = createIssueREST(
  prompt.conductorAndGitHubRules.githubHierarchy.programmeIssue,
  `# ${prompt.conductorAndGitHubRules.githubHierarchy.programmeIssue}\n\nPlan hash: ${contract.planSha256}`
);

for (const phase of roadmap) {
  const phaseTitle = `${phase.id} ${phase.title}`;
  const phaseIssue = createIssueREST(phaseTitle, `# ${phaseTitle}\n\nRelease target: ${phase.releaseTarget}`);
  out.phases[phase.id] = { number: phaseIssue.number, url: phaseIssue.html_url, title: phaseIssue.title };

  for (const track of phase.tracks || []) {
    const cids = trackContractMap.get(track.id) || [];
    const trackTitle = `${track.id} ${track.title}`;
    const trackIssue = createIssueREST(trackTitle, `# ${trackTitle}\n\nPhase: ${phase.id}\nRelease: ${phase.releaseTarget}\nContracts: ${cids.join(', ') || 'none'}`);
    out.tracks[track.id] = { number: trackIssue.number, url: trackIssue.html_url, title: trackIssue.title };

    for (let i = 0; i < (track.requiredTasks || []).length; i++) {
      const taskId = `${track.id}-TASK-${String(i + 1).padStart(2, '0')}`;
      const taskTitle = `${track.id} ${taskId}`;
      const taskText = track.requiredTasks[i];
      const issue = createIssueREST(taskTitle, `# ${taskId}\n\nTrack: ${track.id}\nPhase: ${phase.id}\nContracts: ${cids.join(', ') || 'none'}\n\n${taskText}`);
      out.tasks[taskId] = { number: issue.number, url: issue.html_url, title: issue.title };
      const rec = contract.tasks.find((x) => x.id === taskId);
      if (rec) rec.issue = { number: issue.number, url: issue.html_url, title: issue.title };
    }
  }
}

contract.issueMap.planningIssue = { number: out.planning.number, url: out.planning.html_url, title: out.planning.title };
contract.issueMap.phaseIssues = out.phases;
contract.issueMap.trackIssues = out.tracks;
contract.issueMap.taskIssues = out.tasks;
contract.evidence.github.hierarchyCreated = true;

fs.writeFileSync(contractPath, `${JSON.stringify(contract, null, 2)}\n`);
fs.writeFileSync('docs/architecture/issue-hierarchy-receipt.json', JSON.stringify(out, null, 2));

console.log(JSON.stringify({
  programme: out.planning.number,
  phases: Object.keys(out.phases).length,
  tracks: Object.keys(out.tracks).length,
  tasks: Object.keys(out.tasks).length,
}, null, 2));
