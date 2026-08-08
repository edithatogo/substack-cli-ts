import { chmod, mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import type { BrowserContext } from "playwright-core";
import { detectUpstreamChallenge } from "../browser/resilience.js";
import { createLocalBrowserSession } from "../browser/local-browser.js";
import { browserStorageStateFilePath } from "../config/paths.js";

type PlaywrightStorageState = Awaited<ReturnType<BrowserContext["storageState"]>>;

const SESSION_COOKIE_NAMES = new Set(["connect.sid", "substack.sid", "substack_session"]);

export interface StorageStateSummary {
  status: "saved";
  path: string;
  cookieCount: number;
  originCount: number;
  hasLikelySessionCookie: boolean;
  earliestExpiry: string | null;
}

export type StorageStateCaptureOutcome =
  | StorageStateSummary
  | { status: "not-saved"; message: string };

export async function writeSecureStorageState(
  state: PlaywrightStorageState,
  outputPath = browserStorageStateFilePath(),
): Promise<StorageStateSummary> {
  const hasLikelySessionCookie = state.cookies.some((cookie) =>
    SESSION_COOKIE_NAMES.has(cookie.name),
  );
  if (!hasLikelySessionCookie) {
    throw new Error(
      "No recognized Substack session cookie was found; complete login before saving storage state.",
    );
  }

  await mkdir(dirname(outputPath), { recursive: true, mode: 0o700 });
  const temporaryPath = `${outputPath}.${process.pid}.tmp`;
  try {
    await writeFile(temporaryPath, `${JSON.stringify(state, null, 2)}\n`, {
      encoding: "utf8",
      flag: "wx",
      mode: 0o600,
    });
    await chmod(temporaryPath, 0o600);
    await rm(outputPath, { force: true });
    await rename(temporaryPath, outputPath);
  } finally {
    await rm(temporaryPath, { force: true });
  }

  return summarizeStorageState(state, outputPath);
}

export async function captureAuthenticatedStorageState(
  context: BrowserContext,
  outputPath = browserStorageStateFilePath(),
): Promise<StorageStateSummary> {
  return writeSecureStorageState(await context.storageState(), outputPath);
}

export async function refreshLocalStorageState(options: {
  publicationUrl: string;
  headless?: boolean | undefined;
  waitSeconds?: number | undefined;
}): Promise<StorageStateSummary> {
  const waitSeconds = options.waitSeconds ?? 0;
  if (!Number.isInteger(waitSeconds) || waitSeconds < 0 || waitSeconds > 300) {
    throw new Error("waitSeconds must be an integer from 0 to 300.");
  }

  const session = await createLocalBrowserSession({ headless: options.headless ?? false });
  try {
    await session.page.goto(options.publicationUrl, {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });
    if (waitSeconds > 0) await session.page.waitForTimeout(waitSeconds * 1000);

    const challenge = detectUpstreamChallenge({
      status: 200,
      bodyText: await session.page.content(),
    });
    if (challenge) {
      const mode = options.headless
        ? "Re-run without --headless and complete the visible challenge."
        : "Complete the visible challenge before the configured wait period ends.";
      throw new Error(`${challenge.message} ${mode}`);
    }

    return captureAuthenticatedStorageState(session.context);
  } finally {
    await session.close();
  }
}

export async function readStorageStateSummary(
  inputPath = browserStorageStateFilePath(),
): Promise<StorageStateSummary> {
  const state = JSON.parse(await readFile(inputPath, "utf8")) as PlaywrightStorageState;
  return summarizeStorageState(state, inputPath);
}

function summarizeStorageState(state: PlaywrightStorageState, path: string): StorageStateSummary {
  const expiries = state.cookies
    .map((cookie) => cookie.expires)
    .filter((expiry) => Number.isFinite(expiry) && expiry > 0)
    .sort((left, right) => left - right);
  return {
    status: "saved",
    path,
    cookieCount: state.cookies.length,
    originCount: state.origins.length,
    hasLikelySessionCookie: state.cookies.some((cookie) => SESSION_COOKIE_NAMES.has(cookie.name)),
    earliestExpiry: expiries[0] === undefined ? null : new Date(expiries[0] * 1000).toISOString(),
  };
}
