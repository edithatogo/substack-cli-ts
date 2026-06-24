import {
  buildRegistrySubmissionPlan,
  loadRegistryServerMetadata,
  summarizeRegistryServerMetadata,
} from "../dist/registry/metadata.js";

const metadata = loadRegistryServerMetadata();
const summary = summarizeRegistryServerMetadata(metadata);
const plan = buildRegistrySubmissionPlan(metadata);
const mode = process.argv[2];

if (mode === "--publish-command") {
  console.log(plan.publisherCommand.join(" "));
} else if (mode === "--launch-command") {
  console.log(plan.packageLaunchCommand.join(" "));
} else {
  console.log(JSON.stringify(summary, null, 2));
}

if (plan.validationIssues.length > 0) {
  process.exitCode = 1;
}
