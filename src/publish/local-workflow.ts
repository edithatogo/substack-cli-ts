import type { Locator, Page } from "playwright-core";
import { createLocalBrowserSession } from "../browser/local-browser.js";
import { localBrowserProfileDir } from "../config/paths.js";
import { type EffectiveConfig, requirePublicationUrl } from "../config/store.js";
import type { DraftMapping } from "../substack-api/draft-mappings.js";
import type { PreparedPost } from "../types.js";
import type {
  BrowserWorkflowOptions,
  BrowserWorkflowResult,
  DraftOperation,
  WorkflowStep,
} from "./browser-workflow.js";
import { resolvePostTitle } from "./title.js";
import type { TransportResolution } from "./transport.js";

export async function runLocalDraftWorkflow(
  prepared: PreparedPost,
  config: EffectiveConfig,
  transport: TransportResolution,
  existingDraft?: DraftMapping | null,
  options?: BrowserWorkflowOptions,
): Promise<BrowserWorkflowResult> {
  const publicationUrl = requirePublicationUrl(config);
  const browser = await createLocalBrowserSession();
  const trace: WorkflowStep[] = [];
  const title = resolvePostTitle(prepared.post);
  const operation: DraftOperation = existingDraft ? "update" : "create";

  try {
    if (existingDraft?.draftUrl) {
      await record(trace, "navigate-existing-draft", async () => {
        const editorUrl = resolveDraftEditorUrl(existingDraft.draftUrl!, existingDraft.draftId);
        await browser.page.goto(editorUrl, {
          waitUntil: "domcontentloaded",
          timeout: 60000,
        });
        return { draftUrl: editorUrl };
      });
    } else {
      await record(trace, "open-editor", async () => {
        const opened = await openSubstackEditor(browser.page, publicationUrl);
        return { opened };
      });
    }

    await record(trace, "fill-title", async () => {
      const filled = await fillFirst(browser.page, titleLocators(browser.page), title, 20000);
      return { filled, titleLength: title.length };
    });

    if (prepared.post.metadata.subtitle) {
      await record(trace, "fill-subtitle", async () => {
        const filled = await fillFirst(
          browser.page,
          subtitleLocators(browser.page),
          prepared.post.metadata.subtitle!,
          10000,
        );
        return { filled, subtitleLength: prepared.post.metadata.subtitle!.length };
      });
    }

    if (prepared.post.metadata.tags && prepared.post.metadata.tags.length > 0) {
      await record(trace, "fill-tags", async () => {
        const filled = await fillFirst(
          browser.page,
          tagLocators(browser.page),
          prepared.post.metadata.tags!.join(", "),
          10000,
        );
        return { filled, tags: prepared.post.metadata.tags };
      });
    }

    await record(trace, "fill-body", async () => {
      const filled = await fillBody(browser.page, prepared.post.html, 20000);
      return { filled, htmlLength: prepared.post.html.length };
    });

    const editorText = await record(trace, "verify-editor-text", async () => {
      const text = await readEditorText(browser.page);
      return { text, length: text.length };
    });

    if (prepared.mode === "draft") {
      const draftStatus =
        operation === "update" ? ("draft-updated" as const) : ("draft-created" as const);
      return {
        status: draftStatus,
        operation,
        mode: prepared.mode,
        title,
        currentUrl: browser.page.url(),
        finalUrl: browser.page.url(),
        finalState: draftStatus,
        publishedUrl: undefined,
        draftId: existingDraft?.draftId,
        draftUrl: existingDraft?.draftUrl,
        metadata: {
          subtitle: prepared.post.metadata.subtitle,
          tags: prepared.post.metadata.tags,
          audience: prepared.post.metadata.audience,
          section: prepared.post.metadata.section,
        },
        transport,
        editorTextLength: editorText.length,
        trace,
      };
    }

    await record(trace, "click-continue", async () => {
      const publishBtn = await clickIfVisible(
        browser.page,
        browser.page.locator("button#publish"),
        5000,
      );
      if (!publishBtn) {
        const clicked = await clickIfVisible(
          browser.page,
          browser.page.locator("button:has-text('Continue')"),
          10000,
        );
        if (!clicked) {
          const clicked2 = await clickIfVisible(
            browser.page,
            browser.page.getByRole("button", { name: /continue/i }),
            5000,
          );
          return { clicked: clicked2 };
        }
        return { clicked };
      }
      return { clicked: publishBtn };
    });

    if (prepared.mode === "publish") {
      if (options?.reviewOnly) {
        return {
          status: "publish-review-opened" as const,
          operation,
          mode: prepared.mode,
          title,
          currentUrl: browser.page.url(),
          finalUrl: browser.page.url(),
          finalState: "publish-review-opened",
          publishedUrl: undefined,
          draftId: existingDraft?.draftId,
          draftUrl: existingDraft?.draftUrl,
          metadata: {
            subtitle: prepared.post.metadata.subtitle,
            tags: prepared.post.metadata.tags,
            audience: prepared.post.metadata.audience,
            section: prepared.post.metadata.section,
          },
          transport,
          editorTextLength: editorText.length,
          trace,
        };
      }

      const beforePublishUrl = browser.page.url();

      await record(trace, "click-final-publish", async () => {
        const clicked = await clickIfVisible(
          browser.page,
          browser.page.locator("button:has-text('Send to everyone now')"),
          5000,
        );
        if (!clicked) {
          const clicked2 = await clickIfVisible(
            browser.page,
            browser.page.locator("[class*='priority_primary']"),
            5000,
          );
          if (!clicked2) {
            const clicked3 = await clickIfVisible(
              browser.page,
              browser.page.locator("button:has-text('Publish now')"),
              5000,
            );
            if (!clicked3) {
              const clicked4 = await clickIfVisible(
                browser.page,
                browser.page.locator("button:has-text('Publish')"),
                5000,
              );
              return { clicked: clicked4 };
            }
            return { clicked: clicked3 };
          }
          return { clicked: clicked2 };
        }
        return { clicked };
      });

      let publishedUrl: string | undefined;
      const navigated = await record(trace, "wait-for-publish-navigation", async () => {
        const beforeUrl = browser.page.url();
        try {
          await browser.page.waitForURL(
            (url) => url.pathname.startsWith("/p/") || !url.pathname.includes("/publish/post/"),
            { timeout: 30000 },
          );
        } catch {
          // Navigation may not have occurred
        }
        const afterUrl = browser.page.url();
        publishedUrl = afterUrl;
        return { beforeUrl, afterUrl };
      });

      return {
        status:
          beforePublishUrl !== navigated.afterUrl
            ? ("published" as const)
            : ("publish-clicked" as const),
        operation,
        mode: prepared.mode,
        title,
        currentUrl: beforePublishUrl,
        finalUrl: navigated.afterUrl,
        finalState: beforePublishUrl !== navigated.afterUrl ? "published" : "publish-clicked",
        publishedUrl: beforePublishUrl !== navigated.afterUrl ? publishedUrl : undefined,
        draftId: existingDraft?.draftId,
        draftUrl: existingDraft?.draftUrl,
        metadata: {
          subtitle: prepared.post.metadata.subtitle,
          tags: prepared.post.metadata.tags,
          audience: prepared.post.metadata.audience,
          section: prepared.post.metadata.section,
        },
        transport,
        editorTextLength: editorText.length,
        trace,
      };
    }

    if (prepared.mode === "schedule" && prepared.scheduleAt) {
      const beforeScheduleUrl = browser.page.url();

      await record(trace, "select-schedule-option", async () => {
        const clicked = await clickIfVisible(
          browser.page,
          browser.page.locator("button:has-text('Schedule')"),
          10000,
        );
        return { clicked };
      });

      await record(trace, "fill-schedule-date", async () => {
        const dt = new Date(prepared.scheduleAt!);
        const dateStr = dt.toISOString().split("T")[0] ?? "";
        const filled = await fillIfVisible(
          browser.page,
          browser.page.locator("input[type='date']"),
          dateStr,
          5000,
        );
        return { filled, date: dateStr };
      });

      await record(trace, "fill-schedule-time", async () => {
        const dt = new Date(prepared.scheduleAt!);
        const hours = dt.getHours().toString().padStart(2, "0");
        const minutes = dt.getMinutes().toString().padStart(2, "0");
        const timeStr = `${hours}:${minutes}`;
        const filled = await fillIfVisible(
          browser.page,
          browser.page.locator("input[type='time']"),
          timeStr,
          5000,
        );
        return { filled, time: timeStr };
      });

      await record(trace, "confirm-schedule", async () => {
        const clicked = await clickIfVisible(
          browser.page,
          browser.page.locator("button:has-text('Schedule')").last(),
          10000,
        );
        return { clicked };
      });

      let publishedUrl: string | undefined;
      try {
        await browser.page.waitForURL(/\/p\//, { timeout: 10000 });
        publishedUrl = browser.page.url();
      } catch {
        // Schedule does not navigate away from the editor;
        // the page shows a confirmation message instead.
      }

      return {
        status: "scheduled" as const,
        operation,
        mode: prepared.mode,
        title,
        currentUrl: beforeScheduleUrl,
        finalUrl: publishedUrl ?? beforeScheduleUrl,
        finalState: "scheduled",
        publishedUrl,
        draftId: existingDraft?.draftId,
        draftUrl: existingDraft?.draftUrl,
        scheduleAt: prepared.scheduleAt,
        metadata: {
          subtitle: prepared.post.metadata.subtitle,
          tags: prepared.post.metadata.tags,
          audience: prepared.post.metadata.audience,
          section: prepared.post.metadata.section,
        },
        transport,
        editorTextLength: editorText.length,
        trace,
      };
    }

    return {
      status: operation === "update" ? ("draft-updated" as const) : ("draft-created" as const),
      operation,
      mode: prepared.mode,
      title,
      currentUrl: browser.page.url(),
      finalUrl: browser.page.url(),
      finalState: operation === "update" ? ("draft-updated" as const) : ("draft-created" as const),
      publishedUrl: undefined,
      draftId: existingDraft?.draftId,
      draftUrl: existingDraft?.draftUrl,
      metadata: {
        subtitle: prepared.post.metadata.subtitle,
        tags: prepared.post.metadata.tags,
        audience: prepared.post.metadata.audience,
        section: prepared.post.metadata.section,
      },
      transport,
      editorTextLength: editorText.length,
      trace,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    trace.push({
      name: "local-profile",
      status: "ok",
      startedAt: new Date().toISOString(),
      endedAt: new Date().toISOString(),
      details: {
        profileDir: localBrowserProfileDir(),
        currentUrl: browser.page.url(),
      },
    });
    throw new Error(
      `${message}\n${JSON.stringify({ status: "validation-failed", trace }, null, 2)}`,
      { cause: error },
    );
  } finally {
    await browser.close();
  }
}

function resolveDraftEditorUrl(draftUrl: string, draftId: string | undefined): string {
  if (!draftId || !draftUrl) return draftUrl || "";
  const hasDraftId = /\/\d+$/.test(draftUrl);
  if (hasDraftId) return draftUrl;
  const base = draftUrl.replace(/\/+$/, "");
  return `${base}/${draftId}`;
}

async function clickIfVisible(page: Page, locator: Locator, timeout: number): Promise<boolean> {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    try {
      const first = locator.first();
      if (await first.isVisible({ timeout: 500 })) {
        await first.click();
        return true;
      }
    } catch {
      // Try again.
    }
    await page.waitForTimeout(250);
  }
  return false;
}

async function fillIfVisible(
  page: Page,
  locator: Locator,
  value: string,
  timeout: number,
): Promise<boolean> {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    try {
      const first = locator.first();
      if (await first.isVisible({ timeout: 500 })) {
        await first.fill(value);
        return true;
      }
    } catch {
      // Try again.
    }
    await page.waitForTimeout(250);
  }
  return false;
}

async function openSubstackEditor(page: Page, publicationUrl: string): Promise<string> {
  const host = new URL(publicationUrl).host;
  const candidates = [
    `https://substack.com/publish/post?publication_url=${encodeURIComponent(publicationUrl)}`,
    `https://substack.com/home/post`,
    `https://${host}/publish/post`,
    publicationUrl,
  ];

  for (const url of candidates) {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });

    if (await hasEditor(page)) {
      return url;
    }

    await clickFirst(
      page,
      [
        page.getByRole("link", { name: /new post|write|dashboard|publish/i }),
        page.getByRole("button", { name: /new post|write|dashboard|publish/i }),
        page.locator("a[href*='/publish']").first(),
        page.locator("a[href*='/post']").first(),
      ],
      8000,
    );

    if (await hasEditor(page)) {
      return page.url();
    }
  }

  throw new Error(
    "Could not open a Substack editor. Confirm the local profile is logged in and has publication access.",
  );
}

async function hasEditor(page: Page): Promise<boolean> {
  return Boolean(
    await firstVisible(
      page,
      [...titleLocators(page), page.locator("[contenteditable='true']")],
      3000,
    ),
  );
}

function titleLocators(page: Page): Locator[] {
  return [
    page.locator("textarea[placeholder*='Title' i]"),
    page.locator("input[placeholder*='Title' i]"),
    page.getByPlaceholder(/title/i),
    page.locator("[contenteditable='true'][data-placeholder*='Title' i]"),
  ];
}

function subtitleLocators(page: Page): Locator[] {
  return [
    page.getByPlaceholder(/subtitle/i),
    page.locator("textarea[placeholder*='subtitle' i]"),
    page.locator("input[placeholder*='subtitle' i]"),
    page.locator("[contenteditable='true'][data-placeholder*='subtitle' i]"),
    page.locator("[data-placeholder*='subtitle' i]"),
  ];
}

function tagLocators(page: Page): Locator[] {
  return [
    page.getByPlaceholder(/tag/i),
    page.locator("input[placeholder*='tag' i]"),
    page.locator("input[placeholder*='add' i]"),
    page.locator("[data-placeholder*='tag' i]"),
  ];
}

async function fillBody(page: Page, html: string, timeout: number): Promise<boolean> {
  const editor = await firstVisible(
    page,
    [
      page.locator("[contenteditable='true']").nth(1),
      page.locator("[contenteditable='true']").first(),
    ],
    timeout,
  );

  if (!editor) {
    return false;
  }

  await editor.click();
  await page.evaluate((value) => {
    const target = document.activeElement?.closest("[contenteditable='true']");
    if (!target) {
      return false;
    }
    document.execCommand("insertHTML", false, value);
    target.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertFromPaste" }));
    return true;
  }, html);
  return true;
}

async function readEditorText(page: Page): Promise<string> {
  return page.evaluate(() => {
    const nodes = Array.from(document.querySelectorAll("[contenteditable='true']"));
    return nodes
      .map((node) => node.textContent)
      .join("\n")
      .trim();
  });
}

async function fillFirst(
  page: Page,
  locators: Locator[],
  value: string,
  timeout: number,
): Promise<boolean> {
  const target = await firstVisible(page, locators, timeout);
  if (!target) {
    return false;
  }

  await target.fill(value);
  return true;
}

async function firstVisible(
  page: Page,
  locators: Locator[],
  timeout: number,
): Promise<Locator | null> {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    for (const locator of locators) {
      const first = locator.first();
      try {
        if (await first.isVisible({ timeout: 500 })) {
          return first;
        }
      } catch {
        // Try next locator.
      }
    }
    await page.waitForTimeout(250);
  }
  return null;
}

async function clickFirst(page: Page, locators: Locator[], timeout: number): Promise<boolean> {
  const target = await firstVisible(page, locators, timeout);
  if (!target) {
    return false;
  }
  await target.click();
  return true;
}

async function record<T extends Record<string, unknown>>(
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
      details,
    });
    return details;
  } catch (error) {
    trace.push({
      name,
      status: "error",
      startedAt,
      endedAt: new Date().toISOString(),
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}
