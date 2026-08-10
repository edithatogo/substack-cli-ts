import { readFile } from "node:fs/promises";

const CURRENT_NODE = "26.5.1";
const REQUIRED_OS = ["ubuntu-latest", "windows-latest", "macos-latest"];

export function validateCiContract({ packageJson, ci, compatibility, hardening }) {
  const failures = [];
  if (packageJson.packageManager !== "npm@11.17.0") failures.push("npm must be pinned to 11.17.0");
  if (packageJson.engines?.node !== ">=22.0.0") failures.push("Node support must exclude EOL Node 20");
  if (!packageJson.scripts?.verify?.includes("verification-receipt.mjs")) {
    failures.push("the strict verification command must emit a receipt");
  }
  for (const os of REQUIRED_OS) {
    if (!compatibility.includes(`os: ${os}, node: ${CURRENT_NODE}`)) {
      failures.push(`missing required ${os} / Node ${CURRENT_NODE} matrix entry`);
    }
  }
  for (const workflow of [ci, compatibility, hardening]) {
    if (!workflow.includes("timeout-minutes:")) failures.push("workflow job lacks a bounded timeout");
    if (!workflow.includes("permissions:")) failures.push("workflow lacks explicit permissions");
  }
  if (hardening.includes("Experimental Dependency Lane")) {
    failures.push("experimental dependency lanes are forbidden by the canonical contract");
  }
  return failures;
}

if (process.argv[1] && import.meta.url === new URL(process.argv[1], "file:").href) {
  const [packageJson, ci, compatibility, hardening] = await Promise.all([
    readFile("package.json", "utf8").then(JSON.parse),
    readFile(".github/workflows/ci.yml", "utf8"),
    readFile(".github/workflows/compatibility-matrix.yml", "utf8"),
    readFile(".github/workflows/hardening.yml", "utf8"),
  ]);
  const failures = validateCiContract({ packageJson, ci, compatibility, hardening });
  if (failures.length > 0) throw new Error(failures.join("\n"));
  console.log(`CI contract valid: Node ${CURRENT_NODE}, npm 11.17.0, ${REQUIRED_OS.length} required operating systems.`);
}
