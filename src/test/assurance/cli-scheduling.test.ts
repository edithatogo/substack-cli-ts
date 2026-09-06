import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { enforceSchedulingFreezePolicy } from "../../cli.js";
import * as policyModule from "../../policy/scheduling-freeze.js";

vi.mock("../../policy/scheduling-freeze.js", () => {
  return {
    evaluateSchedulingFreezePolicy: vi.fn(),
    buildSchedulingFreezeBlockReport: vi.fn(),
  };
});

describe("enforceSchedulingFreezePolicy", () => {
  let originalExitCode: number | undefined;

  beforeEach(() => {
    vi.resetAllMocks();
    originalExitCode = process.exitCode;
  });

  afterEach(() => {
    process.exitCode = originalExitCode;
  });

  it("should return true when missing scheduledAt and calendar limitations exist", async () => {
    vi.mocked(policyModule.evaluateSchedulingFreezePolicy).mockResolvedValue({ allowed: true });

    const result = await enforceSchedulingFreezePolicy({
      operation: "test-op",
      freezePolicyPath: "path",
      cataloguePath: undefined,
      candidate: { sourceFile: "test" },
    });

    expect(result).toBe(true);
  });
});
