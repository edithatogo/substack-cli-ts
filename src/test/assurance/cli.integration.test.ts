import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it } from "vitest";

const root = resolve(import.meta.dirname, "../../..");
const recipes = JSON.parse(
  readFileSync(resolve(root, "tests/agentic/cli-recipes.json"), "utf8"),
) as {
  recipes: Array<{
    id: string;
    argv: string[];
    expectExit: number;
    documentType?: string;
    title?: string;
    status?: string;
  }>;
};

describe("CLI integration assurance", () => {
  it("exposes help and version from the built distribution", () => {
    const help = runCli(["--help"]);
    const version = runCli(["--version"]);
    assert.equal(help.status, 0);
    assert.match(help.stdout, /Usage:/);
    assert.equal(version.status, 0);
    assert.match(version.stdout.trim(), /^\d+\.\d+\.\d+/);
  });

  for (const recipe of recipes.recipes) {
    it(`executes documented recipe ${recipe.id}`, () => {
      const result = runCli(recipe.argv);
      assert.equal(result.status, recipe.expectExit, result.stderr);
      const parsed = JSON.parse(result.stdout) as {
        document?: { type?: string };
        metadata?: { title?: string };
        status?: string;
      };
      if (recipe.documentType) assert.equal(parsed.document?.type, recipe.documentType);
      if (recipe.title) assert.equal(parsed.metadata?.title, recipe.title);
      if (recipe.status) assert.equal(parsed.status, recipe.status);
    });
  }
});

function runCli(args: string[]): { status: number | null; stdout: string; stderr: string } {
  const result = spawnSync(process.execPath, ["dist/cli.js", ...args], {
    cwd: root,
    encoding: "utf8",
    timeout: 60_000,
  });
  return { status: result.status, stdout: result.stdout, stderr: result.stderr };
}
