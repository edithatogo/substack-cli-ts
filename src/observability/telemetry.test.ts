import assert from "node:assert/strict";
import { describe, it } from "vitest";
import {
  OBSERVABILITY_SCOPES,
  observeOperation,
  safeTelemetryAttributes,
  telemetryStatus,
} from "./telemetry.js";

describe("privacy-preserving telemetry", () => {
  it("defaults to no export and declares every required scope", () => {
    const previous = process.env.SUBSTACK_TELEMETRY_EXPORT;
    delete process.env.SUBSTACK_TELEMETRY_EXPORT;
    assert.equal(telemetryStatus().exportMode, "none");
    assert.deepEqual(OBSERVABILITY_SCOPES, [
      "cli",
      "mcp",
      "simulator",
      "parser",
      "state",
      "release",
    ]);
    if (previous) process.env.SUBSTACK_TELEMETRY_EXPORT = previous;
  });

  it("reports explicit host-provider opt in", () => {
    const previous = process.env.SUBSTACK_TELEMETRY_EXPORT;
    process.env.SUBSTACK_TELEMETRY_EXPORT = "host-provider";
    assert.equal(telemetryStatus().exportMode, "host-provider");
    if (previous === undefined) delete process.env.SUBSTACK_TELEMETRY_EXPORT;
    else process.env.SUBSTACK_TELEMETRY_EXPORT = previous;
  });

  it("drops secrets, paths, content and unknown attributes", () => {
    assert.deepEqual(
      safeTelemetryAttributes({
        operation: "parse",
        mode: "inspect",
        cookie: "secret",
        file: "private.md",
        body: "private content",
        component: { unsafe: true },
      }),
      { operation: "parse", mode: "inspect" },
    );
  });

  it("observes success and errors without changing behavior", async () => {
    await assert.doesNotReject(() => observeOperation("parser", "parse", async () => 42));
    await assert.rejects(
      () => observeOperation("state", "load", async () => Promise.reject(new Error("expected"))),
      /expected/,
    );
    await assert.rejects(() => observeOperation("cli", "INVALID", () => undefined), /invalid/);
    await assert.rejects(
      () => observeOperation("unknown" as "cli", "valid", () => undefined),
      /Unsupported telemetry scope/,
    );
  });
});
