import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("smoke tests", () => {
  it("inspect command parses basic markdown", () => {
    const output = execSync("node dist/cli.js inspect examples/basic.md", {
      cwd: resolve(import.meta.dirname, "../.."),
      encoding: "utf8",
      timeout: 30000,
    });
    const parsed = JSON.parse(output);
    expect(parsed.document.type).toBe("doc");
    expect(parsed.metadata.title).toBe("Example Substack Draft");
  });

  it("prepublish validates successfully", () => {
    const output = execSync("node dist/cli.js prepublish examples/basic.md", {
      cwd: resolve(import.meta.dirname, "../.."),
      encoding: "utf8",
      timeout: 30000,
    });
    const parsed = JSON.parse(output);
    expect(parsed.status).toBe("ready");
  });

  it("fixtures are valid ProseMirror documents", () => {
    const fixturesDir = resolve(import.meta.dirname, "../../fixtures/prosemirror");
    for (const file of [
      "basic.json",
      "formatting.json",
      "images.json",
      "tables.json",
      "embeds.json",
      "media.json",
    ]) {
      expect(existsSync(resolve(fixturesDir, file))).toBe(true);
      const content = JSON.parse(readFileSync(resolve(fixturesDir, file), "utf8"));
      expect(content.document.type).toBe("doc");
    }
  });
});
