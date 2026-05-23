import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { createStoredSession, loadSession, saveSession } from "../auth/session-store.js";
import {
  getEditorText,
  insertTextIntoActiveElement,
  pasteHtmlIntoEditor,
} from "../browser/editor.js";
import { CaptchaDetectedError } from "../browser/errors.js";
import {
  type StagehandSession,
  createStagehandSession,
  withStagehandRetry,
} from "../browser/stagehand.js";
import { loadEffectiveConfig, requirePublicationUrl } from "../config/store.js";
import type { DraftMapping } from "../substack-api/draft-mappings.js";
import { validatePayloadCompatibility } from "../substack-api/payload.js";
import type { PreparedPost } from "../types.js";
import { LocalWorkflowError, runLocalDraftWorkflow } from "./local-workflow.js";
import { resolvePostTitle } from "./title.js";
import {
  type TransportPreference,
  type TransportResolution,
  resolveTransport,
} from "./transport.js";

export interface WorkflowStep {
  name: string;
  status: "ok" | "error";
  startedAt: string;
  endedAt: string;
  details?: Record<string, unknown> | undefined;
  error?: string | undefined;
}

export type DraftOperation = "create" | "update";

export interface BrowserWorkflowResult {
  status:
    | "draft-created"
    | "draft-updated"
    | "schedule-review-opened"
    | "publish-review-opened"
    | "publish-clicked"
    | "published"
    | "scheduled";
  operation: DraftOperation;
  mode: PreparedPost["mode"];
  title: string;
  currentUrl: string;
  finalUrl: string;
  finalState: string;
  publishedUrl?: string | undefined;
  draftId?: string | undefined;
  draftUrl?: string | undefined;
  metadata: {
    subtitle?: string | undefined;
    tags?: string[];
    audience?: string | undefined;
    section?: string | undefined;
  };
  transport: {
    requested: TransportPreference;
    selected: TransportResolution["selected"];
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
  draftMapping?: DraftMapping | undefined;
}

export function shouldOpenPublishReview(options: BrowserWorkflowOptions): boolean {
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

  if ((prepared.mode === "publish" || prepared.mode === "schedule") && !options.yes) {
    throw new Error("Publishing and scheduling require --yes. Run with --dry-run first.");
  }

  const config = await loadEffectiveConfig();
  const transport = resolveTransport(options.transport ?? "auto");

  if (config.browserRuntime === "local") {
    try {
      const result = await runLocalDraftWorkflow(
        prepared,
        config,
        transport,
        options.draftMapping,
        options,
      );
      await maybeWriteTrace(result, options.traceOut);
      console.log(JSON.stringify(result, null, 2));
    } catch (error) {
      if (error instanceof LocalWorkflowError) {
        const result = buildFailedWorkflowResult(error, prepared, transport);
        await maybeWriteTrace(result, options.traceOut);
        console.error(JSON.stringify(result, null, 2));
      }
      throw error;
    }
    return;
  }

  const storedSession = await loadSession();
  const session = await createStagehandSession({
    config,
    browserbaseSessionId: options.sessionId ?? storedSession?.browserbaseSessionId,
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
      const result = await createDraftInBrowser(session, prepared, options, transport);
      await maybeWriteTrace(result, options.traceOut);
      console.log(JSON.stringify(result, null, 2));
    } catch (error) {
      if (error instanceof BrowserWorkflowError) {
        const result = {
          status: "validation-failed",
          message: error.message,
          trace: error.trace,
          browserbaseSessionId: session.browserbaseSessionId,
          browserbaseSessionUrl: session.browserbaseSessionUrl,
          browserbaseDebugUrl: session.browserbaseDebugUrl,
        };
        await maybeWriteTrace(result, options.traceOut);
        console.error(JSON.stringify(result, null, 2));
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
  const existingDraft = options.draftMapping;
  const operation: DraftOperation = existingDraft ? "update" : "create";

  if (existingDraft?.draftUrl) {
    await recordStep(trace, "navigate-existing-draft", async () => {
      await session.page.goto(existingDraft.draftUrl!, {
        waitUntil: "domcontentloaded",
        timeoutMs: 60000,
      });
      await checkForCaptcha(session);
      return { draftUrl: existingDraft.draftUrl };
    });
  } else {
    await recordStep(trace, "navigate-publication", async () => {
      await session.page.goto(publicationUrl, {
        waitUntil: "domcontentloaded",
        timeoutMs: 60000,
      });
      await checkForCaptcha(session);
      return { url: publicationUrl };
    });

    await observedAct(
      trace,
      session,
      "open-draft-editor",
      "Open the publisher dashboard for this publication, then start creating a new text post draft.",
      120000,
    );
  }

  await observedAct(trace, session, "focus-title", "Focus the post title field.", 60000);
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

  if (prepared.post.metadata.subtitle) {
    await observedAct(
      trace,
      session,
      "set-subtitle",
      `Set the subtitle/description for this post to: ${prepared.post.metadata.subtitle}`,
      60000,
    );
  }

  if (prepared.post.metadata.tags && prepared.post.metadata.tags.length > 0) {
    await observedAct(
      trace,
      session,
      "set-tags",
      `Add the following tags to this post: ${prepared.post.metadata.tags.join(", ")}`,
      60000,
    );
  }

  if (prepared.post.metadata.audience) {
    await observedAct(
      trace,
      session,
      "set-audience",
      `Set the audience for this post to: ${prepared.post.metadata.audience}`,
      60000,
    );
  }

  if (prepared.post.metadata.section) {
    await observedAct(
      trace,
      session,
      "set-section",
      `Set the section for this post to: ${prepared.post.metadata.section}`,
      60000,
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
    console.warn(
      "Experimental editor-state injection is planned but not yet implemented. Falling back to the paste-based default path.",
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

  const baseResult = {
    operation,
    title,
    currentUrl,
    publishedUrl: undefined as string | undefined, // Captured after publish via waitForURL(/\/p\//) in the publish path above
    transport,
    editorTextLength: editorText.length,
    draftId: existingDraft?.draftId,
    draftUrl: existingDraft?.draftUrl,
    metadata: {
      subtitle: prepared.post.metadata.subtitle,
      tags: prepared.post.metadata.tags,
      audience: prepared.post.metadata.audience,
      section: prepared.post.metadata.section,
    },
    browserbaseSessionId: session.browserbaseSessionId,
    browserbaseSessionUrl: session.browserbaseSessionUrl,
    browserbaseDebugUrl: session.browserbaseDebugUrl,
    trace,
  };

  if (prepared.mode === "draft") {
    return {
      ...baseResult,
      status: operation === "update" ? "draft-updated" : "draft-created",
      mode: prepared.mode,
      finalUrl: currentUrl,
      finalState: operation === "update" ? "draft-updated" : "draft-created",
    };
  }

  await observedAct(
    trace,
    session,
    "open-publish-settings",
    `Click the "Continue" button to open the publish review screen. There is a button with visible text "Continue" near the top of the editor page.`,
    60000,
  );

  if (prepared.mode === "publish" && shouldOpenPublishReview(options)) {
    const finalUrl = session.page.url();
    return {
      ...baseResult,
      status: "publish-review-opened",
      mode: prepared.mode,
      finalUrl,
      finalState: "publish-review-opened",
    };
  }

  if (prepared.mode === "schedule") {
    await observedAct(
      trace,
      session,
      "open-schedule-settings",
      `Click the "Schedule" option or tab in the publish settings panel. On Substack, after clicking Continue the review panel has a "Schedule for later" option or a "Schedule" button.`,
      60000,
    );

    if (prepared.scheduleAt) {
      await observedAct(
        trace,
        session,
        "fill-schedule-date",
        `Find the date input or date picker in the scheduler panel and set it to the scheduled date. The date is: ${prepared.scheduleAt}. Set the date field to match this.`,
        60000,
      );

      await observedAct(
        trace,
        session,
        "fill-schedule-time",
        `Find the time input or dropdown in the scheduler panel and set it to the scheduled time. The full schedule timestamp is: ${prepared.scheduleAt}. Set the time to match this.`,
        60000,
      );
    }

    if (shouldOpenPublishReview(options)) {
      const finalUrl = session.page.url();
      return {
        ...baseResult,
        status: "schedule-review-opened",
        mode: prepared.mode,
        scheduleAt: prepared.scheduleAt,
        finalUrl,
        finalState: "schedule-review-opened",
      };
    }

    await observedAct(
      trace,
      session,
      "click-final-schedule",
      `Click the final "Schedule" button to confirm scheduling this post. Look for a visible button with text "Schedule" that is the final confirmation action.`,
      60000,
    );

    await recordStep(trace, "wait-for-schedule-confirmation", async () => {
      await checkForCaptcha(session);
      const url = session.page.url();
      const hasConfirmation = await session.page
        .evaluate(() => {
          return document.body.innerText.toLowerCase().includes("scheduled");
        })
        .catch(() => false);
      return { url, hasConfirmation, scheduleAt: prepared.scheduleAt };
    });

    const finalUrl = session.page.url();
    return {
      ...baseResult,
      status: "scheduled",
      mode: prepared.mode,
      scheduleAt: prepared.scheduleAt,
      finalUrl,
      finalState: "scheduled",
    };
  }

  await recordStep(trace, "verify-publish-review-screen", async () => {
    await checkForCaptcha(session);
    const url = session.page.url();
    const isReviewUrl = /\/publish\//.test(url) || /\/post\//.test(url);
    if (!isReviewUrl) {
      console.warn(
        `Warning: Current URL "${url}" does not look like a publish review screen. Expected URL containing "/publish/" or "/post/".`,
      );
    }
    return { url, looksLikeReviewScreen: isReviewUrl };
  });

  await observedAct(
    trace,
    session,
    "click-final-publish",
    `Click the button with text "Send to everyone now" to publish this post. It is inside the publish dialog/modal and may have a class containing "priority_primary". Look for a button with exact text "Send to everyone now".`,
    60000,
  );

  const publishUrl = await recordStep(trace, "wait-for-publish-navigation", async () => {
    await checkForCaptcha(session);
    const beforeUrl = session.page.url();
    // Poll for URL change (Stagehand Page does not expose waitForURL)
    const deadline = Date.now() + 30000;
    let afterUrl = beforeUrl;
    while (Date.now() < deadline && afterUrl === beforeUrl) {
      await session.page.waitForTimeout(500);
      afterUrl = session.page.url();
    }
    return { beforeUrl, afterUrl };
  });

  const finalUrl = session.page.url();
  return {
    ...baseResult,
    publishedUrl: publishUrl.afterUrl,
    status: "published",
    mode: prepared.mode,
    finalUrl,
    finalState: "published",
  };
}

export function printPreparedPost(prepared: PreparedPost): void {
  const { post } = prepared;
  const compatibility = validatePayloadCompatibility(post.document);

  console.log(
    JSON.stringify(
      {
        mode: prepared.mode,
        scheduleAt: prepared.scheduleAt,
        filePath: post.filePath,
        metadata: post.metadata,
        html: post.html,
        document: post.document,
        compatibility: {
          ok: compatibility.ok,
          supportedNodeTypes: compatibility.nodeTypes,
          supportedMarkTypes: compatibility.markTypes,
          unsupportedIssues: compatibility.issues.length > 0 ? compatibility.issues : undefined,
        },
      },
      null,
      2,
    ),
  );
}

async function checkForCaptcha(session: StagehandSession): Promise<void> {
  const url = session.page.url().toLowerCase();

  if (url.includes("challenge") || url.includes("captcha")) {
    throw new CaptchaDetectedError(session.browserbaseDebugUrl);
  }

  const hasCaptchaFrame = await session.page.evaluate(() => {
    const iframes = document.querySelectorAll<HTMLIFrameElement>(
      "iframe[src*='captcha'], iframe[src*='challenge'], iframe[title*='captcha' i], iframe[title*='challenge' i]",
    );
    for (const iframe of iframes) {
      if (iframe.checkVisibility()) {
        return true;
      }
    }
    return false;
  });

  if (hasCaptchaFrame) {
    throw new CaptchaDetectedError(session.browserbaseDebugUrl);
  }
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
      await checkForCaptcha(session);

      return await withStagehandRetry(
        async () => {
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
        },
        { retries: 2, label: name },
      );
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

function sanitizeStepDetails(details: Record<string, unknown>): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(details)) {
    sanitized[key] = key === "text" && typeof value === "string" ? { length: value.length } : value;
  }

  return sanitized;
}

function countDocumentNodes(node: PreparedPost["post"]["document"]): number {
  return 1 + (node.content ?? []).reduce((total, child) => total + countDocumentNodes(child), 0);
}

export async function maybeWriteTrace(
  result: unknown,
  traceOut: string | undefined,
): Promise<void> {
  if (!traceOut) {
    return;
  }

  const parent = dirname(traceOut);
  if (parent !== ".") {
    await mkdir(parent, { recursive: true });
  }

  await writeFile(traceOut, `${JSON.stringify(result, null, 2)}\n`, "utf8");
}

function buildFailedWorkflowResult(
  error: LocalWorkflowError,
  prepared: PreparedPost,
  transport: TransportResolution,
): Record<string, unknown> {
  return {
    status: "validation-failed",
    message: error.message,
    mode: prepared.mode,
    title: resolvePostTitle(prepared.post),
    metadata: {
      subtitle: prepared.post.metadata.subtitle,
      tags: prepared.post.metadata.tags,
      audience: prepared.post.metadata.audience,
      section: prepared.post.metadata.section,
    },
    transport,
    trace: error.trace,
  };
}
