import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { enforceSchedulingFreezePolicy } from "../../cli.js";
import * as policyModule from "../../policy/scheduling-freeze.js";
import * as cliModule from "../../cli.js";

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

  it("should return true when missing schedule At and calendar limitations exist", async () => {
    vi.mocked(policyModule.evaluateSchedulingFreezePolicy).mockResolvedValue({ allowed: true });

    // Test the specific branch where options.candidate?.scheduledAt is falsy
    // This happens when we provide a candidate but no scheduledAt
    const result = await enforceSchedulingFreezePolicy({
      operation: "test-op",
      freezePolicyPath: "path", // need to trigger the second part of the condition (options.cataloguePath || freezePath)
      cataloguePath: undefined,
      candidate: { sourceFile: "test" }, // missing schedule At
    });

    expect(result).toBe(true);
  });
});
