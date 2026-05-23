import { execSync } from "node:child_process";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("benchmark", () => {
  const root = resolve(import.meta.dirname, "../..");
  const examples = ["basic.md", "formatting.md", "embeds.md", "images.md", "tables.md"];

  for (const file of examples) {
    it(`parses ${file} under 1500ms`, () => {
      const start = performance.now();
      execSync(`node dist/cli.js inspect examples/${file}`, {
        cwd: root,
        encoding: "utf8",
        timeout: 15000,
      });
      const elapsed = performance.now() - start;
      expect(elapsed).toBeLessThan(1500);
    });
  }

  it("inspect all 5 examples under 5s cumulative", () => {
    const start = performance.now();
    for (const file of examples) {
      execSync(`node dist/cli.js inspect examples/${file}`, {
        cwd: root,
        encoding: "utf8",
        timeout: 15000,
      });
    }
    const elapsed = performance.now() - start;
    expect(elapsed).toBeLessThan(5000);
  });
});
