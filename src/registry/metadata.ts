import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

export type RegistryServerMetadata = {
  $schema: string;
  name: string;
  description: string;
  repository: string;
  version: string;
  packages: Array<{
    registryType: string;
    identifier: string;
    version?: string;
    mcpName: string;
    runtime: string;
    entrypoint: string;
    transport: string;
    environmentVariables: string[];
  }>;
  transport: string;
  environmentVariables: string[];
  publisher: {
    type: string;
    owner: string;
    repository: string;
  };
};

export type RegistrySubmissionPlan = {
  metadataFile: string;
  publisherCommand: string[];
  packageLaunchCommand: string[];
  validationIssues: string[];
};

export async function loadRegistryServerMetadata(
  filePath = resolve(process.cwd(), "registry.server.json"),
): Promise<RegistryServerMetadata> {
  return JSON.parse(await readFile(filePath, "utf8")) as RegistryServerMetadata;
}

export function validateRegistryServerMetadata(metadata: RegistryServerMetadata): string[] {
  const issues: string[] = [];
  const primaryPackage = metadata.packages[0];

  if (!metadata.name) issues.push("Missing registry server name.");
  if (!metadata.repository?.startsWith("https://github.com/")) {
    issues.push("Repository must point at the GitHub project namespace.");
  }
  if (metadata.transport !== "stdio") issues.push("Registry transport must be stdio.");
  if (!primaryPackage) {
    issues.push("Missing npm package launch metadata.");
    return issues;
  }
  if (primaryPackage.registryType !== "npm") issues.push("Primary package must use npm.");
  if (primaryPackage.identifier !== "@edithatogo/substack-publisher") {
    issues.push("Primary package identifier must be @edithatogo/substack-publisher.");
  }
  if (primaryPackage.mcpName !== metadata.name) {
    issues.push("Package mcpName must match registry server name.");
  }
  if (primaryPackage.entrypoint !== "dist/cli.js") {
    issues.push("Package entrypoint must be the built CLI entrypoint.");
  }
  if (primaryPackage.transport !== "stdio") issues.push("Package transport must be stdio.");

  return issues;
}

export function buildRegistrySubmissionPlan(
  metadata: RegistryServerMetadata,
  metadataFile = "registry.server.json",
): RegistrySubmissionPlan {
  const primaryPackage = metadata.packages[0];
  const packageIdentifier = primaryPackage?.identifier ?? "@edithatogo/substack-publisher";

  return {
    metadataFile,
    publisherCommand: ["mcp-publisher", "publish", "--file", metadataFile],
    packageLaunchCommand: ["npx", "-y", packageIdentifier, "mcp", "serve"],
    validationIssues: validateRegistryServerMetadata(metadata),
  };
}

export function summarizeRegistryServerMetadata(
  metadata: RegistryServerMetadata,
): Record<string, unknown> {
  const submissionPlan = buildRegistrySubmissionPlan(metadata);

  return {
    name: metadata.name,
    version: metadata.version,
    repository: metadata.repository,
    packageIdentifier: metadata.packages[0]?.identifier,
    mcpName: metadata.packages[0]?.mcpName,
    transport: metadata.transport,
    env: metadata.environmentVariables,
    publisherCommand: submissionPlan.publisherCommand.join(" "),
    packageLaunchCommand: submissionPlan.packageLaunchCommand.join(" "),
    validationIssues: submissionPlan.validationIssues,
  };
}
