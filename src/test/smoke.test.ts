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
  }, 60_000);

  it("prepublish validates successfully", () => {
    const output = runCli(["prepublish", "examples/basic.md"]);
    const parsed = JSON.parse(output);
    expect(parsed.status).toBe("ready");
  }, 60_000);

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

  it("coverage audit commands smoke through the CLI", () => {
    const temp = mkdtempSync(resolve(tmpdir(), "substack-coverage-smoke-"));
    const badMatrixFile = resolve(temp, "bad-matrix.json");
    const invalidMatrixFile = resolve(temp, "invalid-matrix.json");

    try {
      const validationOutput = runCli(["coverage", "validate"]);
      expect(JSON.parse(validationOutput).status).toBe("ready");

      const reportOutput = runCli(["coverage", "report", "--format", "markdown"]);
      expect(reportOutput).toContain("# Frontier Coverage Roadmap");

      const gapOutput = runCli(["coverage", "gaps", "--status", "probe-only"]);
      const gaps = JSON.parse(gapOutput);
      expect(gaps.operation).toBe("coverage.gaps");
      expect(gaps.gaps.every((gap: { status: string }) => gap.status === "probe-only")).toBe(true);

      const inspectOutput = runCli(["coverage", "inspect", "--id", "post-draft-publish-schedule"]);
      expect(JSON.parse(inspectOutput).status).toBe("ready");

      const safeSurfacesOutput = runCli(["coverage", "safe-surfaces"]);
      const safeSurfaces = JSON.parse(safeSurfacesOutput);
      expect(safeSurfaces.status).toBe("ready");
      expect(safeSurfaces.count).toBe(8);

      const safeSurfaceOutput = runCli([
        "coverage",
        "safe-surface",
        "--id",
        "native-video-live-automation",
      ]);
      const safeSurface = JSON.parse(safeSurfaceOutput);
      expect(safeSurface.status).toBe("ready");
      expect(safeSurface.surface.status).toBe("planning-only");

      const launchCheckOutput = runCli(["coverage", "launch-check"]);
      expect(JSON.parse(launchCheckOutput).status).toBe("ready");

      writeFileSync(
        badMatrixFile,
        JSON.stringify(
          {
            schemaVersion: 1,
            capabilities: [
              {
                id: "bad",
                name: "Bad coverage row",
                domain: "post-editor",
                status: "implemented",
                paths: ["cli", "browser", "manual-admin"],
                primaryPath: "cli",
                fallbackPath: "browser",
                manualPath: "manual-admin",
                safetyClass: "read-only",
                evidence: [],
                nextAction: "Add evidence.",
              },
            ],
          },
          null,
          2,
        ),
      );
      const failed = runCliFailure(["coverage", "validate", "--matrix", badMatrixFile]);
      expect(failed.status).not.toBe(0);
      const failedOutput = JSON.parse(failed.stdout) as { issues: Array<{ code: string }> };
      expect(failedOutput.issues.some((issue) => issue.code === "evidence-required")).toBe(true);

      writeFileSync(invalidMatrixFile, JSON.stringify({ schemaVersion: 1, capabilities: [{}] }));
      const invalid = runCliFailure(["coverage", "validate", "--matrix", invalidMatrixFile]);
      const invalidOutput = JSON.parse(invalid.stdout);
      expect(invalid.status).not.toBe(0);
      expect(invalidOutput.status).toBe("blocked");
      expect(invalidOutput.issues[0].code).toBe("schema-invalid");

      const missingDecision = runCliFailure(["coverage", "decisions", "--id", "DR-missing"]);
      const decisionOutput = JSON.parse(missingDecision.stdout);
      expect(missingDecision.status).not.toBe(0);
      expect(decisionOutput.status).toBe("blocked");
      expect(decisionOutput.message).toContain("not found");

      const missingSafeSurface = runCliFailure([
        "coverage",
        "safe-surface",
        "--id",
        "missing-surface",
      ]);
      const missingSafeSurfaceOutput = JSON.parse(missingSafeSurface.stdout);
      expect(missingSafeSurface.status).not.toBe(0);
      expect(missingSafeSurfaceOutput.status).toBe("blocked");
      expect(missingSafeSurfaceOutput.message).toContain("not found");
    } finally {
      rmSync(temp, { recursive: true, force: true });
    }
  }, 120_000);

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
    timeout: 60000,
    env: {
      ...process.env,
      SUBSTACK_EMAIL: "smoke@example.com",
      SUBSTACK_PASSWORD: "smoke-password",
      SUBSTACK_PUBLICATION_URL: "https://example.substack.com",
    },
  });
}

function runCliFailure(args: string[]): { status: number | undefined; stdout: string } {
  try {
    runCli(args);
    throw new Error(`Expected command to fail: ${args.join(" ")}`);
  } catch (error) {
    const failed = error as { status?: number; stdout?: string };
    return { status: failed.status, stdout: failed.stdout ?? "" };
  }
}
