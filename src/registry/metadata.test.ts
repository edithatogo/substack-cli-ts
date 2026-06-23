import { describe, expect, it } from "vitest";
import {
  buildRegistrySubmissionPlan,
  loadRegistryServerMetadata,
  summarizeRegistryServerMetadata,
  validateRegistryServerMetadata,
} from "./metadata.js";

describe("loadRegistryServerMetadata", () => {
  it("loads the registry metadata", () => {
    const metadata = loadRegistryServerMetadata();
    expect(metadata.name).toBe("io.github.edithatogo/substack-cli");
    expect(metadata.packages[0]?.identifier).toBe("@edithatogo/substack-cli");
    expect(metadata.packages[0]?.version).toBe("0.1.0");
  });
});

describe("summarizeRegistryServerMetadata", () => {
  it("redacts the full structure to a compact summary", () => {
    const metadata = loadRegistryServerMetadata();
    const summary = summarizeRegistryServerMetadata(metadata);
    expect(summary).toMatchObject({
      name: "io.github.edithatogo/substack-cli",
      packageIdentifier: "@edithatogo/substack-cli",
      mcpName: "io.github.edithatogo/substack-cli",
    });
  });
});

describe("validateRegistryServerMetadata", () => {
  it("accepts the checked-in registry metadata", () => {
    const metadata = loadRegistryServerMetadata();
    expect(validateRegistryServerMetadata(metadata)).toEqual([]);
  });
});

describe("buildRegistrySubmissionPlan", () => {
  it("builds the manual publisher and launch commands", () => {
    const metadata = loadRegistryServerMetadata();
    const plan = buildRegistrySubmissionPlan(metadata);

    expect(plan.publisherCommand).toEqual([
      "mcp-publisher",
      "publish",
      "--file",
      "registry.server.json",
    ]);
    expect(plan.packageLaunchCommand).toEqual([
      "npx",
      "-y",
      "@edithatogo/substack-cli",
      "mcp",
      "serve",
    ]);
  });
});

describe("validateRegistryServerMetadata contract failures", () => {
  it("reports metadata contract issues", () => {
    const metadata = loadRegistryServerMetadata();
    const invalid = {
      ...metadata,
      name: "",
      repository: "https://example.com/repo",
      transport: "http",
      packages: [
        {
          ...metadata.packages[0]!,
          registryType: "github",
          identifier: "substack-cli",
          mcpName: "other-name",
          entrypoint: "cli.js",
          transport: "http",
        },
      ],
    };

    expect(validateRegistryServerMetadata(invalid)).toEqual([
      "Missing registry server name.",
      "Repository must point at the GitHub project namespace.",
      "Registry transport must be stdio.",
      "Primary package must use npm.",
      "Primary package identifier must be @edithatogo/substack-cli.",
      "Package mcpName must match registry server name.",
      "Package entrypoint must be the built CLI entrypoint.",
      "Package transport must be stdio.",
    ]);
  });

  it("reports missing package metadata", () => {
    const metadata = loadRegistryServerMetadata();
    expect(validateRegistryServerMetadata({ ...metadata, packages: [] })).toContain(
      "Missing npm package launch metadata.",
    );
  });
});
