import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { BrowserContext, Page } from "playwright-core";
import { afterEach, describe, it, vi } from "vitest";
import type { LocalBrowserSession } from "../browser/local-browser.js";
import {
  readStorageStateSummary,
  refreshLocalStorageState,
  writeSecureStorageState,
} from "./storage-state.js";

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((path) => rm(path, { recursive: true })));
});

describe("Playwright storage-state persistence", () => {
  it("writes standard storage state while returning a secret-free summary", async () => {
    const directory = await mkdtemp(join(tmpdir(), "substack-storage-state-"));
    temporaryDirectories.push(directory);
    const path = join(directory, "auth", "storage-state.json");
    const state = {
      cookies: [
        {
          name: "substack.sid",
          value: "test-secret-value",
          domain: ".substack.com",
          path: "/",
          expires: 1_900_000_000,
          httpOnly: true,
          secure: true,
          sameSite: "Lax" as const,
        },
      ],
      origins: [],
    };

    const summary = await writeSecureStorageState(state, path);
    const stored = JSON.parse(await readFile(path, "utf8")) as typeof state;

    assert.equal(stored.cookies[0]?.value, "test-secret-value");
    assert.equal(summary.hasLikelySessionCookie, true);
    assert.doesNotMatch(JSON.stringify(summary), /test-secret-value/);
  });

  it("refuses to persist unauthenticated browser state", async () => {
    const directory = await mkdtemp(join(tmpdir(), "substack-storage-state-"));
    temporaryDirectories.push(directory);
    await assert.rejects(
      () => writeSecureStorageState({ cookies: [], origins: [] }, join(directory, "state.json")),
      /No recognized Substack session cookie/,
    );
  });

  it("refreshes, closes, and reads back state through an injected browser session", async () => {
    const directory = await mkdtemp(join(tmpdir(), "substack-storage-state-"));
    temporaryDirectories.push(directory);
    const path = join(directory, "auth", "storage-state.json");
    const fixture = authenticatedState();
    const close = vi.fn(async () => undefined);
    const waitForTimeout = vi.fn(async () => undefined);
    const createSession = vi.fn(async () =>
      browserSession({ body: "<html>publication</html>", state: fixture, close, waitForTimeout }),
    );

    const summary = await refreshLocalStorageState({
      publicationUrl: "https://test.substack.com",
      waitSeconds: 1,
      outputPath: path,
      createSession,
    });
    const previousStateDir = process.env.SUBSTACK_CLI_STATE_DIR;
    process.env.SUBSTACK_CLI_STATE_DIR = directory;
    let readback: Awaited<ReturnType<typeof readStorageStateSummary>>;
    try {
      readback = await readStorageStateSummary();
    } finally {
      if (previousStateDir === undefined) {
        Reflect.deleteProperty(process.env, "SUBSTACK_CLI_STATE_DIR");
      } else {
        process.env.SUBSTACK_CLI_STATE_DIR = previousStateDir;
      }
    }

    assert.equal(summary.cookieCount, 2);
    assert.deepEqual(readback, summary);
    assert.equal(createSession.mock.calls[0]?.[0].headless, false);
    assert.equal(waitForTimeout.mock.calls.length, 1);
    assert.equal(close.mock.calls.length, 1);
  });

  it("closes and fails with mode-specific guidance when a challenge remains", async () => {
    for (const headless of [true, false]) {
      const close = vi.fn(async () => undefined);
      const createSession = async () =>
        browserSession({
          body: "<html>Just a moment... cf-chl-test</html>",
          state: authenticatedState(),
          close,
        });
      await assert.rejects(
        () =>
          refreshLocalStorageState({
            publicationUrl: "https://test.substack.com",
            headless,
            createSession,
          }),
        headless ? /Re-run without --headless/ : /visible challenge/,
      );
      assert.equal(close.mock.calls.length, 1);
    }
  });

  it("rejects invalid wait bounds before opening a browser", async () => {
    const createSession = vi.fn();
    await assert.rejects(
      () =>
        refreshLocalStorageState({
          publicationUrl: "https://test.substack.com",
          waitSeconds: 301,
          createSession,
        }),
      /integer from 0 to 300/,
    );
    assert.equal(createSession.mock.calls.length, 0);
  });

  it("summarizes session-only cookies with no persistent expiry", async () => {
    const directory = await mkdtemp(join(tmpdir(), "substack-storage-state-"));
    temporaryDirectories.push(directory);
    const state = authenticatedState();
    state.cookies = state.cookies.slice(0, 1).map((cookie) => ({ ...cookie, expires: -1 }));

    const summary = await writeSecureStorageState(state, join(directory, "state.json"));

    assert.equal(summary.earliestExpiry, null);
  });
});

function authenticatedState() {
  return {
    cookies: [
      {
        name: "substack.sid",
        value: "test-secret-value",
        domain: ".substack.com",
        path: "/",
        expires: 1_900_000_000,
        httpOnly: true,
        secure: true,
        sameSite: "Lax" as const,
      },
      {
        name: "theme",
        value: "dark",
        domain: ".substack.com",
        path: "/",
        expires: 1_800_000_000,
        httpOnly: false,
        secure: true,
        sameSite: "Lax" as const,
      },
    ],
    origins: [],
  };
}

function browserSession(options: {
  body: string;
  state: ReturnType<typeof authenticatedState>;
  close: () => Promise<void>;
  waitForTimeout?: (() => Promise<void>) | undefined;
}): LocalBrowserSession {
  const page = {
    goto: vi.fn(async () => null),
    waitForTimeout: options.waitForTimeout ?? vi.fn(async () => undefined),
    content: vi.fn(async () => options.body),
  } as unknown as Page;
  const context = {
    storageState: vi.fn(async () => options.state),
  } as unknown as BrowserContext;
  return { page, context, close: options.close };
}
