import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { describe, it } from "vitest";
import { createLogger, getLoggedPackageVersion, rootLogger, silentLogger } from "./logger.js";

describe("createLogger", () => {
  it("returns a pino logger instance with the package version in base context", () => {
    const log = createLogger({ name: "test" });
    assert.equal(typeof log.info, "function");
    assert.equal(typeof log.child, "function");
    // The logger must not throw when binding the version.
    log.info({ event: "unit-test" }, "logger smoke test");
  });

  it("respects an explicit level option", () => {
    const log = createLogger({ name: "test", level: "debug" });
    assert.equal(log.level, "debug");
  });

  it("falls back to info when LOG_LEVEL is invalid", () => {
    const previous = process.env.LOG_LEVEL;
    process.env.LOG_LEVEL = "not-a-level";
    try {
      const log = createLogger({ name: "test" });
      assert.equal(log.level, "info");
    } finally {
      if (previous === undefined) {
        delete process.env.LOG_LEVEL;
      } else {
        process.env.LOG_LEVEL = previous;
      }
    }
  });
});

describe("rootLogger", () => {
  it("is a usable shared logger", () => {
    assert.equal(typeof rootLogger.info, "function");
    rootLogger.info("root logger smoke test");
  });
});

describe("silentLogger", () => {
  it("has level silent so it never emits", () => {
    assert.equal(silentLogger.level, "silent");
  });
});

describe("getLoggedPackageVersion", () => {
  it("matches the compiled CLI --version output", () => {
    // The CLI reads PACKAGE_VERSION dynamically; confirm the logger's view agrees.
    const cliVersion = execFileSync("node", ["dist/cli.js", "--version"], {
      encoding: "utf8",
    }).trim();
    assert.equal(getLoggedPackageVersion(), cliVersion);
  });
});
