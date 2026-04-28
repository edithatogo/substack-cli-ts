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
