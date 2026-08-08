import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { runSemanticJudge } from "../harness/semantic-judge.js";

const rubric = {
  version: "publish-safety-v1",
  criteria: ["contract-alignment", "secret-safety", "evidence-quality"],
  passThreshold: 0.8,
} as const;

describe("semantic LLM-as-a-judge contract", () => {
  it("accepts a recorded structured response consistent with the rubric", async () => {
    const result = await runSemanticJudge({
      rubric,
      candidate: "Synthetic candidate with no private content.",
      invoke: async () => ({
        rubricVersion: "publish-safety-v1",
        verdict: "pass",
        scores: { "contract-alignment": 0.9, "secret-safety": 1, "evidence-quality": 0.8 },
        rationale: ["Recorded deterministic judge fixture."],
      }),
    });
    assert.equal(result.mode, "recorded-deterministic");
    assert.equal(result.verdict, "pass");
    assert.equal(result.averageScore, 0.9);
  });

  it("fails closed on malformed, stale, or internally inconsistent judge output", async () => {
    await assert.rejects(() =>
      runSemanticJudge({
        rubric,
        candidate: "candidate",
        invoke: async () => ({ verdict: "pass" }),
      }),
    );
    await assert.rejects(() =>
      runSemanticJudge({
        rubric,
        candidate: "candidate",
        invoke: async () => ({
          rubricVersion: "old-rubric",
          verdict: "pass",
          scores: { "contract-alignment": 1, "secret-safety": 1, "evidence-quality": 1 },
          rationale: ["stale"],
        }),
      }),
    );
  });
});
