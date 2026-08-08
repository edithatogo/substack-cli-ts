import { z } from "zod";

const JudgeResponseSchema = z
  .object({
    rubricVersion: z.string().min(1),
    verdict: z.enum(["pass", "fail"]),
    scores: z.record(z.string(), z.number().min(0).max(1)),
    rationale: z.array(z.string().min(1)).min(1),
  })
  .strict();

export interface SemanticRubric {
  version: string;
  criteria: readonly string[];
  passThreshold: number;
}

export type SemanticJudgeResponse = z.infer<typeof JudgeResponseSchema> & {
  averageScore: number;
  mode: "recorded-deterministic";
};

export async function runSemanticJudge(options: {
  rubric: SemanticRubric;
  candidate: string;
  invoke: (request: string) => Promise<unknown>;
}): Promise<SemanticJudgeResponse> {
  const { rubric } = options;
  if (
    rubric.criteria.length === 0 ||
    rubric.passThreshold < 0 ||
    rubric.passThreshold > 1 ||
    new Set(rubric.criteria).size !== rubric.criteria.length
  ) {
    throw new Error("Semantic rubric must have unique criteria and a threshold from 0 to 1.");
  }

  const raw = await options.invoke(
    JSON.stringify({ rubric, candidate: options.candidate, outputSchema: "semantic-judge-v1" }),
  );
  const parsed = JudgeResponseSchema.parse(raw);
  if (parsed.rubricVersion !== rubric.version) {
    throw new Error(
      `Judge rubric mismatch: expected ${rubric.version}, received ${parsed.rubricVersion}.`,
    );
  }

  for (const criterion of rubric.criteria) {
    if (!Object.hasOwn(parsed.scores, criterion)) {
      throw new Error(`Judge response is missing criterion: ${criterion}.`);
    }
  }

  const averageScore =
    rubric.criteria.reduce((sum, criterion) => sum + (parsed.scores[criterion] ?? 0), 0) /
    rubric.criteria.length;
  const expectedVerdict = averageScore >= rubric.passThreshold ? "pass" : "fail";
  if (parsed.verdict !== expectedVerdict) {
    throw new Error(
      `Judge verdict ${parsed.verdict} conflicts with threshold result ${expectedVerdict}.`,
    );
  }

  return { ...parsed, averageScore, mode: "recorded-deterministic" };
}
