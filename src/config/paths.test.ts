import assert from "node:assert/strict";
import { join } from "node:path";
import { describe, it } from "vitest";
import {
  analyticsSnapshotsDir,
  browserStorageStateFilePath,
  cacheDir,
  configFilePath,
  draftCaptureDir,
  draftMappingsFilePath,
  fallbackHomeStateDir,
  localBrowserProfileDir,
  sessionFilePath,
  stateDir,
} from "./paths.js";

describe("paths", () => {
  it("uses the explicit state directory when configured", () => {
    const previous = process.env.SUBSTACK_CLI_STATE_DIR;
    process.env.SUBSTACK_CLI_STATE_DIR = "C:/tmp/substack-state";

    try {
      assert.equal(stateDir().endsWith("substack-state"), true);
      assert.equal(configFilePath().endsWith("config.json"), true);
      assert.equal(sessionFilePath().endsWith("session.json"), true);
      assert.equal(draftMappingsFilePath().endsWith("draft-mappings.json"), true);
      assert.equal(draftCaptureDir().endsWith("draft-captures"), true);
      assert.equal(cacheDir().endsWith("stagehand-cache"), true);
      assert.equal(localBrowserProfileDir().endsWith("chrome-profile"), true);
      assert.equal(analyticsSnapshotsDir().endsWith("analytics-snapshots"), true);
      assert.equal(
        browserStorageStateFilePath().endsWith(join("auth", "storage-state.json")),
        true,
      );
    } finally {
      restoreEnv("SUBSTACK_CLI_STATE_DIR", previous);
    }
  });

  it("falls back to the current working directory", () => {
    const previous = process.env.SUBSTACK_CLI_STATE_DIR;
    Reflect.deleteProperty(process.env, "SUBSTACK_CLI_STATE_DIR");

    try {
      assert.equal(stateDir().endsWith(".substack-cli"), true);
      assert.equal(fallbackHomeStateDir().endsWith(".substack-cli"), true);
    } finally {
      restoreEnv("SUBSTACK_CLI_STATE_DIR", previous);
    }
  });
});

function restoreEnv(name: string, value: string | undefined): void {
  if (value === undefined) {
    Reflect.deleteProperty(process.env, name);
    return;
  }

  process.env[name] = value;
}
