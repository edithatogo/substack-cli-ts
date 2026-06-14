import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("smoke tests", () => {
  it("inspect command parses basic markdown", () => {
    const output = runCli(["inspect", "examples/basic.md"]);
    const parsed = JSON.parse(output);
    expect(parsed.document.type).toBe("doc");
    expect(parsed.metadata.title).toBe("Example Substack Draft");
  });

  it("prepublish validates successfully", () => {
    const output = runCli(["prepublish", "examples/basic.md"]);
    const parsed = JSON.parse(output);
    expect(parsed.status).toBe("ready");
  });

  it("campaign plan and validate smoke through the CLI", () => {
    const temp = mkdtempSync(resolve(tmpdir(), "substack-campaign-smoke-"));
    const campaignFile = resolve(temp, "campaign.json");
    const publishAt = new Date(Date.now() + 7 * 24 * 60 * 60_000).toISOString();

    try {
      const output = runCli([
        "campaign",
        "plan",
        "examples/basic.md",
        "--publish-at",
        publishAt,
        "--channels",
        "notes,linkedin",
        "--out",
        campaignFile,
      ]);
      const parsed = JSON.parse(output);
      expect(parsed.status).toBe("ready");
      expect(existsSync(campaignFile)).toBe(true);

      const validateOutput = runCli(["campaign", "validate", "--plan", campaignFile]);
      expect(JSON.parse(validateOutput).status).toBe("ready");
    } finally {
      rmSync(temp, { recursive: true, force: true });
    }
  });

  it("creator planning commands smoke through the CLI", () => {
    const temp = mkdtempSync(resolve(tmpdir(), "substack-creator-smoke-"));
    const videoFile = resolve(temp, "video.mp4");
    writeFileSync(videoFile, "fake video");
    const liveAt = new Date(Date.now() + 60 * 60_000).toISOString();

    try {
      const analyticsOutput = runCli([
        "analytics",
        "snapshot",
        "--post-url",
        "https://example.substack.com/p/post",
        "--out",
        "snapshot.json",
        "--dry-run",
      ]);
      expect(JSON.parse(analyticsOutput).status).toBe("planned");

      const mediaOutput = runCli([
        "media",
        "video",
        "plan",
        "--file",
        videoFile,
        "--post",
        "examples/basic.md",
      ]);
      expect(JSON.parse(mediaOutput).operation).toBe("media.video.plan");

      const liveOutput = runCli([
        "live",
        "plan",
        "--title",
        "Launch Q&A",
        "--at",
        liveAt,
        "--audience",
        "paid",
      ]);
      expect(JSON.parse(liveOutput).status).toBe("ready");
    } finally {
      rmSync(temp, { recursive: true, force: true });
    }
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

function runCli(args: string[]): string {
  return execFileSync("node", ["dist/cli.js", ...args], {
    cwd: resolve(import.meta.dirname, "../.."),
    encoding: "utf8",
    timeout: 30000,
  });
}
