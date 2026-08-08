const fs = require('fs');
const { execSync } = require('child_process');

const prompt = JSON.parse(fs.readFileSync('CODEX_SUBSTACK_CLI_MATURITY_PROMPT.json', 'utf8'));
const contractPath = 'conductor/contracts/substack-cli-maturity.contract.json';
const contract = JSON.parse(fs.readFileSync(contractPath, 'utf8'));
const owner = 'edithatogo';
const repo = 'substack-cli-ts';
const fullRepo = `${owner}/${repo}`;
const roadmap = prompt.roadmap || [];
const projectTitle = 'Substack CLI frontier-mainline maturity programme to 1.0';
const programmeIssueTitle = prompt.conductorAndGitHubRules.githubHierarchy.programmeIssue;

function run(cmd) {
  return execSync(cmd, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
}

function parseIssueUrlFromCreate(out) {
  const t = (out || '').trim().split(/\r?\n/).map((x) => x.trim()).filter(Boolean).pop();
  const m = /\/(issues\/(\d+))$/.exec(t || '');
  if (!m) throw new Error(`Cannot parse issue URL from: ${out}`);
  return { url: t, number: Number(m[1].replace('issues/', '')) };
}

function findIssueByTitle(title) {
  try {
    const out = run(`gh issue list --repo ${fullRepo} --search ${JSON.stringify(`"${title}" in:title`)} --state all --limit 20 --json number,url,title`);
    const arr = JSON.parse(out || '[]');
    const found = arr.find((i) => i.title === title);
    return found || null;
  } catch {
    return null;
  }
}

function createIssue({ title, body, parent }) {
  const exists = findIssueByTitle(title);
  if (exists) return { ...exists, title };
  const parentFlag = parent ? ` --parent ${parent}` : '';
  const out = run(`gh issue create --repo ${fullRepo} --title ${JSON.stringify(title)} --body ${JSON.stringify(body)}${parentFlag}`);
  const parsed = parseIssueUrlFromCreate(out);
  return { ...parsed, title };
}

function getProject() {
  const out = run(`gh project list --owner ${owner} --format json`);
  const parsed = JSON.parse(out);
  return Array.isArray(parsed.projects) ? parsed.projects.find((p) => p.title === projectTitle) : null;
}

function getProjectNumber() {
  const project = getProject();
  if (project) return project.number;
  const created = run(`gh project create --owner ${owner} --title ${JSON.stringify(projectTitle)} --format json`);
  return JSON.parse(created).number;
}

function projectFieldMap(projectNumber) {
  const out = run(`gh project field-list ${projectNumber} --owner ${owner} --format json`);
  const parsed = JSON.parse(out);
  const fields = Array.isArray(parsed.fields) ? parsed.fields : [];
  return Object.fromEntries(fields.map((f) => [f.name, f]));
}

function ensureField(projectNumber, fields, name, dataType, options) {
  if (fields[name]) return;
  let cmd = `gh project field-create ${projectNumber} --owner ${owner} --name ${JSON.stringify(name)} --data-type ${dataType}`;
  if (options) cmd += ` --single-select-options ${JSON.stringify(options.join(','))}`;
  run(cmd);
}

function getProjectItems(projectNumber) {
  const out = run(`gh project item-list ${projectNumber} --owner ${owner} --format json`);
  const parsed = JSON.parse(out);
  const items = Array.isArray(parsed.items) ? parsed.items : [];
  const map = new Map();
  for (const item of items) {
    const url = item.content?.url;
    if (url) map.set(url, item);
    const title = item.content?.title;
    if (title) map.set(`title:${title}`, item);
  }
  return { raw: items, map };
}

function addToProject(projectNumber, issueUrl, projectItems) {
  const existing = projectItems.get(issueUrl);
  if (existing) return existing;
  const out = run(`gh project item-add ${projectNumber} --owner ${owner} --url ${JSON.stringify(issueUrl)} --format json`);
  const item = JSON.parse(out);
  projectItems.set(issueUrl, item);
  const parsed = item.content ? item.content : {};
  if (parsed.url) {
    projectItems.set(parsed.url, item);
  }
  return item;
}

function setText(projectId, itemId, field, value) {
  if (!field) return;
  try {
    run(`gh project item-edit --project-id ${JSON.stringify(projectId)} --id ${JSON.stringify(itemId)} --field-id ${JSON.stringify(field.id)} --text ${JSON.stringify(String(value ?? ''))} --format json`);
  } catch {
    // keep going
  }
}

function setSingle(projectId, itemId, field, value) {
  if (!field || !Array.isArray(field.options)) return;
  const m = field.options.find((o) => o.name === value);
  if (!m) return;
  try {
    run(`gh project item-edit --project-id ${JSON.stringify(projectId)} --id ${JSON.stringify(itemId)} --field-id ${JSON.stringify(field.id)} --single-select-option-id ${JSON.stringify(m.id)} --format json`);
  } catch {
    // keep going
  }
}

function trackContracts(trackId) {
  return (contract.contracts || [])
    .filter((c) => (c.mappedTrackIds || []).includes(trackId))
    .map((c) => c.id);
}

function maybeAttachExisting(parentNum, issueNum) {
  try {
    const query = 'mutation($input: AddSubIssueInput!) { addSubIssue(input: $input) { clientMutationId } }';
    const parentId = run(`gh issue view ${parentNum} --repo ${fullRepo} --json id --jq .id`);
    const childId = run(`gh issue view ${issueNum} --repo ${fullRepo} --json id --jq .id`);
    const input = JSON.stringify({ parentId, issueId: childId });
    run(`gh api graphql -f query=${JSON.stringify(query)} -f input=${JSON.stringify(input)}`);
    return true;
  } catch {
    return false;
  }
}

const projectNumber = getProjectNumber();
let fields = projectFieldMap(projectNumber);
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
for (const [n, t, options] of required) ensureField(projectNumber, fields, n, t, options);
fields = projectFieldMap(projectNumber);
const projectItems = getProjectItems(projectNumber).map;

const project = JSON.parse(run(`gh project list --owner ${owner} --format json`)).projects.find((p) => p.title === projectTitle);
const projectId = project.id;

const result = {
  planningIssue: null,
  phaseIssues: {},
  trackIssues: {},
  taskIssues: {},
  existingReused: {},
  existingReusedFailures: {},
  projectUrl: `https://github.com/users/${owner}/projects/${projectNumber}`,
};

const planning = createIssue({
  title: programmeIssueTitle,
  body: `# Programme issue\n\nPlan SHA: ${contract.planSha256}`,
});
result.planningIssue = planning;
addToProject(projectNumber, planning.url, projectItems);

for (const phase of roadmap) {
  const phaseIssue = createIssue({
    title: `${phase.id} ${phase.title}`,
    body: `# ${phase.id} ${phase.title}\n\nRelease target: ${phase.releaseTarget}`,
    parent: planning.number,
  });
  result.phaseIssues[phase.id] = phaseIssue;
  const phaseItem = addToProject(projectNumber, phaseIssue.url, projectItems);
  setText(projectId, phaseItem.id || phaseItem, fields['Phase'], phase.id);
  setText(projectId, phaseItem.id || phaseItem, fields['Release'], phase.releaseTarget || 'planning');

  for (const track of phase.tracks || []) {
    const cids = trackContracts(track.id);
    const risk = cids.length ? 'high' : 'medium';
    const trackIssue = createIssue({
      title: `${track.id} ${track.title}`,
      body: `# ${track.id} ${track.title}\n\nPhase: ${phase.id}\nRelease: ${phase.releaseTarget}\nContracts: ${cids.join(', ') || 'none'}`,
      parent: phaseIssue.number,
    });
    result.trackIssues[track.id] = trackIssue;
    const trackItem = addToProject(projectNumber, trackIssue.url, projectItems);
    const trackFieldIds = [
      ['Phase', phase.id],
      ['Track', track.id],
      ['Contract IDs', cids.join(', ') || 'none'],
      ['Release', phase.releaseTarget || 'planning'],
    ];
    for (const [k, v] of trackFieldIds) {
      if (k === 'Risk') setSingle(projectId, trackItem.id || trackItem, fields[k], risk); else setText(projectId, trackItem.id || trackItem, fields[k], v);
    }
    setSingle(projectId, trackItem.id || trackItem, fields['Risk'], risk);

    const tasks = track.requiredTasks || [];
    const existing = track.existingIssues || [];

    for (let i = 0; i < tasks.length; i++) {
      const taskId = `${track.id}-TASK-${String(i + 1).padStart(2, '0')}`;
      const taskText = tasks[i];
      let taskIssue = null;

      const reuse = existing[i];
      if (reuse) {
        const ok = maybeAttachExisting(trackIssue.number, reuse);
        if (ok) {
          taskIssue = { number: reuse, url: `https://github.com/${fullRepo}/issues/${reuse}`, title: `${track.id} ${taskId}` };
          result.existingReused[taskId] = reuse;
        } else {
          result.existingReusedFailures[taskId] = reuse;
        }
      }

      if (!taskIssue) {
        taskIssue = createIssue({
          title: `${track.id} ${taskId}`,
          body: `# ${track.id} ${taskId}\n\nTrack: ${track.id}\nPhase: ${phase.id}\nContracts: ${cids.join(', ') || 'none'}\n\n${taskText}`,
          parent: trackIssue.number,
        });
      }

      result.taskIssues[taskId] = taskIssue;
      const taskItem = addToProject(projectNumber, taskIssue.url, projectItems);
      const taskSet = [
        ['Phase', phase.id],
        ['Track', track.id],
        ['Task', taskId],
        ['Contract IDs', cids.join(', ') || 'none'],
        ['Release', phase.releaseTarget || 'planning'],
        ['Evidence', 'planned'],
      ];
      for (const [k, v] of taskSet) {
        if (k === 'Risk') {
          setSingle(projectId, taskItem.id || taskItem, fields[k], risk);
        } else {
          setText(projectId, taskItem.id || taskItem, fields[k], v);
        }
      }
      setSingle(projectId, taskItem.id || taskItem, fields['Risk'], risk);

      const tref = contract.tasks.find((x) => x.id === taskId);
      if (tref) {
        tref.issue = taskIssue;
      }
    }
  }
}

contract.issueMap.planningIssue = result.planningIssue;
contract.issueMap.phaseIssues = result.phaseIssues;
contract.issueMap.trackIssues = result.trackIssues;
contract.issueMap.taskIssues = result.taskIssues;
contract.evidence.github.hierarchyCreated = true;
contract.evidence.github.projectCreated = true;
fs.writeFileSync(contractPath, `${JSON.stringify(contract, null, 2)}\n`, 'utf8');
fs.writeFileSync('docs/architecture/issue-hierarchy-receipt.json', JSON.stringify(result, null, 2) + '\n', 'utf8');

console.log(JSON.stringify({
  created: {
    phases: Object.keys(result.phaseIssues).length,
    tracks: Object.keys(result.trackIssues).length,
    tasks: Object.keys(result.taskIssues).length,
  },
  reused: Object.keys(result.existingReused).length,
  reattachFailed: Object.keys(result.existingReusedFailures).length,
  project: result.projectUrl,
}, null, 2));

