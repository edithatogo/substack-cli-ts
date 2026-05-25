import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();

function readJson(path) {
  try {
    const raw = readFileSync(join(root, path), "utf8").replace(/^\uFEFF/, "");
    return JSON.parse(raw);
  } catch (error) {
    throw new Error(`Failed to read or parse ${path}: ${error.message}`);
  }
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const packageJson = readJson("package.json");
const registry = readJson("registry.server.json");

assert(registry.name === "io.github.edithatogo/substack-cli", "Registry name is incorrect.");
assert(registry.transport === "stdio", "Registry transport must be stdio.");
assert(Array.isArray(registry.packages), "Registry must define a packages array.");
assert(registry.packages.length === 1, "Registry must define exactly one package.");
assert(
  registry.packages[0].identifier === packageJson.name,
  "Registry package identifier must match package.json name.",
);
assert(packageJson.mcpName === registry.name, "package.json mcpName must match registry name.");
assert(
  registry.packages[0].mcpName === registry.name,
  "Registry package mcpName must match registry name.",
);
assert(registry.packages[0].version === packageJson.version, "Registry package version must match package.json version.");
assert(registry.packages[0].entrypoint === "dist/cli.js", "Registry entrypoint must be dist/cli.js.");

const expectedServer = {
  command: "npx",
  args: ["-y", packageJson.name, "mcp", "serve"],
};

for (const client of ["claude", "codex", "copilot", "gemini"]) {
  const manifest = readJson(`extensions/${client}/package.json`);
  const server = manifest.mcpServers?.["substack-cli"];
  assert(server, `extensions/${client}/package.json must define mcpServers.substack-cli.`);
  assert(server.command === expectedServer.command, `${client} command must be npx.`);
  assert(
    JSON.stringify(server.args) === JSON.stringify(expectedServer.args),
    `${client} args must launch ${packageJson.name} through npx.`,
  );
}

console.log(
  JSON.stringify(
    {
      registry: registry.name,
      package: packageJson.name,
      transport: registry.transport,
      clients: ["claude", "codex", "copilot", "gemini"],
    },
    null,
    2,
  ),
);
