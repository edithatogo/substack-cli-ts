import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { loadEnv, requireBrowserEnv } from "./env.js";

describe("loadEnv", () => {
  it("applies the default stagehand model", () => {
    const previous = snapshot(["STAGEHAND_MODEL", "SUBSTACK_EMAIL"]);
    Reflect.deleteProperty(process.env, "STAGEHAND_MODEL");
    process.env.SUBSTACK_EMAIL = "user@example.com";

    try {
      const env = loadEnv();
      assert.equal(env.STAGEHAND_MODEL, "openai/gpt-5");
    } finally {
      restoreAll(previous);
    }
  });

  it("parses configured runtime variables", () => {
    const previous = snapshot([
      "BROWSERBASE_API_KEY",
      "BROWSERBASE_PROJECT_ID",
      "STAGEHAND_MODEL",
      "SUBSTACK_PUBLICATION_URL",
      "SUBSTACK_EMAIL",
      "SUBSTACK_PASSWORD",
      "SUBSTACK_COOKIE",
      "SUBSTACK_UPLOAD_ENDPOINT",
      "SUBSTACK_UPLOAD_RESPONSE_FIELD",
    ]);

    process.env.BROWSERBASE_API_KEY = "key";
    process.env.BROWSERBASE_PROJECT_ID = "project";
    process.env.STAGEHAND_MODEL = "anthropic/claude";
    process.env.SUBSTACK_PUBLICATION_URL = "https://example.substack.com";
    process.env.SUBSTACK_EMAIL = "user@example.com";
    process.env.SUBSTACK_PASSWORD = "secret";
    process.env.SUBSTACK_COOKIE = "cookie";
    process.env.SUBSTACK_UPLOAD_ENDPOINT = "https://upload.example.com";
    process.env.SUBSTACK_UPLOAD_RESPONSE_FIELD = "url";

    try {
      const env = loadEnv();
      assert.equal(env.BROWSERBASE_API_KEY, "key");
      assert.equal(env.BROWSERBASE_PROJECT_ID, "project");
      assert.equal(env.SUBSTACK_PUBLICATION_URL, "https://example.substack.com");
      assert.equal(env.SUBSTACK_EMAIL, "user@example.com");
      assert.equal(env.SUBSTACK_UPLOAD_RESPONSE_FIELD, "url");
    } finally {
      restoreAll(previous);
    }
  });
});

describe("requireBrowserEnv", () => {
  it("throws when browser variables are missing", () => {
    const previous = snapshot([
      "BROWSERBASE_API_KEY",
      "BROWSERBASE_PROJECT_ID",
      "SUBSTACK_PUBLICATION_URL",
      "SUBSTACK_EMAIL",
    ]);
    Reflect.deleteProperty(process.env, "BROWSERBASE_API_KEY");
    Reflect.deleteProperty(process.env, "BROWSERBASE_PROJECT_ID");
    Reflect.deleteProperty(process.env, "SUBSTACK_PUBLICATION_URL");
    process.env.SUBSTACK_EMAIL = "user@example.com";

    try {
      assert.throws(() => requireBrowserEnv(), /Missing required browser environment variables/);
    } finally {
      restoreAll(previous);
    }
  });

  it("returns the parsed environment when browser variables are present", () => {
    const previous = snapshot([
      "BROWSERBASE_API_KEY",
      "BROWSERBASE_PROJECT_ID",
      "SUBSTACK_PUBLICATION_URL",
      "SUBSTACK_EMAIL",
    ]);

    process.env.BROWSERBASE_API_KEY = "key";
    process.env.BROWSERBASE_PROJECT_ID = "project";
    process.env.SUBSTACK_PUBLICATION_URL = "https://example.substack.com";
    process.env.SUBSTACK_EMAIL = "user@example.com";

    try {
      const env = requireBrowserEnv();
      assert.equal(env.BROWSERBASE_API_KEY, "key");
      assert.equal(env.SUBSTACK_PUBLICATION_URL, "https://example.substack.com");
    } finally {
      restoreAll(previous);
    }
  });
});

function snapshot(keys: string[]): Map<string, string | undefined> {
  return new Map(keys.map((key) => [key, process.env[key]]));
}

function restoreAll(previous: Map<string, string | undefined>): void {
  for (const [key, value] of previous.entries()) {
    restoreEnv(key, value);
  }
}

function restoreEnv(name: string, value: string | undefined): void {
  if (value === undefined) {
    Reflect.deleteProperty(process.env, name);
    return;
  }

  process.env[name] = value;
}
