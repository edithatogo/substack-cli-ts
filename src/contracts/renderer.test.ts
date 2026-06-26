import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "vitest";
import {
  buildLocalApiContract,
  checkLocalApiContract,
  CONTRACT_SCHEMA_VERSION,
  renderLocalApiContract,
} from "./renderer.js";

describe("local API contract renderer", () => {
  it("renders CLI, MCP, safe-surface, artifact, and version metadata", async () => {
    const contract = await buildLocalApiContract();

    assert.equal(contract.schemaVersion, CONTRACT_SCHEMA_VERSION);
    assert.equal(contract.package.name, "@edithatogo/substack-cli");
    assert.equal(contract.contract.id, "substack-cli.local-api");
    assert.match(contract.contract.version, /^0\.2\.0\+contract\.1$/);
    assert.equal(contract.contract.generatedAt, "static");
    assert.ok(contract.cli.commands.some((command) => command.command === "campaign plan <file>"));
    assert.ok(
      contract.cli.commands.some((command) => command.command === "coverage safe-surfaces"),
    );
    assert.equal(contract.mcp.toolCount, contract.mcp.tools.length);
    assert.equal(contract.mcp.resourceCount, contract.mcp.resources.length);
    assert.ok(contract.mcp.tools.some((tool) => tool.name === "campaign.plan"));
    assert.ok(
      contract.mcp.resources.some((resource) => resource.name === "coverage.safe-surfaces"),
    );
    assert.equal(contract.safeSurfaces.count, contract.safeSurfaces.surfaces.length);
    assert.ok(
      contract.safeSurfaces.surfaces.some(
        (surface) => surface.id === "native-video-live-automation",
      ),
    );
    assert.ok(contract.artifacts.some((artifact) => artifact.id === "campaign.plan"));
    assert.ok(contract.artifacts.some((artifact) => artifact.id === "coverage.drift"));
  });

  it("writes deterministic generated artifacts and detects stale files", async () => {
    const dir = await mkdtemp(join(tmpdir(), "substack-contract-"));
    const outFile = join(dir, "contracts.json");
    const schemaFile = `${outFile}.schema.json`;

    const missing = await checkLocalApiContract({ outFile });
    assert.equal(missing.status, "stale");
    assert.match(missing.message, /missing/);

    await renderLocalApiContract({ outFile });
    const ready = await checkLocalApiContract({ outFile });
    assert.equal(ready.status, "ready");

    const schema = await readFile(schemaFile, "utf8");
    await rm(schemaFile);
    const missingSchema = await checkLocalApiContract({ outFile });
    assert.equal(missingSchema.status, "stale");
    assert.match(missingSchema.message, /schema/);

    await writeFile(
      schemaFile,
      schema.replace("contractVersion", "changedContractVersion"),
      "utf8",
    );
    const staleSchema = await checkLocalApiContract({ outFile });
    assert.equal(staleSchema.status, "stale");
    assert.match(staleSchema.message, /schema/);
    await writeFile(schemaFile, schema, "utf8");

    await writeFile(outFile, "{", "utf8");
    const malformed = await checkLocalApiContract({ outFile });
    assert.equal(malformed.status, "stale");
    assert.match(malformed.message, /stale/);

    await renderLocalApiContract({ outFile });
    const rendered = await readFile(outFile, "utf8");
    await writeFile(outFile, rendered.replace("local-first", "changed"), "utf8");
    const stale = await checkLocalApiContract({ outFile });
    assert.equal(stale.status, "stale");
    assert.match(stale.message, /stale/);
  });

  it("checks the repository contract artifacts through default paths", async () => {
    const result = await checkLocalApiContract();

    assert.equal(result.status, "ready");
    assert.match(result.outFile, /substack-cli\.contract\.json$/);
    assert.match(result.schemaFile, /substack-cli\.schema\.json$/);
  });

  it("renders contract artifacts without mutating repository defaults", async () => {
    const dir = await mkdtemp(join(tmpdir(), "substack-contract-default-"));
    const result = await renderLocalApiContract({ outFile: join(dir, "contract.json") });

    assert.match(result.outFile, /contract\.json$/);
    assert.match(result.schemaFile, /contract\.json\.schema\.json$/);
    assert.equal(result.contract.contract.id, "substack-cli.local-api");
  });

  it("rejects invalid package metadata before rendering", async () => {
    const dir = await mkdtemp(join(tmpdir(), "substack-contract-package-"));
    const packageFile = join(dir, "package.json");
    await writeFile(packageFile, JSON.stringify({ name: "", version: "0.1.0", mcpName: "mcp" }));

    await assert.rejects(() => buildLocalApiContract({ packageFile }), /package.name/);

    await writeFile(packageFile, JSON.stringify({ name: "pkg", version: 1, mcpName: "mcp" }));
    await assert.rejects(() => buildLocalApiContract({ packageFile }), /package.version/);
  });
});
