import type { Stagehand as StagehandClass } from "@browserbasehq/stagehand";
import { mkdir } from "node:fs/promises";
import { cacheDir, localBrowserProfileDir } from "../config/paths.js";
import {
  loadEffectiveConfig,
  requireBrowserbaseConfig,
  requirePublicationUrl,
  type EffectiveConfig,
} from "../config/store.js";
import { SessionTimeoutError, NavigationTimeoutError } from "./errors.js";

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

type StagehandInstance = InstanceType<typeof StagehandClass>;
type StagehandPage = ReturnType<StagehandInstance["context"]["pages"]>[number];

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

  const { Stagehand } = await import("@browserbasehq/stagehand");
  await mkdir(cacheDir(), { recursive: true });
  await mkdir(localBrowserProfileDir(), { recursive: true });

  const stagehand = new Stagehand(
    config.browserRuntime === "local"
      ? {
          env: "LOCAL",
          model: config.stagehandModel,
          cacheDir: cacheDir(),
          disablePino: true,
          localBrowserLaunchOptions: {
            headless: false,
            userDataDir: localBrowserProfileDir(),
            preserveUserDataDir: true,
          },
        }
      : createBrowserbaseOptions(config, options),
  );

  await stagehand.init();
  const [page] = stagehand.context.pages();

  if (!page) {
    await stagehand.close();
    throw new Error("Stagehand did not provide a browser page.");
  }

  return {
    stagehand,
    page,
    publicationUrl,
    browserbaseSessionId:
      config.browserRuntime === "browserbase" ? stagehand.browserbaseSessionID : undefined,
    browserbaseSessionUrl:
      config.browserRuntime === "browserbase" ? stagehand.browserbaseSessionURL : undefined,
    browserbaseDebugUrl:
      config.browserRuntime === "browserbase" ? stagehand.browserbaseDebugURL : undefined,
    close: () => stagehand.close(),
  };
}

function createBrowserbaseOptions(config: EffectiveConfig, options: CreateStagehandSessionOptions) {
  requireBrowserbaseConfig(config);

  return {
    env: "BROWSERBASE" as const,
    apiKey: config.browserbaseApiKey!,
    projectId: config.browserbaseProjectId!,
    ...(options.browserbaseSessionId ? { browserbaseSessionID: options.browserbaseSessionId } : {}),
    keepAlive: options.keepAlive ?? true,
    model: config.stagehandModel,
    cacheDir: cacheDir(),
    waitForCaptchaSolves: false,
    disablePino: true,
  };
}
