import { access, readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const taxonomy = JSON.parse(await readFile(resolve(root, "test/testing-taxonomy.json"), "utf8"));
const packageJson = JSON.parse(await readFile(resolve(root, "package.json"), "utf8"));
const ci = await readFile(resolve(root, ".github/workflows/ci.yml"), "utf8");
const requiredIds = new Set([
  "unit", "regression", "integration", "end-to-end", "smoke", "edge", "mutation",
  "property-based", "deterministic-simulation", "consumer-driven-contract", "metamorphic",
  "autonomous-agentic", "semantic-llm-judge", "network-replay-vcr", "tui-cli-integration",
  "zod-schema-fuzz",
]);
const seen = new Set();

if (taxonomy.schemaVersion !== 1 || !Array.isArray(taxonomy.modalities)) {
  throw new Error("Testing taxonomy must use schemaVersion 1 and contain modalities.");
}
for (const modality of taxonomy.modalities) {
  if (seen.has(modality.id)) throw new Error(`Duplicate testing modality: ${modality.id}`);
  seen.add(modality.id);
  if (!packageJson.scripts?.[modality.script]) throw new Error(`Missing script ${modality.script}`);
  if (modality.deterministic !== true) throw new Error(`Required taxonomy entry is not deterministic: ${modality.id}`);
  if (!Array.isArray(modality.evidence) || modality.evidence.length === 0) {
    throw new Error(`Missing evidence for ${modality.id}`);
  }
  for (const evidence of modality.evidence) await access(resolve(root, evidence));
}
for (const id of requiredIds) if (!seen.has(id)) throw new Error(`Missing testing modality: ${id}`);
if (seen.size !== requiredIds.size) throw new Error("Taxonomy contains an unreviewed testing modality.");
if (!ci.includes(taxonomy.requiredCiCommand)) {
  throw new Error("Required assurance command is not enforced by CI.");
}
console.log(JSON.stringify({ status: "passed", modalityCount: seen.size, requiredCiCommand: taxonomy.requiredCiCommand }, null, 2));
