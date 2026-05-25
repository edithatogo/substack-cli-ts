import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const packageJson = readJson("package.json");

const expectedCommand = `npx -y ${packageJson.name} mcp serve`;
const expectedServer = {
  command: "npx",
  args: ["-y", packageJson.name, "mcp", "serve"],
};
const expectedEnv = {
  name: "SUBSTACK_PUBLICATION_URL",
  placeholder: "https://your-publication.substack.com",
};

const manifestClients = ["claude", "codex", "copilot", "gemini"];
const docClients = ["vscode", "claude", "gemini", "codex", "copilot"];

function read(path) {
  return readFileSync(join(root, path), "utf8").replace(/^\uFEFF/, "");
}

function readJson(path) {
  return JSON.parse(read(path));
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function normalizeWhitespace(value) {
  return value.replace(/\s+/g, " ");
}

for (const client of manifestClients) {
  const path = `extensions/${client}/package.json`;
  const manifest = readJson(path);
  const server = manifest.mcpServers?.["substack-cli"];

  assert(server, `${path} must define mcpServers.substack-cli.`);
  assert(server.command === expectedServer.command, `${path} must use command "npx".`);
  assert(
    JSON.stringify(server.args) === JSON.stringify(expectedServer.args),
    `${path} must launch "${expectedCommand}".`,
  );
  assert(
    server.env?.[expectedEnv.name] === expectedEnv.placeholder,
    `${path} must include ${expectedEnv.name} placeholder.`,
  );
}

const vscodeManifest = readJson("extensions/vscode/package.json");
const vscodeProperties = vscodeManifest.contributes?.configuration?.properties;
assert(
  vscodeProperties?.["substackCli.mcpCommand"]?.default === expectedCommand,
  "extensions/vscode/package.json must expose the canonical MCP command default.",
);
assert(
  vscodeProperties?.["substackCli.publicationUrl"]?.default === expectedEnv.placeholder,
  `extensions/vscode/package.json must expose the ${expectedEnv.name} placeholder default.`,
);

const vscodeWorkspace = readJson(".vscode/mcp.json");
const vscodeServer = vscodeWorkspace.servers?.["substack-cli"];
assert(vscodeServer?.type === "stdio", ".vscode/mcp.json must configure a stdio MCP server.");
assert(vscodeServer?.command === expectedServer.command, ".vscode/mcp.json must use command \"npx\".");
assert(
  JSON.stringify(vscodeServer?.args) === JSON.stringify(expectedServer.args),
  `.vscode/mcp.json must launch "${expectedCommand}".`,
);
assert(
  vscodeServer?.env?.[expectedEnv.name] === expectedEnv.placeholder,
  `.vscode/mcp.json must include ${expectedEnv.name} placeholder.`,
);

const geminiWorkspace = readJson(".gemini/settings.json");
const geminiServer = geminiWorkspace.mcpServers?.["substack-cli"];
assert(geminiServer?.command === expectedServer.command, ".gemini/settings.json must use command \"npx\".");
assert(
  JSON.stringify(geminiServer?.args) === JSON.stringify(expectedServer.args),
  `.gemini/settings.json must launch "${expectedCommand}".`,
);
assert(
  geminiServer?.env?.[expectedEnv.name] === expectedEnv.placeholder,
  `.gemini/settings.json must include ${expectedEnv.name} placeholder.`,
);

for (const client of docClients) {
  const path = `docs/integrations/${client}.md`;
  const content = normalizeWhitespace(read(path));

  assert(content.includes(expectedCommand), `${path} must include "${expectedCommand}".`);
  assert(content.includes(expectedEnv.name), `${path} must mention ${expectedEnv.name}.`);
  assert(content.includes(expectedEnv.placeholder), `${path} must include the publication URL placeholder.`);
}

console.log(
  JSON.stringify(
    {
      command: expectedCommand,
      env: expectedEnv,
      manifests: [...manifestClients, "vscode"],
      workspaceConfigs: [".vscode/mcp.json", ".gemini/settings.json"],
      docs: docClients,
    },
    null,
    2,
  ),
);
