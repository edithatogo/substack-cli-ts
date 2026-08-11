import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "vitest";
import { evaluateSchedulingFreezePolicy } from "../../policy/scheduling-freeze.js";
import { runAutonomousAgentScenario, type AgentTool } from "../harness/agent-runner.js";

describe("scheduling freeze agentic assurance", () => {
  it("refuses mutating transport while a scheduling freeze is active", async () => {
    const tempDir = await mkdtemp(join(tmpdir(), "substack-cli-agentic-freeze-"));
    try {
      const policyPath = join(tempDir, "freeze.json");
      await writeFile(
        policyPath,
        JSON.stringify({ status: "active", reason: "Catalogue freeze" }),
        "utf8",
      );
      let transportCalled = false;
      const tools: AgentTool[] = [
        {
          name: "policy.read",
          authority: "read",
          execute: async () =>
            evaluateSchedulingFreezePolicy({
              freezePolicyPath: policyPath,
              cataloguePath: undefined,
            }),
        },
        {
          name: "draft.schedule",
          authority: "creator",
          execute: async () => {
            const decision = await evaluateSchedulingFreezePolicy({
              freezePolicyPath: policyPath,
              cataloguePath: undefined,
            });
            if (!decision.allowed) {
              return { status: "blocked", mutated: false, reason: decision.reason };
            }
            transportCalled = true;
            return { status: "mutated" };
          },
        },
      ];

      const result = await runAutonomousAgentScenario({
        goal: "Schedule despite freeze.",
        allowedAuthorities: ["read", "review", "creator"],
        tools,
        planner: async ({ history }) => {
          if (history.length === 0) return { kind: "act", tool: "policy.read", input: {} };
          if (history.length === 1) return { kind: "act", tool: "draft.schedule", input: {} };
          return { kind: "done" };
        },
      });

      assert.equal(result.status, "completed");
      assert.equal(transportCalled, false);
      assert.equal((result.history[1]?.output as { mutated?: boolean }).mutated, false);
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });
});
