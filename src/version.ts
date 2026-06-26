/**
 * Single source of truth for the package version.
 *
 * The version is read from the project-root `package.json` at module load.
 * Every runtime surface (CLI `--version`, MCP server handshake, contract
 * renderer) imports {@link PACKAGE_VERSION} so the version can never drift
 * between surfaces. The MCP registry metadata (`registry.server.json`) and the
 * `version:check` script additionally guard against literal drift.
 *
 * To cut a new release, bump `version` in `package.json` and run
 * `npm run version:check` to confirm every consumer is in sync.
 */

import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const moduleFile = fileURLToPath(import.meta.url);
const projectRoot = resolve(dirname(moduleFile), "..");

function readVersion(): string {
  const manifestPath = resolve(projectRoot, "package.json");
  const parsed = JSON.parse(readFileSync(manifestPath, "utf8")) as {
    version?: unknown;
  };
  const version = parsed.version;
  if (typeof version !== "string" || version.trim() === "") {
    throw new Error(
      `package.json at ${manifestPath} is missing a non-empty \`version\` field.`,
    );
  }
  return version;
}

export const PACKAGE_VERSION: string = readVersion();

export function getPackageVersion(): string {
  return PACKAGE_VERSION;
}
