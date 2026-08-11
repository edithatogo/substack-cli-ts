import { mkdir } from "node:fs/promises";
import type { Page, Stagehand as StagehandInstance } from "@browserbasehq/stagehand";
import { localBrowserProfileDir } from "../config/paths.js";
import {
  type EffectiveConfig,
  loadEffectiveConfig,
  requireBrowserbaseConfig,
  requirePublicationUrl,
} from "../config/store.js";
import { NavigationTimeoutError, SessionTimeoutError } from "./errors.js";

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isTransientFailure(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  const lower = message.toLowerCase();
  return (
    lower.includes("timeout") ||
    lower.includes("navigation") ||
    lower.includes("net::err_") ||
    lower.includes("page did not") ||
    lower.includes("target closed") ||
    lower.includes("session closed")
  );
}

function classifyError(error: unknown): Error {
  const message = error instanceof Error ? error.message : String(error);
  const lower = message.toLowerCase();

  if (lower.includes("timeout") && lower.includes("navigation")) {
    return new NavigationTimeoutError(message);
  }

  if (lower.includes("session") && (lower.includes("closed") || lower.includes("timeout"))) {
    return new SessionTimeoutError(message);
  }

  return error instanceof Error ? error : new Error(String(error));
}

export async function withStagehandRetry<T>(
  fn: () => Promise<T>,
  options: { retries?: number; label?: string } = {},
): Promise<T> {
  const maxRetries = options.retries ?? 2;
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (!isTransientFailure(error)) {
        throw error;
      }

      if (attempt < maxRetries) {
        const delay = Math.min(1000 * 2 ** attempt, 8000);
        await sleep(delay);
      }
    }
  }

  throw classifyError(lastError);
}

type StagehandPage = Page;

export interface StagehandSession {
  stagehand: StagehandInstance;
  page: StagehandPage;
  publicationUrl: string;
  browserbaseSessionId?: string | undefined;
  browserbaseSessionUrl?: string | undefined;
  browserbaseDebugUrl?: string | undefined;
  close: () => Promise<void>;
}

export interface CreateStagehandSessionOptions {
  browserbaseSessionId?: string | undefined;
  keepAlive?: boolean | undefined;
  config?: EffectiveConfig | undefined;
}

export async function createStagehandSession(
  options: CreateStagehandSessionOptions = {},
): Promise<StagehandSession> {
  const config = options.config ?? (await loadEffectiveConfig());
  const publicationUrl = requirePublicationUrl(config);

  const { Stagehand, browserbase, localBrowser } = await import("@browserbasehq/stagehand");
  await mkdir(localBrowserProfileDir(), { recursive: true });

  const browser =
    config.browserRuntime === "local"
      ? await localBrowser.launch({
          headless: false,
          userDataDir: localBrowserProfileDir(),
          preserveUserDataDir: true,
        })
      : options.browserbaseSessionId
        ? await browserbase.connect({
            apiKey: requireBrowserbaseApiKey(config),
            sessionId: options.browserbaseSessionId,
          })
        : await browserbase.launch(createBrowserbaseOptions(config, options.keepAlive));
  const stagehand = await Stagehand.create({
    browser,
    model: { modelName: config.stagehandModel as never },
    logging: { level: "off" },
  });
  const [page] = await stagehand.browser.context.pages();

  if (!page) {
    await stagehand.close();
    throw new Error("Stagehand did not provide a browser page.");
  }

  return {
    stagehand,
    page,
    publicationUrl,
    browserbaseSessionId: config.browserRuntime === "browserbase" ? browser.sessionId : undefined,
    close: () => stagehand.close(),
  };
}

function createBrowserbaseOptions(config: EffectiveConfig, keepAlive?: boolean) {
  requireBrowserbaseConfig(config);

  return {
    apiKey: config.browserbaseApiKey!,
    projectId: config.browserbaseProjectId!,
    keepAlive: keepAlive ?? true,
  };
}

function requireBrowserbaseApiKey(config: EffectiveConfig): string {
  requireBrowserbaseConfig(config);
  return config.browserbaseApiKey!;
}
