import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { describe, it } from "vitest";

describe("built CLI end-to-end", () => {
  it("parses a repository example through the public command", () => {
    const root = resolve(import.meta.dirname, "../../..");
    const output = execFileSync(process.execPath, ["dist/cli.js", "inspect", "examples/basic.md"], {
      cwd: root,
      encoding: "utf8",
      timeout: 60_000,
    });
    const parsed = JSON.parse(output) as {
      document: { type: string };
      metadata: { title?: string };
    };
    assert.equal(parsed.document.type, "doc");
    assert.equal(parsed.metadata.title, "Example Substack Draft");
  });
});
