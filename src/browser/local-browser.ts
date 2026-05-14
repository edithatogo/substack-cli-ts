import { mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { getChromePath } from "chrome-launcher";
import { chromium, type BrowserContext, type Page } from "playwright-core";
import { localBrowserProfileDir } from "../config/paths.js";
import { BrowserNotFoundError } from "./errors.js";

export interface LocalBrowserSession {
  context: BrowserContext;
  page: Page;
  close: () => Promise<void>;
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function findChromeBinary(): Promise<string> {
  const playwrightPath = process.env.PLAYWRIGHT_BROWSERS_PATH;

  if (playwrightPath && existsSync(playwrightPath)) {
    return getChromePath();
  }

  try {
    return getChromePath();
  } catch {
    throw new BrowserNotFoundError(
      "Chrome/Chromium browser binary not found. Install it with `npx playwright install chromium` " +
        "or set the PLAYWRIGHT_BROWSERS_PATH environment variable.",
    );
  }
}

export async function createLocalBrowserSession(): Promise<LocalBrowserSession> {
  await mkdir(localBrowserProfileDir(), { recursive: true });
  const executablePath = await findChromeBinary();

  const context = await chromium.launchPersistentContext(localBrowserProfileDir(), {
    executablePath,
    headless: false,
    args: ["--no-first-run", "--no-default-browser-check", "--disable-quic"],
  });
  const page = await context.newPage();

  return {
    context,
    page,
    close: () => closeLocalBrowser(context),
  };
}

export async function createLocalBrowserSessionWithRetry(
  retries = 3,
): Promise<LocalBrowserSession> {
  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await createLocalBrowserSession();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt < retries) {
        const delay = Math.min(1000 * 2 ** attempt, 10000);
        await sleep(delay);
      }
    }
  }

  throw lastError!;
}

async function closeLocalBrowser(context: BrowserContext): Promise<void> {
  await context.close();
}
