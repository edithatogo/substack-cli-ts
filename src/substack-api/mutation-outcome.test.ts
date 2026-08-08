import { describe, expect, it } from "vitest";
import {
  classifyMutationError,
  outcomeUnknown,
  requireReconciliationBeforeReplay,
} from "./mutation-outcome.js";

describe("mutation outcomes", () => {
  it("represents transport failures as outcome-unknown", () => {
    const result = classifyMutationError("draft.create", new Error("socket closed"));
    expect(result).toEqual({
      kind: "outcome-unknown",
      operation: "draft.create",
      reason: "socket closed",
    });
    expect(() => requireReconciliationBeforeReplay(result)).toThrow(/Reconcile draft.create/);
  });

  it("requires reconciliation before replaying unknown outcomes", () => {
    expect(() =>
      requireReconciliationBeforeReplay(outcomeUnknown("post.publish", "timeout")),
    ).toThrow();
    expect(() => requireReconciliationBeforeReplay({ kind: "succeeded", value: 1 })).not.toThrow();
  });
});
