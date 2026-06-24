import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { buildReleaseScorecard } from "./release-scorecard.js";

describe("release scorecard", () => {
  it("reports local readiness and external owner gates separately", async () => {
    const scorecard = await buildReleaseScorecard();

    expect(scorecard.operation).toBe("release.scorecard");
    expect(scorecard.localReadiness.some((item) => item.id === "script:sbom")).toBe(true);
    expect(scorecard.localReadiness.some((item) => item.id === "file:strictest-tsconfig")).toBe(
      true,
    );
    expect(scorecard.externalGates.length).toBeGreaterThan(0);
    expect(scorecard.externalGates.every((item) => item.status === "owner-gate")).toBe(true);
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
        },
      }),
    );
    await writeFile(join(temp, "tsconfig.strictest.json"), "{}");
    await writeFile(join(temp, ".github", "workflows", "hardening.yml"), "name: Hardening\n");

    const scorecard = await buildReleaseScorecard({ baseDir: temp });

    expect(scorecard.status).toBe("blocked");
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
  });
});
