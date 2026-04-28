import { writeFile } from "node:fs/promises";
import type { PreparedPost } from "../types.js";
import {
  loadSession,
  saveSession,
  createStoredSession,
} from "../auth/session-store.js";
import {
  insertTextIntoActiveElement,
  pasteHtmlIntoEditor,
  getEditorText,
} from "../browser/editor.js";
import {
  createStagehandSession,
  type StagehandSession,
} from "../browser/stagehand.js";
import { loadEffectiveConfig, requirePublicationUrl } from "../config/store.js";
import { runLocalDraftWorkflow } from "./local-workflow.js";
import { resolveTransport, type TransportPreference } from "./transport.js";
import { resolvePostTitle } from "./title.js";

export interface WorkflowStep {
  name: string;
  status: "ok" | "error";
  startedAt: string;
  endedAt: string;
  details?: Record<string, unknown> | undefined;
  error?: string | undefined;
}

export interface BrowserWorkflowResult {
  status:
    | "draft-created"
    | "schedule-review-opened"
    | "publish-review-opened"
    | "publish-clicked";
  mode: PreparedPost["mode"];
  title: string;
  currentUrl: string;
  finalUrl: string;
  finalState: string;
  publishedUrl?: string | undefined;
  transport: {
    requested: TransportPreference;
    selected: "browser";
    fallbackReason?: string | undefined;
  };
  scheduleAt?: string | undefined;
  editorTextLength?: number | undefined;
  browserbaseSessionId?: string | undefined;
  browserbaseSessionUrl?: string | undefined;
  browserbaseDebugUrl?: string | undefined;
  trace: WorkflowStep[];
}

export class BrowserWorkflowError extends Error {
  constructor(
    message: string,
    readonly trace: WorkflowStep[],
  ) {
    super(message);
    this.name = "BrowserWorkflowError";
  }
}

export interface BrowserWorkflowOptions {
  dryRun?: boolean;
  yes?: boolean;
  reviewOnly?: boolean;
  traceOut?: string | undefined;
  experimentalInjectState?: boolean;
  sessionId?: string | undefined;
  transport?: TransportPreference | undefined;
}

export function shouldOpenPublishReview(
  options: BrowserWorkflowOptions,
): boolean {
  return options.reviewOnly === true;
}

export async function runBrowserWorkflow(
  prepared: PreparedPost,
  options: BrowserWorkflowOptions,
): Promise<void> {
  if (options.dryRun) {
    printPreparedPost(prepared);
    return;
  }

  if (
    (prepared.mode === "publish" || prepared.mode === "schedule") &&
    !options.yes
  ) {
    throw new Error(
      "Publishing and scheduling require --yes. Run with --dry-run first.",
    );
  }

  const config = await loadEffectiveConfig();
  const transport = resolveTransport(options.transport ?? "auto");

  if (config.browserRuntime === "local") {
    const result = await runLocalDraftWorkflow(prepared, config, transport);
    await maybeWriteTrace(result, options.traceOut);
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  const storedSession = await loadSession();
  const session = await createStagehandSession({
    config,
    browserbaseSessionId:
      options.sessionId ?? storedSession?.browserbaseSessionId,
    keepAlive: true,
  });

  try {
    if (session.browserbaseSessionId) {
      await saveSession(
        createStoredSession({
          browserbaseSessionId: session.browserbaseSessionId,
          publicationUrl: session.publicationUrl,
          browserbaseSessionUrl: session.browserbaseSessionUrl,
          browserbaseDebugUrl: session.browserbaseDebugUrl,
        }),
      );
    }

    try {
      const result = await createDraftInBrowser(
        session,
        prepared,
        options,
        transport,
      );
      await maybeWriteTrace(result, options.traceOut);
      console.log(JSON.stringify(result, null, 2));
    } catch (error) {
      if (error instanceof BrowserWorkflowError) {
        console.error(
          JSON.stringify(
            {
              status: "validation-failed",
              message: error.message,
              trace: error.trace,
              browserbaseSessionId: session.browserbaseSessionId,
              browserbaseSessionUrl: session.browserbaseSessionUrl,
              browserbaseDebugUrl: session.browserbaseDebugUrl,
            },
            null,
            2,
          ),
        );
      }

      throw error;
    }
  } finally {
    await session.close();
  }
}

async function createDraftInBrowser(
  session: StagehandSession,
  prepared: PreparedPost,
  options: BrowserWorkflowOptions,
  transport: ReturnType<typeof resolveTransport>,
): Promise<BrowserWorkflowResult> {
  const title = resolvePostTitle(prepared.post);
  const publicationUrl = requirePublicationUrl(await loadEffectiveConfig());
  const trace: WorkflowStep[] = [];

  await recordStep(trace, "navigate-publication", async () => {
    await session.page.goto(publicationUrl, {
      waitUntil: "domcontentloaded",
      timeoutMs: 60000,
    });
    return { url: publicationUrl };
  });

  await observedAct(
    trace,
    session,
    "open-draft-editor",
    "Open the publisher dashboard for this publication, then start creating a new text post draft.",
    120000,
  );

  await observedAct(
    trace,
    session,
    "focus-title",
    "Focus the post title field.",
    60000,
  );
  const titleResult = await recordStep(trace, "insert-title", async () => {
    const result = await insertTextIntoActiveElement(session.page, title);
    return { ...result, titleLength: title.length };
  });

  if (!titleResult.ok) {
    throw new BrowserWorkflowError(
      `Could not insert title: ${titleResult.reason ?? "unknown error"}`,
      trace,
    );
  }

  await observedAct(
    trace,
    session,
    "focus-body",
    "Focus the main body editor for the post.",
    60000,
  );

  if (options.experimentalInjectState) {
    throw new BrowserWorkflowError(
      "Experimental editor-state injection is planned but not implemented. Use the paste-based default path.",
      trace,
    );
  }

  const bodyResult = await recordStep(trace, "insert-body", async () => {
    const result = await pasteHtmlIntoEditor(session.page, {
      html: prepared.post.html,
      markdown: prepared.post.markdown,
      document: prepared.post.document,
    });

    return {
      ...result,
      htmlLength: prepared.post.html.length,
      nodeCount: countDocumentNodes(prepared.post.document),
    };
  });

  if (!bodyResult.ok) {
    throw new BrowserWorkflowError(
      `Could not insert body: ${bodyResult.reason ?? "unknown error"}`,
      trace,
    );
  }

  const editorText = await recordStep(trace, "verify-editor-text", async () => {
    const text = await getEditorText(session.page);
    return { text, length: text.length };
  });
  const currentUrl = session.page.url();

  if (prepared.mode === "draft") {
    return {
      status: "draft-created",
      mode: prepared.mode,
      title,
      currentUrl,
      finalUrl: currentUrl,
      finalState: "draft-created",
      publishedUrl: undefined,
      transport,
      editorTextLength: editorText.length,
      browserbaseSessionId: session.browserbaseSessionId,
      browserbaseSessionUrl: session.browserbaseSessionUrl,
      browserbaseDebugUrl: session.browserbaseDebugUrl,
      trace,
    };
  }

  await observedAct(
    trace,
    session,
    "open-publish-settings",
    "Click Continue to review the post publishing settings.",
    60000,
  );

  if (prepared.mode === "publish" && shouldOpenPublishReview(options)) {
    const finalUrl = session.page.url();
    return {
      status: "publish-review-opened",
      mode: prepared.mode,
      title,
      currentUrl: finalUrl,
      finalUrl,
      finalState: "publish-review-opened",
      publishedUrl: undefined,
      transport,
      browserbaseSessionId: session.browserbaseSessionId,
      browserbaseSessionUrl: session.browserbaseSessionUrl,
      browserbaseDebugUrl: session.browserbaseDebugUrl,
      trace,
    };
  }

  if (prepared.mode === "schedule") {
    await observedAct(
      trace,
      session,
      "open-schedule-settings",
      "Choose the schedule option for this post and leave the scheduler open for the user to verify the date and time.",
      60000,
    );

    const finalUrl = session.page.url();
    return {
      status: "schedule-review-opened",
      mode: prepared.mode,
      scheduleAt: prepared.scheduleAt,
      title,
      currentUrl: finalUrl,
      finalUrl,
      finalState: "schedule-review-opened",
      publishedUrl: undefined,
      transport,
      browserbaseSessionId: session.browserbaseSessionId,
      browserbaseSessionUrl: session.browserbaseSessionUrl,
      browserbaseDebugUrl: session.browserbaseDebugUrl,
      trace,
    };
  }

  await observedAct(
    trace,
    session,
    "click-final-publish",
    "Click the final Publish button for this post.",
    60000,
  );

  const finalUrl = session.page.url();
  return {
    status: "publish-clicked",
    mode: prepared.mode,
    title,
    currentUrl: finalUrl,
    finalUrl,
    finalState: "publish-clicked",
    publishedUrl: undefined,
    transport,
    browserbaseSessionId: session.browserbaseSessionId,
    browserbaseSessionUrl: session.browserbaseSessionUrl,
    browserbaseDebugUrl: session.browserbaseDebugUrl,
    trace,
  };
}

export function printPreparedPost(prepared: PreparedPost): void {
  const { post } = prepared;

  console.log(
    JSON.stringify(
      {
        mode: prepared.mode,
        scheduleAt: prepared.scheduleAt,
        filePath: post.filePath,
        metadata: post.metadata,
        html: post.html,
        document: post.document,
      },
      null,
      2,
    ),
  );
}

async function observedAct(
  trace: WorkflowStep[],
  session: StagehandSession,
  name: string,
  instruction: string,
  timeout: number,
): Promise<void> {
  try {
    await recordStep(trace, name, async () => {
      const actions = await session.stagehand.observe(instruction, { timeout });
      const [action] = actions;

      if (action) {
        const result = await session.stagehand.act(action, { timeout });
        return {
          observedActions: actions.length,
          actionDescription: action.description,
          success: result.success,
          message: result.message,
        };
      }

      const result = await session.stagehand.act(instruction, { timeout });
      return {
        observedActions: 0,
        success: result.success,
        message: result.message,
      };
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new BrowserWorkflowError(`${name} failed: ${message}`, trace);
  }
}

async function recordStep<T extends Record<string, unknown>>(
  trace: WorkflowStep[],
  name: string,
  run: () => Promise<T>,
): Promise<T> {
  const startedAt = new Date().toISOString();

  try {
    const details = await run();
    trace.push({
      name,
      status: "ok",
      startedAt,
      endedAt: new Date().toISOString(),
      details: sanitizeStepDetails(details),
    });

    return details;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    trace.push({
      name,
      status: "error",
      startedAt,
      endedAt: new Date().toISOString(),
      error: message,
    });
    throw error;
  }
}

function sanitizeStepDetails(
  details: Record<string, unknown>,
): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(details)) {
    sanitized[key] =
      key === "text" && typeof value === "string"
        ? { length: value.length }
        : value;
  }

  return sanitized;
}

function countDocumentNodes(node: PreparedPost["post"]["document"]): number {
  return (
    1 +
    (node.content ?? []).reduce(
      (total, child) => total + countDocumentNodes(child),
      0,
    )
  );
}

async function maybeWriteTrace(
  result: BrowserWorkflowResult,
  traceOut: string | undefined,
): Promise<void> {
  if (!traceOut) {
    return;
  }

  await writeFile(traceOut, `${JSON.stringify(result, null, 2)}\n`, "utf8");
}
