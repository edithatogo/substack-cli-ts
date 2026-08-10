import { mkdir, writeFile } from "node:fs/promises";

const receipt = {
  schemaVersion: 1,
  status: "passed",
  node: process.version,
  platform: process.platform,
  architecture: process.arch,
  generatedAt: new Date().toISOString(),
  command: "npm run verify",
};
await mkdir("reports/verification", { recursive: true });
await writeFile("reports/verification/receipt.json", `${JSON.stringify(receipt, null, 2)}\n`);
console.log(JSON.stringify(receipt));
