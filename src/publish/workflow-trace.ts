import { readFile } from "node:fs/promises";
import { z } from "zod";
import type { BrowserWorkflowResult } from "./browser-workflow.js";

export interface WorkflowTraceReview {
  status: BrowserWorkflowResult["status"];
  mode: BrowserWorkflowResult["mode"];
  title: string;
  currentUrl: string;
  scheduleAt?: string | undefined;
  editorTextLength?: number | undefined;
  transportRequested: BrowserWorkflowResult["transport"]["requested"];
  transportSelected: BrowserWorkflowResult["transport"]["selected"];
  fallbackReason?: string | undefined;
  traceCount: number;
  stepNames: string[];
  failedStepNames: string[];
  browserSessionPresent: boolean;
  note: string;
}

export interface WorkflowTraceComparison {
  equal: boolean;
  expected: WorkflowTraceReview;
  actual: WorkflowTraceReview;
  differences: string[];
}

const WorkflowStepSchema = z.object({
  name: z.string().min(1),
  status: z.union([z.literal("ok"), z.literal("error")]),
  startedAt: z.string().datetime(),
  endedAt: z.string().datetime(),
  details: z.record(z.string(), z.unknown()).optional(),
  error: z.string().optional(),
});

const BrowserWorkflowResultSchema = z.object({
  status: z.union([
    z.literal("draft-created"),
    z.literal("schedule-review-opened"),
    z.literal("publish-review-opened"),
    z.literal("publish-clicked"),
  ]),
  mode: z.union([
    z.literal("draft"),
    z.literal("publish"),
    z.literal("schedule"),
  ]),
  title: z.string().min(1),
  currentUrl: z.string().min(1),
  scheduleAt: z.string().optional(),
  editorTextLength: z.number().int().nonnegative().optional(),
  transport: z.object({
    requested: z.union([
      z.literal("browser"),
      z.literal("api"),
      z.literal("auto"),
    ]),
    selected: z.literal("browser"),
    fallbackReason: z.string().optional(),
  }),
  browserbaseSessionId: z.string().optional(),
  browserbaseSessionUrl: z.string().optional(),
  browserbaseDebugUrl: z.string().optional(),
  trace: z.array(WorkflowStepSchema),
});

export async function reviewWorkflowTraceArtifact(
  filePath: string,
): Promise<WorkflowTraceReview> {
  const raw = await readFile(filePath, "utf8");
  const artifact = BrowserWorkflowResultSchema.parse(JSON.parse(raw));

  return {
    status: artifact.status,
    mode: artifact.mode,
    title: artifact.title,
    currentUrl: artifact.currentUrl,
    scheduleAt: artifact.scheduleAt,
    editorTextLength: artifact.editorTextLength,
    transportRequested: artifact.transport.requested,
    transportSelected: artifact.transport.selected,
    fallbackReason: artifact.transport.fallbackReason,
    traceCount: artifact.trace.length,
    stepNames: artifact.trace.map((step) => step.name),
    failedStepNames: artifact.trace
      .filter((step) => step.status === "error")
      .map((step) => step.name),
    browserSessionPresent:
      Boolean(artifact.browserbaseSessionId) ||
      Boolean(artifact.browserbaseSessionUrl) ||
      Boolean(artifact.browserbaseDebugUrl),
    note: "Use this summary to compare review-only, schedule-review, and publish-click traces without exposing session URLs.",
  };
}

export async function compareWorkflowTraceArtifacts(
  expectedFile: string,
  actualFile: string,
): Promise<WorkflowTraceComparison> {
  const [expected, actual] = await Promise.all([
    reviewWorkflowTraceArtifact(expectedFile),
    reviewWorkflowTraceArtifact(actualFile),
  ]);

  const differences = diffWorkflowTraceReviews(expected, actual);

  return {
    equal: differences.length === 0,
    expected,
    actual,
    differences,
  };
}

export function summarizeWorkflowTrace(review: WorkflowTraceReview): unknown {
  return {
    status: review.status,
    mode: review.mode,
    title: review.title,
    currentUrl: review.currentUrl,
    scheduleAt: review.scheduleAt,
    editorTextLength: review.editorTextLength,
    transport: {
      requested: review.transportRequested,
      selected: review.transportSelected,
      fallbackReason: review.fallbackReason,
    },
    traceCount: review.traceCount,
    stepNames: review.stepNames,
    failedStepNames: review.failedStepNames,
    browserSessionPresent: review.browserSessionPresent,
    note: review.note,
  };
}

function diffWorkflowTraceReviews(
  expected: WorkflowTraceReview,
  actual: WorkflowTraceReview,
): string[] {
  const differences: string[] = [];

  compareField(differences, "status", expected.status, actual.status);
  compareField(differences, "mode", expected.mode, actual.mode);
  compareField(differences, "title", expected.title, actual.title);
  compareField(
    differences,
    "currentUrl",
    expected.currentUrl,
    actual.currentUrl,
  );
  compareField(
    differences,
    "scheduleAt",
    expected.scheduleAt,
    actual.scheduleAt,
  );
  compareField(
    differences,
    "editorTextLength",
    expected.editorTextLength,
    actual.editorTextLength,
  );
  compareField(
    differences,
    "transport.requested",
    expected.transportRequested,
    actual.transportRequested,
  );
  compareField(
    differences,
    "transport.selected",
    expected.transportSelected,
    actual.transportSelected,
  );
  compareField(
    differences,
    "transport.fallbackReason",
    expected.fallbackReason,
    actual.fallbackReason,
  );
  compareField(
    differences,
    "traceCount",
    expected.traceCount,
    actual.traceCount,
  );
  compareField(differences, "stepNames", expected.stepNames, actual.stepNames);
  compareField(
    differences,
    "failedStepNames",
    expected.failedStepNames,
    actual.failedStepNames,
  );
  compareField(
    differences,
    "browserSessionPresent",
    expected.browserSessionPresent,
    actual.browserSessionPresent,
  );

  return differences;
}

function compareField(
  differences: string[],
  name: string,
  expected: unknown,
  actual: unknown,
): void {
  if (stableStringify(expected) !== stableStringify(actual)) {
    differences.push(
      `${name}: ${stableValue(expected)} != ${stableValue(actual)}`,
    );
  }
}

function stableStringify(value: unknown): string {
  const serialized = stringifyMaybe(value);
  return serialized === undefined ? "undefined" : serialized;
}

function stringifyMaybe(value: unknown): string | undefined {
  if (value === undefined) {
    return undefined;
  }

  return JSON.stringify(sortValue(value));
}

function sortValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortValue);
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, child]) => [key, sortValue(child)]),
    );
  }

  return value;
}

function stableValue(value: unknown): string {
  return stableStringify(value);
}
