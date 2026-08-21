import { describe, expect, it } from "vitest";
import {
  buildRegistrySubmissionPlan,
  loadRegistryServerMetadata,
  summarizeRegistryServerMetadata,
  validateRegistryServerMetadata,
} from "./metadata.js";

describe("loadRegistryServerMetadata", () => {
  it("loads the registry metadata", async () => {
    const metadata = await loadRegistryServerMetadata();
    expect(metadata.name).toBe("io.github.edithatogo/substack-publisher");
    expect(metadata.packages[0]?.identifier).toBe("@edithatogo/substack-publisher");
    expect(metadata.packages[0]?.version).toBe("0.2.0");
  });
});

describe("summarizeRegistryServerMetadata", () => {
  it("redacts the full structure to a compact summary", async () => {
    const metadata = await loadRegistryServerMetadata();
    const summary = summarizeRegistryServerMetadata(metadata);
    expect(summary).toMatchObject({
      name: "io.github.edithatogo/substack-publisher",
      packageIdentifier: "@edithatogo/substack-publisher",
      mcpName: "io.github.edithatogo/substack-publisher",
    });
  });
});

describe("validateRegistryServerMetadata", () => {
  it("accepts the checked-in registry metadata", async () => {
    const metadata = await loadRegistryServerMetadata();
    expect(validateRegistryServerMetadata(metadata)).toEqual([]);
  });
});

describe("buildRegistrySubmissionPlan", () => {
  it("builds the manual publisher and launch commands", async () => {
    const metadata = await loadRegistryServerMetadata();
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
      "@edithatogo/substack-publisher",
      "mcp",
      "serve",
    ]);
  });
});

describe("validateRegistryServerMetadata contract failures", () => {
  it("reports metadata contract issues", async () => {
    const metadata = await loadRegistryServerMetadata();
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
      "Primary package identifier must be @edithatogo/substack-publisher.",
      "Package mcpName must match registry server name.",
      "Package entrypoint must be the built CLI entrypoint.",
      "Package transport must be stdio.",
    ]);
  });

  it("reports missing package metadata", async () => {
    const metadata = await loadRegistryServerMetadata();
    const withoutPackages = { ...metadata, packages: [] };
    expect(validateRegistryServerMetadata(withoutPackages)).toContain(
      "Missing npm package launch metadata.",
    );
    expect(buildRegistrySubmissionPlan(withoutPackages).packageLaunchCommand).toEqual([
      "npx",
      "-y",
      "@edithatogo/substack-publisher",
      "mcp",
      "serve",
    ]);
  });
});
