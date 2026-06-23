import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "vitest";
import type { EffectiveConfig } from "../config/store.js";
import {
  buildAuthStatusReport,
  type LocalProfileReadiness,
  readLocalProfileReadiness,
} from "./status.js";

describe("buildAuthStatusReport", () => {
  it("distinguishes Browserbase session metadata from local profile readiness", () => {
    const report = buildAuthStatusReport(
      config({ browserRuntime: "local", publicationUrl: "https://example.substack.com" }),
      null,
      profile({ exists: true }),
    );

    assert.equal(report.browserbaseSession.present, false);
    assert.equal(report.session, null);
    assert.equal(report.localProfile.exists, true);
    assert.equal(report.apiAuthReadiness.likelySource, "local-profile");
    assert.equal(report.editorWriteReadiness.status, "requires-live-check");
  });

  it("reports missing local login separately from missing publication config", () => {
    const report = buildAuthStatusReport(
      config({ browserRuntime: "local", publicationUrl: "https://example.substack.com" }),
      null,
      profile({ exists: false }),
    );

    assert.equal(report.editorWriteReadiness.status, "needs-local-login");
    assert.equal(report.apiAuthReadiness.likelySource, "none");
  });

  it("prefers explicit env cookie material for API readiness", () => {
    const report = buildAuthStatusReport(
      config({ substackCookie: "connect.sid=secret" }),
      null,
      profile({ exists: true }),
    );

    assert.equal(report.apiAuthReadiness.envCookieConfigured, true);
    assert.equal(report.apiAuthReadiness.likelySource, "env");
  });

  it("reports Browserbase runtime session readiness separately", () => {
    const report = buildAuthStatusReport(
      config({
        browserRuntime: "browserbase",
        browserbaseApiKey: "key",
        browserbaseProjectId: "project",
        publicationUrl: "https://example.substack.com",
        substackEmail: "person@example.com",
        substackPassword: "secret",
      }),
      {
        browserbaseSessionId: "123e4567-e89b-12d3-a456-426614174000",
        publicationUrl: "https://example.substack.com",
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
        browserbaseSessionUrl: "https://browserbase.example/session/123",
        browserbaseDebugUrl: "https://browserbase.example/debug/123",
      },
      profile({ exists: false }),
    );

    assert.equal(report.browserbaseConfigured, true);
    assert.equal(report.substackLoginConfigured, true);
    assert.equal(report.browserbaseSession.present, true);
    assert.equal(report.session?.present, true);
    assert.equal(report.editorWriteReadiness.status, "runtime-session");
  });

  it("reports missing publication configuration before runtime-specific readiness", () => {
    const report = buildAuthStatusReport(config({ publicationUrl: undefined }), null, profile({}));

    assert.equal(report.publicationUrl, null);
    assert.equal(report.apiAuthReadiness.validationCommand, null);
    assert.equal(report.editorWriteReadiness.status, "not-configured");
  });

  it("reads local profile readiness from the configured state directory", async () => {
    const previousStateDir = process.env.SUBSTACK_CLI_STATE_DIR;
    const temp = await mkdtemp(join(tmpdir(), "substack-cli-auth-status-"));

    try {
      const stateDir = join(temp, ".substack-cli");
      const profileDir = join(stateDir, "chrome-profile");
      process.env.SUBSTACK_CLI_STATE_DIR = stateDir;

      let readiness = await readLocalProfileReadiness();
      assert.equal(readiness.exists, false);
      assert.equal(readiness.lockFilePresent, false);

      await mkdir(profileDir, { recursive: true });
      await writeFile(join(profileDir, "chrome.pid"), "123", "utf8");

      readiness = await readLocalProfileReadiness();
      assert.equal(readiness.exists, true);
      assert.equal(readiness.lockFilePresent, true);
    } finally {
      restoreEnv("SUBSTACK_CLI_STATE_DIR", previousStateDir);
      await rm(temp, { recursive: true, force: true });
    }
  });
});

function config(patch: Partial<EffectiveConfig>): EffectiveConfig {
  return {
    browserRuntime: "local",
    defaultMode: "draft",
    publicationUrl: undefined,
    stagehandModel: "openai/gpt-5",
    ...patch,
  };
}

function profile(patch: Partial<LocalProfileReadiness>): LocalProfileReadiness {
  return {
    profileDir: "C:/tmp/profile",
    exists: false,
    lockFilePresent: false,
    ...patch,
  };
}

function restoreEnv(name: string, value: string | undefined): void {
  if (value === undefined) {
    Reflect.deleteProperty(process.env, name);
    return;
  }

  process.env[name] = value;
}
