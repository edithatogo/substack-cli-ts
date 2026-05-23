import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const packageJson = JSON.parse(readFileSync(resolve(root, "package.json"), "utf8"));

const required = String(packageJson.engines?.node ?? "")
  .replace(/[^\d.]/g, "")
  .split(".")
  .map(Number);
const current = process.version.slice(1).split(".").map(Number);

const [requiredMajor = 0, requiredMinor = 0] = required;
const [currentMajor = 0, currentMinor = 0] = current;

process.exit(currentMajor > requiredMajor || (currentMajor === requiredMajor && currentMinor >= requiredMinor) ? 0 : 1);
