import { mkdir } from "node:fs/promises";
import { getChromePath } from "chrome-launcher";
import { chromium, type BrowserContext, type Page } from "playwright-core";
import { localBrowserProfileDir } from "../config/paths.js";

export interface LocalBrowserSession {
  context: BrowserContext;
  page: Page;
  close: () => Promise<void>;
}

export async function createLocalBrowserSession(): Promise<LocalBrowserSession> {
  await mkdir(localBrowserProfileDir(), { recursive: true });

  const context = await chromium.launchPersistentContext(
    localBrowserProfileDir(),
    {
      executablePath: getChromePath(),
      headless: false,
      args: ["--no-first-run", "--no-default-browser-check", "--disable-quic"],
    },
  );
  const page = await context.newPage();

  return {
    context,
    page,
    close: () => closeLocalBrowser(context),
  };
}

async function closeLocalBrowser(context: BrowserContext): Promise<void> {
  await context.close();
}
