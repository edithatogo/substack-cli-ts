import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "vitest";
import { type EffectiveConfig, updateConfig } from "../config/store.js";
import {
  type DoctorCheck,
  type DoctorStatus,
  checkPublication,
  checkSubstackCredentials,
  checkTransport,
  runDoctor,
  summarizeStatus,
} from "./doctor.js";

describe("summarizeStatus", () => {
  it.each([
    ["ok", [{ name: "a", status: "ok", message: "ok" }]],
    ["warn", [{ name: "a", status: "warn", message: "warn" }]],
    ["error", [{ name: "a", status: "error", message: "error" }]],
    [
      "error",
      [
        { name: "a", status: "ok", message: "ok" },
        { name: "b", status: "warn", message: "warn" },
        { name: "c", status: "error", message: "error" },
      ],
    ],
    [
      "warn",
      [
        { name: "a", status: "ok", message: "ok" },
        { name: "b", status: "warn", message: "warn" },
      ],
    ],
  ] satisfies Array<[DoctorStatus, DoctorCheck[]]>)("returns %s", (expected, checks) => {
    assert.equal(summarizeStatus(checks), expected);
  });
});

describe("doctor checks", () => {
  it("reports publication configuration without exposing the full URL", () => {
    const check = checkPublication(config({ publicationUrl: "https://example.substack.com" }));

    assert.equal(check.status, "ok");
    assert.deepEqual(check.details, { host: "example.substack.com" });
  });

  it("requires publication configuration", () => {
    const check = checkPublication(config({ publicationUrl: undefined }));

    assert.equal(check.status, "error");
  });

  it("requires Browserbase variables when Browserbase runtime is selected", () => {
    const check = checkTransport(config({ browserRuntime: "browserbase" }));

    assert.equal(check.status, "error");
    assert.match(check.message, /BROWSERBASE_API_KEY/);
    assert.match(check.message, /config set-runtime local/);
  });

  it("warns for Camoufox because it is not validated", () => {
    const check = checkTransport(config({ browserRuntime: "camoufox" }));

    assert.equal(check.status, "warn");
  });

  it("reports local runtime as ready", () => {
    const check = checkTransport(config({ browserRuntime: "local" }));

    assert.equal(check.status, "ok");
    assert.match(check.message, /explicitly set to local/i);
  });

  it("warns when no local API probe auth source is available", async () => {
    await withTempState(async () => {
      const check = await runDoctor();
      const apiReadiness = check.checks.find((item) => item.name === "api-readiness");

      assert.ok(apiReadiness);
      assert.equal(apiReadiness.status, "warn");
      const message = apiReadiness.message;
      assert.match(message, /read-only API probes/i);
    });
  });

  it("detects partial Substack credential configuration", () => {
    const check = checkSubstackCredentials(config({ substackEmail: "a@b.co" }));

    assert.equal(check.status, "warn");
    assert.deepEqual(check.details, {
      emailConfigured: true,
      passwordConfigured: false,
      cookieConfigured: false,
    });
  });

  it("runs the offline doctor against an isolated state directory", async () => {
    await withTempState(async () => {
      await updateConfig({
        publicationUrl: "https://example.substack.com",
        browserRuntime: "local",
      });

      const report = await runDoctor();

      assert.equal(report.status, "warn");
      assert.deepEqual(
        report.checks.map((check) => check.name),
        [
          "publication",
          "transport",
          "substack-login",
          "api-readiness",
          "browserbase-session",
          "local-browser-profile",
          "editor-write-readiness",
          "gitignore",
        ],
      );
      assert.equal(report.checks.find((check) => check.name === "publication")?.status, "ok");
      assert.equal(
        report.checks.find((check) => check.name === "editor-write-readiness")?.status,
        "warn",
      );
    });
  });
});

function config(patch: Partial<EffectiveConfig>): EffectiveConfig {
  return {
    browserRuntime: "local",
    defaultMode: "draft",
    stagehandModel: "openai/gpt-5",
    ...patch,
  };
}

async function withTempState(run: () => Promise<void>): Promise<void> {
  const previousStateDir = process.env.SUBSTACK_CLI_STATE_DIR;
  const previousPublicationUrl = process.env.SUBSTACK_PUBLICATION_URL;
  const previousEmail = process.env.SUBSTACK_EMAIL;
  const previousPassword = process.env.SUBSTACK_PASSWORD;
  const previousBrowserbaseApiKey = process.env.BROWSERBASE_API_KEY;
  const previousBrowserbaseProjectId = process.env.BROWSERBASE_PROJECT_ID;
  const temp = await mkdtemp(join(tmpdir(), "substack-cli-doctor-"));

  try {
    process.env.SUBSTACK_CLI_STATE_DIR = join(temp, ".substack-cli");
    Reflect.deleteProperty(process.env, "SUBSTACK_PUBLICATION_URL");
    Reflect.deleteProperty(process.env, "SUBSTACK_EMAIL");
    Reflect.deleteProperty(process.env, "SUBSTACK_PASSWORD");
    Reflect.deleteProperty(process.env, "BROWSERBASE_API_KEY");
    Reflect.deleteProperty(process.env, "BROWSERBASE_PROJECT_ID");
    await run();
  } finally {
    restoreEnv("SUBSTACK_CLI_STATE_DIR", previousStateDir);
    restoreEnv("SUBSTACK_PUBLICATION_URL", previousPublicationUrl);
    restoreEnv("SUBSTACK_EMAIL", previousEmail);
    restoreEnv("SUBSTACK_PASSWORD", previousPassword);
    restoreEnv("BROWSERBASE_API_KEY", previousBrowserbaseApiKey);
    restoreEnv("BROWSERBASE_PROJECT_ID", previousBrowserbaseProjectId);
    await rm(temp, { recursive: true, force: true });
  }
}

function restoreEnv(name: string, value: string | undefined): void {
  if (value === undefined) {
    Reflect.deleteProperty(process.env, name);
    return;
  }

  process.env[name] = value;
}
