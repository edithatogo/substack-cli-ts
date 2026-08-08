const fs = require('fs');
const { execSync } = require('child_process');

const prompt = JSON.parse(fs.readFileSync('CODEX_SUBSTACK_CLI_MATURITY_PROMPT.json', 'utf8'));
const contractPath = 'conductor/contracts/substack-cli-maturity.contract.json';
const contract = JSON.parse(fs.readFileSync(contractPath, 'utf8'));

const owner = 'edithatogo';
const repo = 'substack-cli-ts';
const fullRepo = `${owner}/${repo}`;
const projectTitle = 'Substack CLI frontier-mainline maturity programme to 1.0';
const programmeTitle = prompt.conductorAndGitHubRules.githubHierarchy.programmeIssue;
const roadmap = prompt.roadmap || [];

function run(cmd, opts = {}) {
  return execSync(cmd, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'], ...opts }).trim();
}

function parseIssueFromOutput(out) {
  const txt = (out || '').split(/\r?\n/).map((x) => x.trim()).filter(Boolean).pop();
  const m = txt ? txt.match(/\/(issues\/)(\d+)$/) : null;
  const number = m ? Number(m[2]) : null;
  return { url: txt || null, number };
}

function findIssueByTitle(title) {
  const out = run(`gh issue list --repo ${fullRepo} --search ${JSON.stringify(`"${title}" in:title`)} --state all --limit 5 --json number,url,title`);
  const issues = JSON.parse(out || '[]');
  return issues.find((i) => i.title === title) || null;
}

function createIssue({ title, body, parent }) {
  const existing = findIssueByTitle(title);
  if (existing) return existing;
  let cmd = `gh issue create --repo ${fullRepo} --title ${JSON.stringify(title)} --body ${JSON.stringify(body)}`;
  if (parent) cmd += ` --parent ${parent}`;
  const out = run(cmd);
  const parsed = parseIssueFromOutput(out);
  if (!parsed.url) throw new Error(`cannot parse issue output: ${out}`);
  return { ...parsed, title };
}

function getProjectList() {
  const out = run(`gh project list --owner ${owner} --format json`);
  const parsed = JSON.parse(out);
  return Array.isArray(parsed?.projects) ? parsed.projects : [];
}

function createOrGetProject() {
  const found = getProjectList().find((p) => p.title === projectTitle);
  if (found) return found;
  const out = run(`gh project create --owner ${owner} --title ${JSON.stringify(projectTitle)} --format json`);
  return JSON.parse(out);
}

function getProjectFields(projectNumber) {
  const out = run(`gh project field-list ${projectNumber} --owner ${owner} --format json`);
  const parsed = JSON.parse(out);
  return Array.isArray(parsed?.fields) ? parsed.fields : [];
}

function ensureField(projectNumber, fields, name, dataType, options) {
  if (fields.find((f) => f.name === name)) return;
  let cmd = `gh project field-create ${projectNumber} --owner ${owner} --name ${JSON.stringify(name)} --data-type ${dataType}`;
  if (options) cmd += ` --single-select-options ${JSON.stringify(options.join(','))}`;
  run(cmd);
}

function addToProject(projectNumber, issueUrl) {
  const out = run(`gh project item-add ${projectNumber} --owner ${owner} --url ${JSON.stringify(issueUrl)} --format json`);
  return JSON.parse(out);
}

function setText(projectId, itemId, field, value) {
  if (!field) return;
  run(`gh project item-edit --project-id ${JSON.stringify(projectId)} --id ${JSON.stringify(itemId)} --field-id ${JSON.stringify(field.id)} --text ${JSON.stringify(value || '')} --format json`);
}

function setSingle(projectId, itemId, field, value) {
  if (!field || !Array.isArray(field.options)) return;
  const match = field.options.find((o) => o.name === value);
  if (!match) return;
  run(`gh project item-edit --project-id ${JSON.stringify(projectId)} --id ${JSON.stringify(itemId)} --field-id ${JSON.stringify(field.id)} --single-select-option-id ${JSON.stringify(match.id)} --format json`);
}

function maybeAttachExistingToParent(parentNum, existingNum) {
  try {
    const p = run(`gh issue view ${parentNum} --repo ${fullRepo} --json id --jq .id`);
    const c = run(`gh issue view ${existingNum} --repo ${fullRepo} --json id --jq .id`);
    const query = 'mutation($input: AddSubIssueInput!) { addSubIssue(input: $input) { clientMutationId } }';
    const input = JSON.stringify({ parentId: p, issueId: c });
    run(`gh api graphql -f query=${JSON.stringify(query)} -f input=${JSON.stringify(input)}`);
    return true;
  } catch {
    return false;
  }
}

function trackContractIds(trackId) {
  return (contract.contracts || [])
    .filter((c) => (c.mappedTrackIds || []).includes(trackId))
    .map((c) => c.id);
}

const project = createOrGetProject();
const projectNumber = project.number;
const projectId = project.id;
let fields = getProjectFields(projectNumber);

const required = [
  ['Phase', 'TEXT', null],
  ['Track', 'TEXT', null],
  ['Task', 'TEXT', null],
  ['Contract IDs', 'TEXT', null],
  ['Priority', 'SINGLE_SELECT', ['high', 'medium', 'low']],
  ['Risk', 'SINGLE_SELECT', ['high', 'medium', 'low']],
  ['Status', 'SINGLE_SELECT', ['planned', 'in_progress', 'implemented', 'unit_verified', 'contract_verified', 'simulator_verified', 'canary_verified', 'production_observed', 'externally_blocked', 'deprecated']],
  ['Evidence', 'TEXT', null],
  ['Release', 'TEXT', null],
  ['Blocker', 'TEXT', null],
  ['External gate', 'TEXT', null],
];
for (const [n, t, opts] of required) ensureField(projectNumber, fields, n, t, opts);
fields = getProjectFields(projectNumber);
const fieldMap = Object.fromEntries(fields.map((f) => [f.name, f]));

const output = {
  planningIssue: null,
  phaseIssues: {},
  trackIssues: {},
  taskIssues: {},
  existingReparented: {},
  existingReparentFailed: {},
  project: { id: projectId, number: projectNumber, title: project.title || projectTitle },
};

console.log('create/get programme issue');
const planning = createIssue({
  title: programmeTitle,
  body: `# Programme\n\nPlan SHA: ${contract.planSha256}\nPrompt SHA: ${prompt.contentSha256}`
});
output.planningIssue = planning;

for (const phase of roadmap) {
  const phaseIssue = createIssue({
    title: `${phase.id} ${phase.title}`,
    body: `# ${phase.id} ${phase.title}\n\nRelease target: ${phase.releaseTarget}`,
    parent: planning.number,
  });
  output.phaseIssues[phase.id] = phaseIssue;

  const phaseItem = addToProject(projectNumber, phaseIssue.url);
  setText(projectId, phaseItem.id, fieldMap['Phase'], phase.id);
  setText(projectId, phaseItem.id, fieldMap['Release'], phase.releaseTarget || 'planning');
  setSingle(projectId, phaseItem.id, fieldMap['Status'], 'planned');

  for (const track of phase.tracks || []) {
    const contractsForTrack = trackContractIds(track.id);
    const risk = contractsForTrack.length ? 'high' : 'medium';

    const trackIssue = createIssue({
      title: `${track.id} ${track.title}`,
      body: `# ${track.id} ${track.title}\n\nPhase: ${phase.id}\nRelease: ${phase.releaseTarget}\nContracts: ${contractsForTrack.join(', ') || 'none'}`,
      parent: phaseIssue.number,
    });
    output.trackIssues[track.id] = trackIssue;

    const trackItem = addToProject(projectNumber, trackIssue.url);
    setText(projectId, trackItem.id, fieldMap['Phase'], phase.id);
    setText(projectId, trackItem.id, fieldMap['Track'], track.id);
    setText(projectId, trackItem.id, fieldMap['Contract IDs'], contractsForTrack.join(', ') || 'none');
    setText(projectId, trackItem.id, fieldMap['Release'], phase.releaseTarget || 'planning');
    setSingle(projectId, trackItem.id, fieldMap['Risk'], risk);

    const tasks = track.requiredTasks || [];
    const existing = track.existingIssues || [];
    for (let i = 0; i < tasks.length; i++) {
      const taskId = `${track.id}-TASK-${String(i + 1).padStart(2, '0')}`;
      const taskTitle = `${track.id} ${taskId}`;
      const taskText = tasks[i];
      let taskIssue = null;
      const reuseExisting = existing[i] || null;

      if (reuseExisting) {
        if (maybeAttachExistingToParent(trackIssue.number, reuseExisting)) {
          taskIssue = { number: reuseExisting, url: `https://github.com/${fullRepo}/issues/${reuseExisting}` };
          output.existingReparented[taskId] = reuseExisting;
        } else {
          output.existingReparentFailed[taskId] = reuseExisting;
        }
      }

      if (!taskIssue) {
        taskIssue = createIssue({
          title: taskTitle,
          body: `# ${taskTitle}\n\nTrack: ${track.id}\nPhase: ${phase.id}\nContracts: ${contractsForTrack.join(', ') || 'none'}\n\n${taskText}`,
          parent: trackIssue.number,
        });
      }
      output.taskIssues[taskId] = taskIssue;

      const taskItem = addToProject(projectNumber, taskIssue.url);
      setText(projectId, taskItem.id, fieldMap['Phase'], phase.id);
      setText(projectId, taskItem.id, fieldMap['Track'], track.id);
      setText(projectId, taskItem.id, fieldMap['Task'], taskId);
      setText(projectId, taskItem.id, fieldMap['Contract IDs'], contractsForTrack.join(', ') || 'none');
      setText(projectId, taskItem.id, fieldMap['Release'], phase.releaseTarget || 'planning');
      setText(projectId, taskItem.id, fieldMap['Evidence'], 'planned');
      setSingle(projectId, taskItem.id, fieldMap['Risk'], risk);

      const tref = contract.tasks.find((t) => t.id === taskId);
      if (tref) tref.issue = taskIssue;
    }
  }
}

contract.issueMap.planningIssue = planning;
contract.issueMap.phaseIssues = output.phaseIssues;
contract.issueMap.trackIssues = output.trackIssues;
contract.issueMap.taskIssues = output.taskIssues;
contract.evidence.github.hierarchyCreated = true;
contract.evidence.github.projectCreated = true;
fs.writeFileSync(contractPath, `${JSON.stringify(contract, null, 2)}\n`, 'utf8');
fs.writeFileSync('docs/architecture/issue-hierarchy-receipt.json', `${JSON.stringify(output, null, 2)}\n`, 'utf8');

console.log(JSON.stringify({
  planning: planning,
  phases: Object.keys(output.phaseIssues).length,
  tracks: Object.keys(output.trackIssues).length,
  tasks: Object.keys(output.taskIssues).length,
  existingReattached: Object.keys(output.existingReparented).length,
  existingReattachFailed: Object.keys(output.existingReparentFailed).length,
  project: `https://github.com/users/${owner}/projects/${projectNumber}`,
}, null, 2));
