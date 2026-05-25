import { readFileSync } from "node:fs";
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

export function loadRegistryServerMetadata(
  filePath = resolve(process.cwd(), "registry.server.json"),
): RegistryServerMetadata {
  return JSON.parse(readFileSync(filePath, "utf8")) as RegistryServerMetadata;
}

export function summarizeRegistryServerMetadata(
  metadata: RegistryServerMetadata,
): Record<string, unknown> {
  return {
    name: metadata.name,
    version: metadata.version,
    repository: metadata.repository,
    packageIdentifier: metadata.packages[0]?.identifier,
    mcpName: metadata.packages[0]?.mcpName,
    transport: metadata.transport,
    env: metadata.environmentVariables,
  };
}
