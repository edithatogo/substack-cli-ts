import { describe, expect, it } from "vitest";
import { loadRegistryServerMetadata, summarizeRegistryServerMetadata } from "./metadata.js";

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
