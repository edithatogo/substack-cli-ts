import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { describe, it } from "vitest";

const root = resolve(import.meta.dirname, "../../..");

describe("CLI integration assurance", () => {
  it("exposes help and version from the built distribution", () => {
    const help = runCli(["--help"]);
    const version = runCli(["--version"]);
    assert.equal(help.status, 0);
    assert.match(help.stdout, /Usage:/);
    assert.equal(version.status, 0);
    assert.match(version.stdout.trim(), /^\d+\.\d+\.\d+/);
  });
});

function runCli(args: string[]): { status: number | null; stdout: string; stderr: string } {
  const result = spawnSync(process.execPath, ["dist/cli.js", ...args], {
    cwd: root,
    encoding: "utf8",
    timeout: 60_000,
  });
  return { status: result.status, stdout: result.stdout, stderr: result.stderr };
}
