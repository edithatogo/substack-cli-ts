import { execFileSync } from "node:child_process";
import fs from "node:fs";

const mode = process.argv[2] ?? "check";
if (mode !== "check") throw new Error(`unsupported mode: ${mode}`);

const contract = JSON.parse(fs.readFileSync("conductor/contracts/substack-cli-maturity.contract.json", "utf8"));
const programme = JSON.parse(fs.readFileSync("conductor/github-programme.json", "utf8"));
const [owner, repository] = programme.repository.split("/");
const token = process.env.GITHUB_TOKEN || execFileSync("gh", ["auth", "token"], { encoding: "utf8" }).trim();

const query = `query($owner:String!,$repository:String!,$number:Int!){
  repository(owner:$owner,name:$repository){
    issue(number:$number){number title subIssues(first:30){nodes{
      number title subIssues(first:20){nodes{number title subIssues(first:20){nodes{number title}}}}
    }}}
  }
}`;

const response = await fetch("https://api.github.com/graphql", {
  method: "POST",
  headers: { authorization: `Bearer ${token}`, "content-type": "application/json", "user-agent": "substack-cli-programme-check" },
  body: JSON.stringify({ query, variables: { owner, repository, number: programme.programmeIssue } }),
});
if (!response.ok) throw new Error(`GitHub GraphQL returned ${response.status}`);
const payload = await response.json();
if (payload.errors?.length) throw new Error(payload.errors.map((error) => error.message).join("; "));

const root = payload.data?.repository?.issue;
const errors = [];
const children = (issue) => issue?.subIssues?.nodes ?? [];
const byNumber = (issues, number) => issues.find((issue) => issue.number === number);
const expectChild = (parent, expected, label) => {
  const issue = byNumber(children(parent), expected.number);
  if (!issue) errors.push(`${label} #${expected.number} is not nested under #${parent?.number}`);
  else if (issue.title !== expected.title) errors.push(`${label} #${expected.number} title mismatch: ${issue.title}`);
  return issue;
};
const duplicateKeys = (issues, keyFor, label) => {
  const counts = new Map();
  for (const issue of issues) {
    const key = keyFor(issue.title);
    if (key) counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  for (const [key, count] of counts) if (count > 1) errors.push(`${label} has ${count} entries for ${key}`);
};

if (root?.number !== programme.programmeIssue) errors.push(`programme issue #${programme.programmeIssue} was not returned`);
const canonicalPhases = contract.issueMap.phaseIssues;
const supplementalPhases = programme.supplementalPhases;
duplicateKeys(children(root), (title) => title.match(/^(P\d{2})\b/)?.[1], "programme");

for (const phase of contract.phases) {
  const expectedPhase = canonicalPhases[phase.phaseId];
  const actualPhase = expectChild(root, expectedPhase, phase.phaseId);
  duplicateKeys(children(actualPhase), (title) => title.match(/^(T\d{2}-\d{2})\b/)?.[1], phase.phaseId);
  for (const trackId of phase.tracks) {
    const expectedTrack = contract.issueMap.trackIssues[trackId];
    const actualTrack = expectChild(actualPhase, expectedTrack, trackId);
    duplicateKeys(children(actualTrack), (title) => title.match(/(T\d{2}-\d{2}-TASK-\d{2})/)?.[1], trackId);
    for (const task of contract.tasks.filter((entry) => entry.trackId === trackId)) {
      expectChild(actualTrack, contract.issueMap.taskIssues[task.id], task.id);
    }
  }
}

for (const [phaseId, phase] of Object.entries(supplementalPhases)) {
  const actualPhase = expectChild(root, phase, phaseId);
  for (const [trackId, track] of Object.entries(phase.tracks)) {
    const actualTrack = expectChild(actualPhase, track, trackId);
    duplicateKeys(children(actualTrack), (title) => title.match(/^T\d{2}-\d{2} Phase (\d+)/)?.[1], trackId);
    for (const [phaseKey, expected] of Object.entries(track.phases)) expectChild(actualTrack, expected, `${trackId} ${phaseKey}`);
  }
}

if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}
const canonicalTaskCount = Object.keys(contract.issueMap.taskIssues).length;
const supplementalPhaseCount = Object.values(supplementalPhases).flatMap((phase) => Object.values(phase.tracks)).reduce((sum, track) => sum + Object.keys(track.phases).length, 0);
console.log(`GitHub programme valid: ${contract.phases.length + Object.keys(supplementalPhases).length} phases, ${contract.tracks.length + Object.values(supplementalPhases).length} track groups, ${canonicalTaskCount + supplementalPhaseCount} child issues`);
