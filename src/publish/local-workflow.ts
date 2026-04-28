import type { Locator, Page } from "playwright-core";
import { createLocalBrowserSession } from "../browser/local-browser.js";
import { localBrowserProfileDir } from "../config/paths.js";
import {
  requirePublicationUrl,
  type EffectiveConfig,
} from "../config/store.js";
import type { PreparedPost } from "../types.js";
import type {
  BrowserWorkflowResult,
  WorkflowStep,
} from "./browser-workflow.js";
import { resolvePostTitle } from "./title.js";

export async function runLocalDraftWorkflow(
  prepared: PreparedPost,
  config: EffectiveConfig,
): Promise<BrowserWorkflowResult> {
  const publicationUrl = requirePublicationUrl(config);
  const browser = await createLocalBrowserSession();
  const trace: WorkflowStep[] = [];
  const title = resolvePostTitle(prepared.post);

  try {
    await record(trace, "open-editor", async () => {
      const opened = await openSubstackEditor(browser.page, publicationUrl);
      return { opened };
    });

    await record(trace, "fill-title", async () => {
      const filled = await fillFirst(
        browser.page,
        titleLocators(browser.page),
        title,
        20000,
      );
      return { filled, titleLength: title.length };
    });

    await record(trace, "fill-body", async () => {
      const filled = await fillBody(browser.page, prepared.post.html, 20000);
      return { filled, htmlLength: prepared.post.html.length };
    });

    const editorText = await record(trace, "verify-editor-text", async () => {
      const text = await readEditorText(browser.page);
      return { text, length: text.length };
    });

    return {
      status: "draft-created",
      mode: prepared.mode,
      title,
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

async function openSubstackEditor(
  page: Page,
  publicationUrl: string,
): Promise<string> {
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

async function fillBody(
  page: Page,
  html: string,
  timeout: number,
): Promise<boolean> {
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
    target.dispatchEvent(
      new InputEvent("input", { bubbles: true, inputType: "insertFromPaste" }),
    );
    return true;
  }, html);
  return true;
}

async function readEditorText(page: Page): Promise<string> {
  return page.evaluate(() => {
    const nodes = Array.from(
      document.querySelectorAll("[contenteditable='true']"),
    );
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

async function clickFirst(
  page: Page,
  locators: Locator[],
  timeout: number,
): Promise<boolean> {
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
