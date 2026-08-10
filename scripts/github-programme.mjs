import fs from "node:fs";

const contract = JSON.parse(fs.readFileSync("conductor/contracts/substack-cli-maturity.contract.json", "utf8"));
const trace = JSON.parse(fs.readFileSync("conductor/traceability.json", "utf8"));
const programme = JSON.parse(fs.readFileSync("conductor/github-programme.json", "utf8"));
const state = JSON.parse(fs.readFileSync(programme.stateContract, "utf8"));
const registry = fs.readFileSync("conductor/tracks.md", "utf8");
const token = process.env.PROGRAMME_PROJECT_TOKEN || process.env.GITHUB_TOKEN;
if (!token) throw new Error("PROGRAMME_PROJECT_TOKEN or GITHUB_TOKEN is required");

const errors = [];
const headers = { authorization: `Bearer ${token}`, accept: "application/vnd.github+json", "x-github-api-version": "2022-11-28", "user-agent": "substack-cli-programme-check" };
const api = async (path) => {
  const response = await fetch(`https://api.github.com${path}`, { headers });
  if (!response.ok) throw new Error(`${path}: ${response.status} ${await response.text()}`);
  return response.json();
};
const graphql = async (query, variables) => {
  const response = await fetch("https://api.github.com/graphql", { method: "POST", headers: { ...headers, "content-type": "application/json" }, body: JSON.stringify({ query, variables }) });
  const result = await response.json();
  if (!response.ok || result.errors) throw new Error(`GraphQL: ${response.status} ${JSON.stringify(result.errors ?? result)}`);
  return result.data;
};
const children = async (number) => api(`/repos/${state.repository}/issues/${number}/sub_issues?per_page=100`);
const childCache = new Map();
const expectChild = async (parent, child, label) => {
  if (!childCache.has(parent)) childCache.set(parent, children(parent));
  const found = (await childCache.get(parent)).some((item) => item.number === child);
  if (!found) errors.push(`${label} #${child} is not a native subissue of #${parent}`);
};

const issueEntries = [
  ...state.phases.map((x) => ({ ...x, kind: "phase", evidence: "conductor/programme-state.json" })),
  ...state.tracks.map((x) => ({ ...x, kind: "track" })),
  ...state.tasks.map((x) => ({ ...x, kind: "task" })),
];
for (const supplemental of state.supplemental) {
  if (!issueEntries.some((x) => x.issue === supplemental.phaseIssue)) issueEntries.push({ id: supplemental.phase, issue: supplemental.phaseIssue, state: supplemental.state, status: supplemental.state === "CLOSED" ? "Done" : "Todo", kind: "phase", evidence: "conductor/programme-state.json" });
  if (!issueEntries.some((x) => x.issue === supplemental.trackIssue)) issueEntries.push({ id: supplemental.track, issue: supplemental.trackIssue, state: supplemental.state, status: supplemental.state === "CLOSED" ? "Done" : "Todo", kind: "track", evidence: `${supplemental.state === "CLOSED" ? "conductor/archive" : "conductor/tracks"}/${supplemental.track}/verification.md` });
  if (supplemental.verificationIssue) issueEntries.push({ id: `${supplemental.track}-VERIFY-01`, issue: supplemental.verificationIssue, state: "OPEN", status: "Todo", kind: "task", evidence: `${supplemental.track}: verification pending` });
}

const issueResults = await Promise.all(issueEntries.map((entry) => api(`/repos/${state.repository}/issues/${entry.issue}`)));
for (let index = 0; index < issueEntries.length; index += 1) {
  const expected = issueEntries[index]; const actual = issueResults[index];
  if (actual.state.toUpperCase() !== expected.state) errors.push(`${expected.id} issue #${expected.issue}: expected ${expected.state}, got ${actual.state.toUpperCase()}`);
  if (!registry.includes(expected.id) && expected.kind !== "task") errors.push(`${expected.id} missing from conductor/tracks.md`);
}

const hierarchyChecks = [];
for (const phase of state.phases) if (phase.issue) hierarchyChecks.push([state.programmeIssue, phase.issue, phase.id]);
for (const track of state.tracks) {
  const phase = state.phases.find((x) => x.id === track.phase);
  if (phase?.issue && track.issue) hierarchyChecks.push([phase.issue, track.issue, track.id]);
}
for (const task of state.tasks) {
  const track = state.tracks.find((x) => x.id === task.track);
  if (track?.issue && task.issue) hierarchyChecks.push([track.issue, task.issue, task.id]);
}
for (const item of state.supplemental) {
  hierarchyChecks.push([state.programmeIssue, item.phaseIssue, item.phase], [item.phaseIssue, item.trackIssue, item.track]);
  if (item.verificationIssue) hierarchyChecks.push([item.trackIssue, item.verificationIssue, `${item.track}-VERIFY-01`]);
}
for (let offset = 0; offset < hierarchyChecks.length; offset += 25) {
  await Promise.all(hierarchyChecks.slice(offset, offset + 25).map(([parent, child, label]) => expectChild(parent, child, label)));
}

await Promise.all(Object.entries(state.redirects).map(async ([oldNumber, replacement]) => {
  const oldIssue = await api(`/repos/${state.repository}/issues/${oldNumber}`);
  if (oldIssue.state !== "closed") errors.push(`historical issue #${oldNumber} must be closed`);
  const comments = await api(`/repos/${state.repository}/issues/${oldNumber}/comments?per_page=100`);
  if (!comments.some((comment) => comment.body.includes(`#${replacement}`))) errors.push(`historical issue #${oldNumber} does not redirect to #${replacement}`);
}));

const projectItems = [];
let cursor = null;
do {
  const data = await graphql(`query($owner:String!,$number:Int!,$cursor:String){user(login:$owner){projectV2(number:$number){items(first:100,after:$cursor){nodes{id content{... on Issue{number}} fieldValues(first:30){nodes{... on ProjectV2ItemFieldSingleSelectValue{name field{... on ProjectV2FieldCommon{name}}} ... on ProjectV2ItemFieldTextValue{text field{... on ProjectV2FieldCommon{name}}}}}} pageInfo{hasNextPage endCursor}}}}}`, { owner: state.project.owner, number: state.project.number, cursor });
  const page = data.user?.projectV2?.items;
  if (!page) throw new Error(`Project #${state.project.number} is not readable; configure PROGRAMME_PROJECT_TOKEN with read:project`);
  projectItems.push(...page.nodes); cursor = page.pageInfo.hasNextPage ? page.pageInfo.endCursor : null;
} while (cursor);
const projectByIssue = new Map(projectItems.filter((x) => x.content?.number).map((x) => [x.content.number, x]));
for (const expected of issueEntries) {
  const item = projectByIssue.get(expected.issue);
  if (!item) { errors.push(`issue #${expected.issue} missing from Project #${state.project.number}`); continue; }
  const fields = Object.fromEntries(item.fieldValues.nodes.filter((x) => x.field?.name).map((x) => [x.field.name, x.name ?? x.text]));
  if (fields.Status !== expected.status) errors.push(`Project issue #${expected.issue}: expected Status=${expected.status}, got ${fields.Status ?? "<unset>"}`);
  if (expected.status === "Done" && (!fields.Evidence || fields.Evidence === "planned")) errors.push(`Project issue #${expected.issue}: Done requires non-planned Evidence`);
}

const contractTrack = new Map(contract.tracks.map((x) => [x.id, x]));
for (const expected of state.tracks) {
  const item = contractTrack.get(expected.id);
  if (!item) errors.push(`${expected.id} missing from canonical contract`);
  else if (item.status !== (expected.status === "Done" ? "contract_verified" : expected.id === "T08-04" ? "implemented" : "planned")) errors.push(`${expected.id} canonical status disagrees with programme ledger`);
  if (trace.tracks?.[expected.id]?.status !== item?.status) errors.push(`${expected.id} traceability status disagrees with contract`);
}

if (errors.length) { console.error(errors.join("\n")); process.exit(1); }
console.log(`Programme state valid: ${state.phases.length} canonical phases, ${state.tracks.length} canonical tracks, ${state.tasks.length} canonical tasks, ${issueEntries.length} evidenced Project items`);
