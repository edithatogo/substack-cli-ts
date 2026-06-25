import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { FRONTIER_LAUNCH_CHECKLIST } from "./launch-checklist.js";
import { buildReleaseScorecard } from "./release-scorecard.js";

describe("release scorecard", () => {
  it("reports local readiness and external owner gates separately", async () => {
    const scorecard = await buildReleaseScorecard();

    expect(scorecard.operation).toBe("release.scorecard");
    expect(scorecard.localStatus).toBe("ready");
    expect(scorecard.externalStatus).toBe("owner-gated");
    expect(scorecard.releaseVerdict).toBe("ready-for-owner-launch");
    expect(scorecard.summary.local.blocked).toBe(0);
    expect(scorecard.localReadiness.some((item) => item.id === "script:sbom")).toBe(true);
    expect(scorecard.localReadiness.some((item) => item.id === "script:prepublishOnly")).toBe(true);
    expect(scorecard.localReadiness.some((item) => item.id === "release:package-public")).toBe(
      true,
    );
    expect(scorecard.localReadiness.some((item) => item.id === "file:strictest-tsconfig")).toBe(
      true,
    );
    expect(scorecard.externalGates.length).toBeGreaterThan(0);
    expect(scorecard.externalGates.every((item) => item.status === "owner-gate")).toBe(true);
    expect(scorecard.externalGates.every((item) => item.checks.length > 0)).toBe(true);
    expect(scorecard.externalGates.every((item) => item.rollback.length > 0)).toBe(true);
    expect(scorecard.nextActions.some((action) => action.startsWith("npm:"))).toBe(true);
  });

  it("blocks local readiness when required generated files are missing", async () => {
    const temp = await mkdtemp(join(tmpdir(), "substack-scorecard-"));
    await mkdir(join(temp, ".github", "workflows"), { recursive: true });
    await writeFile(
      join(temp, "package.json"),
      JSON.stringify({
        scripts: {
          typecheck: "tsc --noEmit",
          test: "vitest run",
          "test:coverage": "vitest run --coverage",
          "frontier:drift": "node drift.js",
          "audit:prod": "npm audit --omit=dev",
          "scan:secrets": "node scan.js",
          sbom: "node sbom.js",
          prepublishOnly: "npm run quality",
        },
        private: false,
        bin: {
          "substack-cli": "dist/cli.js",
        },
        files: ["dist/"],
        publishConfig: {
          access: "public",
        },
        repository: {
          url: "git+https://example.test/repo.git",
        },
      }),
    );
    await writeFile(join(temp, "tsconfig.strictest.json"), "{}");
    await writeFile(join(temp, ".github", "workflows", "hardening.yml"), "name: Hardening\n");

    const scorecard = await buildReleaseScorecard({ baseDir: temp });

    expect(scorecard.status).toBe("blocked");
    expect(scorecard.localStatus).toBe("blocked");
    expect(scorecard.releaseVerdict).toBe("blocked-local-readiness");
    expect(
      scorecard.localReadiness.some(
        (item) => item.id === "file:api-contract" && item.status === "blocked",
      ),
    ).toBe(true);
  });

  it("blocks script readiness when package scripts are absent", async () => {
    const temp = await mkdtemp(join(tmpdir(), "substack-scorecard-no-scripts-"));
    await writeFile(join(temp, "package.json"), JSON.stringify({ name: "fixture" }));

    const scorecard = await buildReleaseScorecard({ baseDir: temp });

    expect(scorecard.status).toBe("blocked");
    expect(
      scorecard.localReadiness.some(
        (item) => item.id === "script:typecheck" && item.status === "blocked",
      ),
    ).toBe(true);
    expect(
      scorecard.localReadiness.some(
        (item) => item.id === "release:package-public" && item.status === "blocked",
      ),
    ).toBe(true);
    expect(scorecard.nextActions.some((action) => action.startsWith("script:typecheck:"))).toBe(
      true,
    );
  });

  it("blocks external status when the launch checklist is incomplete", async () => {
    const scorecard = await buildReleaseScorecard({
      launchChecklist: FRONTIER_LAUNCH_CHECKLIST.filter((item) => item.surface !== "npm"),
    });

    expect(scorecard.status).toBe("blocked");
    expect(scorecard.localStatus).toBe("ready");
    expect(scorecard.externalStatus).toBe("blocked");
    expect(scorecard.summary.external.missingSurfaces).toEqual(["npm"]);
    expect(
      scorecard.nextActions.some((action) =>
        action.startsWith("launch:npm: Add launch checklist coverage."),
      ),
    ).toBe(true);
  });
});
