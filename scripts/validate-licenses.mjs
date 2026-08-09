import { readFile } from "node:fs/promises";

const lock = JSON.parse(await readFile("package-lock.json", "utf8"));
const prohibited = /(^|\s|\()A?GPL-(?:1\.0|2\.0|3\.0)(?:-only|-or-later)?($|\s|\))/i;
const failures = [];

for (const [path, metadata] of Object.entries(lock.packages ?? {})) {
  if (!path.startsWith("node_modules/") || metadata.dev === true) continue;
  const license = metadata.license;
  if (typeof license === "string" && prohibited.test(license)) failures.push(`${path}: ${license}`);
}

if (failures.length) {
  console.error(`Prohibited production licences:\n${failures.join("\n")}`);
  process.exit(1);
}
console.log("Production dependency licence policy passed.");
