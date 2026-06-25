import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { z } from "zod";
import { buildSafeSurfaceListOutput } from "../frontier-coverage/safe-surfaces.js";
import { buildMcpSurfaceManifest, buildMcpSummaryResource } from "../mcp/manifest.js";
import { buildMcpToolDescriptors } from "../mcp/catalog.js";
import { FIRST_PARTY_ARTIFACT_SCHEMAS } from "./schemas.js";

export const CONTRACT_ARTIFACT_PATH = "docs/api/substack-cli.contract.json";
export const CONTRACT_SCHEMA_ARTIFACT_PATH = "docs/api/substack-cli.schema.json";
export const CONTRACT_SCHEMA_VERSION = 1;

export interface ContractRenderOptions {
  packageFile?: string | undefined;
  outFile?: string | undefined;
}

export interface ContractRenderResult {
  contract: LocalApiContract;
  outFile: string;
  schemaFile: string;
}

export interface ContractCheckResult {
  status: "ready" | "stale";
  outFile: string;
  schemaFile: string;
  message: string;
}

export interface LocalApiContract {
  schemaVersion: 1;
  generatedBy: "substack-cli contract renderer";
  package: {
    name: string;
    version: string;
    mcpName: string;
  };
  contract: {
    id: "substack-cli.local-api";
    version: string;
    stability: "local-first";
    generatedAt: "static";
    note: string;
  };
  cli: {
    commands: ContractCliCommand[];
  };
  mcp: {
    name: string;
    version: string;
    transport: "stdio";
    status: string;
    toolCount: number;
    resourceCount: number;
    promptCount: number;
    tools: ContractMcpTool[];
    resources: ContractMcpResource[];
    prompts: string[];
  };
  safeSurfaces: {
    count: number;
    surfaces: ContractSafeSurface[];
  };
  artifacts: ContractArtifactSchema[];
}

interface ContractCliCommand {
  command: string;
  surface: "cli";
  mode: "read-only" | "planning-only" | "confirmed-write" | "blocked-write";
  artifacts: string[];
}

interface ContractMcpTool {
  name: string;
  group: string;
  cliCommand: string;
  redacted: boolean;
}

interface ContractMcpResource {
  name: string;
  uri: string;
  mimeType: string;
  redacted: boolean;
}

interface ContractSafeSurface {
  id: string;
  status: string;
  safetyClass: string;
  currentCommands: string[];
  blockedOperations: string[];
  decisionRecordId: string;
}

interface ContractArtifactSchema {
  id: string;
  title: string;
  schemaVersion: 1;
  owner: string;
  commands: string[];
  jsonSchema: unknown;
}

export interface LocalArtifactSchemaBundle {
  schemaVersion: 1;
  generatedBy: "substack-cli contract renderer";
  contractVersion: string;
  artifacts: ContractArtifactSchema[];
}

const CLI_CONTRACT_COMMANDS: ContractCliCommand[] = [
  command("coverage validate", "read-only", ["coverage.matrix"]),
  command("coverage report", "read-only", ["coverage.matrix"]),
  command("coverage gaps", "read-only", ["coverage.matrix"]),
  command("coverage inspect --id <id>", "read-only", ["coverage.matrix"]),
  command("coverage safe-surfaces", "read-only", ["coverage.safe-surface"]),
  command("coverage safe-surface --id <id>", "read-only", ["coverage.safe-surface"]),
  command("coverage capture-kit --id <id>", "read-only", ["capture.evidence"]),
  command("coverage capture-validate --file <file>", "read-only", ["capture.evidence"]),
  command("coverage capture-inventory --file <file>", "read-only", ["capture.evidence"]),
  command("coverage capture-diff --before <file> --after <file>", "read-only", [
    "capture.evidence",
  ]),
  command("coverage capture-graduation", "read-only", ["capture.evidence", "coverage.matrix"]),
  command("coverage release-scorecard", "read-only", []),
  command("mcp surface", "read-only", []),
  command("mcp summary", "read-only", []),
  command("campaign plan <file>", "planning-only", ["campaign.plan", "run-log"]),
  command("campaign validate --plan <file>", "read-only", ["campaign.plan"]),
  command("campaign execute --plan <file>", "planning-only", ["campaign.plan", "run-log"]),
  command("campaign report --run-log-dir <dir>", "read-only", ["run-log"]),
  command("media video plan --file <file> --post <markdown>", "planning-only", [
    "media.plan",
    "run-log",
  ]),
  command("media audio plan --file <file> --post <markdown>", "planning-only", [
    "media.plan",
    "run-log",
  ]),
  command("live plan --title <title> --at <timestamp>", "planning-only", ["live.plan", "run-log"]),
  command("analytics snapshot", "read-only", ["analytics.snapshot", "run-log"]),
  command("analytics trend --snapshots-dir <dir>", "read-only", ["analytics.trend"]),
  command("growth report --campaign <file>", "read-only", ["growth.report"]),
  command("warehouse export", "read-only", ["warehouse.export"]),
  command("warehouse attribution", "read-only", ["warehouse.attribution"]),
  command("warehouse funnel", "read-only", ["warehouse.funnel"]),
  command("backup plan", "planning-only", ["backup.snapshot-plan"]),
  command("backup validate --file <file>", "read-only", ["backup.snapshot-plan"]),
  command("api analytics inventory", "read-only", ["analytics.snapshot"]),
  command("api analytics snapshot", "read-only", ["analytics.snapshot"]),
];

export async function buildLocalApiContract(
  options: ContractRenderOptions = {},
): Promise<LocalApiContract> {
  const packageJson = await readPackageMetadata(options.packageFile);
  const mcpManifest = buildMcpSurfaceManifest();
  const mcpSummary = buildMcpSummaryResource();
  const tools = buildMcpToolDescriptors();
  const safeSurfaces = buildSafeSurfaceListOutput();

  return sortContract({
    schemaVersion: CONTRACT_SCHEMA_VERSION,
    generatedBy: "substack-cli contract renderer",
    package: {
      name: packageJson.name,
      version: packageJson.version,
      mcpName: packageJson.mcpName,
    },
    contract: {
      id: "substack-cli.local-api",
      version: `${packageJson.version}+contract.${CONTRACT_SCHEMA_VERSION}`,
      stability: "local-first",
      generatedAt: "static",
      note: "This is a local CLI/MCP/artifact contract. It does not claim Substack private endpoints are stable public APIs.",
    },
    cli: {
      commands: CLI_CONTRACT_COMMANDS,
    },
    mcp: {
      name: mcpManifest.name,
      version: mcpManifest.version,
      transport: mcpManifest.transport,
      status: mcpManifest.status,
      toolCount: Number(mcpSummary.toolCount),
      resourceCount: Number(mcpSummary.resourceCount),
      promptCount: Number(mcpSummary.promptCount),
      tools: tools.map((tool) => ({
        name: tool.name,
        group: tool.group,
        cliCommand: tool.cliCommand,
        redacted: tool.redacted,
      })),
      resources: mcpManifest.resources.map((resource) => ({
        name: resource.name,
        uri: resource.uri,
        mimeType: resource.mimeType,
        redacted: resource.redacted,
      })),
      prompts: mcpManifest.prompts.map((prompt) => prompt.name),
    },
    safeSurfaces: {
      count: safeSurfaces.count,
      surfaces: safeSurfaces.surfaces.map((surface) => ({
        id: surface.id,
        status: surface.status,
        safetyClass: surface.safetyClass,
        currentCommands: surface.currentCommands,
        blockedOperations: surface.blockedOperations,
        decisionRecordId: surface.decisionRecord.id,
      })),
    },
    artifacts: FIRST_PARTY_ARTIFACT_SCHEMAS.map((artifact) => ({
      id: artifact.id,
      title: artifact.title,
      schemaVersion: artifact.schemaVersion,
      owner: artifact.owner,
      commands: [...artifact.commands],
      jsonSchema: z.toJSONSchema(artifact.schema),
    })),
  });
}

export async function renderLocalApiContract(
  options: ContractRenderOptions = {},
): Promise<ContractRenderResult> {
  const contract = await buildLocalApiContract(options);
  const outFile = options.outFile ?? CONTRACT_ARTIFACT_PATH;
  const schemaFile =
    options.outFile === undefined
      ? CONTRACT_SCHEMA_ARTIFACT_PATH
      : `${options.outFile}.schema.json`;
  await mkdir(dirname(outFile), { recursive: true });
  await mkdir(dirname(schemaFile), { recursive: true });
  await writeFile(outFile, serializeContract(contract), "utf8");
  await writeFile(schemaFile, serializeContract(buildLocalArtifactSchemaBundle(contract)), "utf8");
  return { contract, outFile, schemaFile };
}

export async function checkLocalApiContract(
  options: ContractRenderOptions = {},
): Promise<ContractCheckResult> {
  const outFile = options.outFile ?? CONTRACT_ARTIFACT_PATH;
  const schemaFile =
    options.outFile === undefined
      ? CONTRACT_SCHEMA_ARTIFACT_PATH
      : `${options.outFile}.schema.json`;
  const contract = await buildLocalApiContract(options);
  const expected = serializeContract(contract);
  const expectedSchema = serializeContract(buildLocalArtifactSchemaBundle(contract));
  let actual: string;
  let actualSchema: string;
  try {
    actual = await readFile(outFile, "utf8");
  } catch {
    return {
      status: "stale",
      outFile,
      schemaFile,
      message: `${outFile} is missing. Run npm run contracts:generate.`,
    };
  }
  try {
    actualSchema = await readFile(schemaFile, "utf8");
  } catch {
    return {
      status: "stale",
      outFile,
      schemaFile,
      message: `${schemaFile} is missing. Run npm run contracts:generate.`,
    };
  }
  if (!jsonArtifactsEqual(actual, expected)) {
    return {
      status: "stale",
      outFile,
      schemaFile,
      message: `${outFile} is stale. Run npm run contracts:generate.`,
    };
  }
  if (!jsonArtifactsEqual(actualSchema, expectedSchema)) {
    return {
      status: "stale",
      outFile,
      schemaFile,
      message: `${schemaFile} is stale. Run npm run contracts:generate.`,
    };
  }
  return {
    status: "ready",
    outFile,
    schemaFile,
    message: `${outFile} and ${schemaFile} are current.`,
  };
}

function jsonArtifactsEqual(actual: string, expected: string): boolean {
  try {
    return JSON.stringify(JSON.parse(actual)) === JSON.stringify(JSON.parse(expected));
  } catch {
    return false;
  }
}

export function buildLocalArtifactSchemaBundle(
  contract: LocalApiContract,
): LocalArtifactSchemaBundle {
  return {
    schemaVersion: CONTRACT_SCHEMA_VERSION,
    generatedBy: "substack-cli contract renderer",
    contractVersion: contract.contract.version,
    artifacts: contract.artifacts,
  };
}

function command(
  commandName: string,
  mode: ContractCliCommand["mode"],
  artifacts: string[],
): ContractCliCommand {
  return {
    command: commandName,
    surface: "cli",
    mode,
    artifacts,
  };
}

async function readPackageMetadata(packageFile = "package.json") {
  const parsed = JSON.parse(await readFile(resolve(packageFile), "utf8")) as {
    name?: unknown;
    version?: unknown;
    mcpName?: unknown;
  };
  return {
    name: requireString(parsed.name, "package.name"),
    version: requireString(parsed.version, "package.version"),
    mcpName: requireString(parsed.mcpName, "package.mcpName"),
  };
}

function requireString(value: unknown, field: string): string {
  if (typeof value === "string" && value.trim()) return value;
  throw new Error(`${field} must be a non-empty string.`);
}

function serializeContract(artifact: LocalApiContract | LocalArtifactSchemaBundle): string {
  return `${JSON.stringify(artifact, null, 2)}\n`;
}

function sortContract(contract: LocalApiContract): LocalApiContract {
  return {
    ...contract,
    cli: {
      commands: [...contract.cli.commands].sort((a, b) => a.command.localeCompare(b.command)),
    },
    mcp: {
      ...contract.mcp,
      tools: [...contract.mcp.tools].sort((a, b) => a.name.localeCompare(b.name)),
      resources: [...contract.mcp.resources].sort((a, b) => a.name.localeCompare(b.name)),
      prompts: [...contract.mcp.prompts].sort(),
    },
    safeSurfaces: {
      count: contract.safeSurfaces.count,
      surfaces: [...contract.safeSurfaces.surfaces].sort((a, b) => a.id.localeCompare(b.id)),
    },
    artifacts: [...contract.artifacts].sort((a, b) => a.id.localeCompare(b.id)),
  };
}
