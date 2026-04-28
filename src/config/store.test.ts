import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "vitest";
import {
  clearSession,
  createStoredSession,
  loadSession,
  saveSession,
} from "../auth/session-store.js";
import { configFilePath, sessionFilePath, stateDir } from "./paths.js";
import { loadConfig, loadEffectiveConfig, updateConfig } from "./store.js";

describe("config store", () => {
  it("loads defaults when no config file exists", async () => {
    await withTempCwd(async () => {
      const config = await loadConfig();

      assert.equal(config.browserRuntime, "browserbase");
      assert.equal(config.defaultMode, "draft");
      assert.equal(config.publicationUrl, undefined);
    });
  });

  it("writes local non-secret config under .substack-cli", async () => {
    await withTempCwd(async () => {
      const config = await updateConfig({
        publicationUrl: "https://example.substack.com",
      });
      const raw = await readFile(configFilePath(), "utf8");

      assert.equal(stateDir().endsWith(".substack-cli"), true);
      assert.equal(config.publicationUrl, "https://example.substack.com");
      assert.match(raw, /example\.substack\.com/);
    });
  });

  it("prefers environment publication URL over local config", async () => {
    await withTempCwd(async () => {
      await updateConfig({ publicationUrl: "https://local.substack.com" });
      const previous = process.env.SUBSTACK_PUBLICATION_URL;
      process.env.SUBSTACK_PUBLICATION_URL = "https://env.substack.com";

      try {
        const effective = await loadEffectiveConfig();
        assert.equal(effective.publicationUrl, "https://env.substack.com");
      } finally {
        restoreEnv("SUBSTACK_PUBLICATION_URL", previous);
      }
    });
  });
});

describe("session store", () => {
  it("saves and clears Browserbase session metadata", async () => {
    await withTempCwd(async () => {
      const session = createStoredSession({
        browserbaseSessionId: "session_123",
        publicationUrl: "https://example.substack.com",
      });

      await saveSession(session);
      assert.equal((await loadSession())?.browserbaseSessionId, "session_123");
      assert.equal(sessionFilePath().endsWith("session.json"), true);

      await clearSession();
      assert.equal(await loadSession(), null);
    });
  });
});

async function withTempCwd(run: () => Promise<void>): Promise<void> {
  const previousStateDir = process.env.SUBSTACK_CLI_STATE_DIR;
  const temp = await mkdtemp(join(tmpdir(), "substack-cli-test-"));

  try {
    process.env.SUBSTACK_CLI_STATE_DIR = join(temp, ".substack-cli");
    await run();
  } finally {
    restoreEnv("SUBSTACK_CLI_STATE_DIR", previousStateDir);
    await rm(temp, { recursive: true, force: true });
  }
}

function restoreEnv(name: string, value: string | undefined): void {
  if (value === undefined) {
    delete process.env[name];
    return;
  }

  process.env[name] = value;
}
