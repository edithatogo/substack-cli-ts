export type AgentAuthority = "read" | "review" | "capture" | "creator";

export interface AgentTool {
  name: string;
  authority: AgentAuthority;
  execute: (input: unknown) => Promise<unknown>;
}

export interface AgentAction {
  tool: string;
  input: unknown;
}

export interface AgentHistoryEntry extends AgentAction {
  output: unknown;
}

export type AgentDecision = { kind: "done" } | ({ kind: "act" } & AgentAction);

export interface AgentRunResult {
  status: "completed" | "blocked" | "step-limit";
  history: AgentHistoryEntry[];
  reason?: string | undefined;
}

export async function runAutonomousAgentScenario(options: {
  goal: string;
  tools: readonly AgentTool[];
  planner: (context: {
    goal: string;
    history: readonly AgentHistoryEntry[];
  }) => Promise<AgentDecision>;
  allowedAuthorities?: readonly AgentAuthority[] | undefined;
  maxSteps?: number | undefined;
}): Promise<AgentRunResult> {
  const allowed = new Set(options.allowedAuthorities ?? ["read", "review"]);
  const tools = new Map(options.tools.map((tool) => [tool.name, tool]));
  const history: AgentHistoryEntry[] = [];
  const maxSteps = options.maxSteps ?? 8;

  for (let step = 0; step < maxSteps; step += 1) {
    const decision = await options.planner({ goal: options.goal, history });
    if (decision.kind === "done") return { status: "completed", history };

    const tool = tools.get(decision.tool);
    if (!tool) {
      return { status: "blocked", history, reason: `Unknown tool: ${decision.tool}` };
    }
    if (!allowed.has(tool.authority)) {
      return {
        status: "blocked",
        history,
        reason: `Authority ${tool.authority} is not allowed for autonomous execution.`,
      };
    }

    const output = await tool.execute(decision.input);
    history.push({ tool: decision.tool, input: decision.input, output });
  }

  return { status: "step-limit", history, reason: `Exceeded ${maxSteps} autonomous steps.` };
}
