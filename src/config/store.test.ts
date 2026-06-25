import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
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
import { buildOperatorPolicy, loadConfig, loadEffectiveConfig, updateConfig } from "./store.js";

describe("config store", () => {
  it("loads defaults when no config file exists", async () => {
    await withTempCwd(async () => {
      const config = await loadConfig();

      assert.equal(config.browserRuntime, "browserbase");
      assert.equal(config.defaultMode, "draft");
      assert.equal(config.operatorMode, "solo");
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

  it("persists operator mode as non-secret local config", async () => {
    await withTempCwd(async () => {
      const config = await updateConfig({ operatorMode: "agency" });
      const raw = await readFile(configFilePath(), "utf8");

      assert.equal(config.operatorMode, "agency");
      assert.match(raw, /"operatorMode": "agency"/);
    });
  });

  it("rejects invalid operator modes", async () => {
    await withTempCwd(async () => {
      await assert.rejects(
        () => updateConfig({ operatorMode: "ops" as never }),
        /Invalid option|operatorMode/,
      );
    });
  });

  it("prefers environment publication URL over local config", async () => {
    await withTempCwd(async () => {
      await updateConfig({ publicationUrl: "https://local.substack.com" });
      const previous = process.env.SUBSTACK_PUBLICATION_URL;
      const previousEmail = process.env.SUBSTACK_EMAIL;
      process.env.SUBSTACK_PUBLICATION_URL = "https://env.substack.com";
      Reflect.deleteProperty(process.env, "SUBSTACK_EMAIL");

      try {
        const effective = await loadEffectiveConfig();
        assert.equal(effective.publicationUrl, "https://env.substack.com");
      } finally {
        restoreEnv("SUBSTACK_PUBLICATION_URL", previous);
        restoreEnv("SUBSTACK_EMAIL", previousEmail);
      }
    });
  });
  it("prefers environment publication URL over local config", async () => {
    await withTempCwd(async () => {
      await updateConfig({ publicationUrl: "https://local.substack.com" });
      const previous = process.env.SUBSTACK_PUBLICATION_URL;
      const previousEmail = process.env.SUBSTACK_EMAIL;
      process.env.SUBSTACK_PUBLICATION_URL = "https://env.substack.com";
      Reflect.deleteProperty(process.env, "SUBSTACK_EMAIL");

      try {
        const effective = await loadEffectiveConfig();
        assert.equal(effective.publicationUrl, "https://env.substack.com");
      } finally {
        restoreEnv("SUBSTACK_PUBLICATION_URL", previous);
        restoreEnv("SUBSTACK_EMAIL", previousEmail);
      }
    });
  });
});

describe("buildOperatorPolicy", () => {
  it("keeps all modes explicitly confirmed while changing operational defaults", () => {
    assert.deepEqual(buildOperatorPolicy("solo"), {
      mode: "solo",
      requiresExplicitConfirmation: true,
      defaultBrowserRuntime: "local",
      secretsPolicy: "local-env",
      retentionDays: 30,
      multiPublication: "single",
      auditLevel: "standard",
    });
    assert.deepEqual(buildOperatorPolicy("ci"), {
      mode: "ci",
      requiresExplicitConfirmation: true,
      defaultBrowserRuntime: "browserbase",
      secretsPolicy: "ci-secrets",
      retentionDays: 14,
      multiPublication: "review-required",
      auditLevel: "strict",
    });
  });

  it("uses stricter shared defaults for team and agency modes", () => {
    assert.equal(buildOperatorPolicy("team").auditLevel, "shared");
    assert.equal(buildOperatorPolicy("team").multiPublication, "review-required");
    assert.equal(buildOperatorPolicy("agency").auditLevel, "strict");
    assert.equal(buildOperatorPolicy("agency").multiPublication, "required");
    assert.equal(buildOperatorPolicy("agency").retentionDays, 180);
  });
});

describe("requireSubstackCredentials", () => {
  it("throws when email is missing", async () => {
    const { requireSubstackCredentials } = await import("./store.js");
    assert.throws(
      () => requireSubstackCredentials({} as Parameters<typeof requireSubstackCredentials>[0]),
      /SUBSTACK_EMAIL/,
    );
  });

  it("throws when password is missing", async () => {
    const { requireSubstackCredentials } = await import("./store.js");
    assert.throws(
      () =>
        requireSubstackCredentials({
          substackEmail: "test@example.com",
        } as Parameters<typeof requireSubstackCredentials>[0]),
      /SUBSTACK_PASSWORD/,
    );
  });

  it("returns credentials when both are present", async () => {
    const { requireSubstackCredentials } = await import("./store.js");
    const result = requireSubstackCredentials({
      substackEmail: "test@example.com",
      substackPassword: "secret",
    } as Parameters<typeof requireSubstackCredentials>[0]);
    assert.deepEqual(result, { email: "test@example.com", password: "secret" });
  });
});

describe("requirePublicationUrl", () => {
  it("throws when publicationUrl is missing", async () => {
    const { requirePublicationUrl } = await import("./store.js");
    assert.throws(
      () => requirePublicationUrl({} as Parameters<typeof requirePublicationUrl>[0]),
      /Missing publication URL/,
    );
  });

  it("returns the URL when present", async () => {
    const { requirePublicationUrl } = await import("./store.js");
    const result = requirePublicationUrl({
      publicationUrl: "https://test.substack.com",
    } as Parameters<typeof requirePublicationUrl>[0]);
    assert.equal(result, "https://test.substack.com");
  });
});

describe("requireBrowserbaseConfig", () => {
  it("throws when Browserbase API key is missing", async () => {
    const { requireBrowserbaseConfig } = await import("./store.js");
    assert.throws(
      () => requireBrowserbaseConfig({} as Parameters<typeof requireBrowserbaseConfig>[0]),
      /BROWSERBASE_API_KEY/,
    );
  });

  it("throws when Browserbase project ID is missing", async () => {
    const { requireBrowserbaseConfig } = await import("./store.js");
    assert.throws(
      () =>
        requireBrowserbaseConfig({
          browserbaseApiKey: "key",
        } as Parameters<typeof requireBrowserbaseConfig>[0]),
      /BROWSERBASE_PROJECT_ID/,
    );
  });

  it("passes when both are present", async () => {
    const { requireBrowserbaseConfig } = await import("./store.js");
    assert.doesNotThrow(() =>
      requireBrowserbaseConfig({
        browserbaseApiKey: "key",
        browserbaseProjectId: "proj",
      } as Parameters<typeof requireBrowserbaseConfig>[0]),
    );
  });
});

describe("loadConfig error handling", () => {
  it("throws on invalid JSON", async () => {
    await withTempCwd(async () => {
      await mkdir(join(configFilePath(), ".."), { recursive: true });
      await writeFile(configFilePath(), "{not-json}", "utf8");

      await assert.rejects(() => loadConfig(), /Unexpected token|JSON/);
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
  const previousEmail = process.env.SUBSTACK_EMAIL;
  const previousPassword = process.env.SUBSTACK_PASSWORD;
  const previousCookie = process.env.SUBSTACK_COOKIE;
  const temp = await mkdtemp(join(tmpdir(), "substack-cli-test-"));

  try {
    process.env.SUBSTACK_CLI_STATE_DIR = join(temp, ".substack-cli");
    Reflect.deleteProperty(process.env, "SUBSTACK_EMAIL");
    Reflect.deleteProperty(process.env, "SUBSTACK_PASSWORD");
    Reflect.deleteProperty(process.env, "SUBSTACK_COOKIE");
    await run();
  } finally {
    restoreEnv("SUBSTACK_CLI_STATE_DIR", previousStateDir);
    restoreEnv("SUBSTACK_EMAIL", previousEmail);
    restoreEnv("SUBSTACK_PASSWORD", previousPassword);
    restoreEnv("SUBSTACK_COOKIE", previousCookie);
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
