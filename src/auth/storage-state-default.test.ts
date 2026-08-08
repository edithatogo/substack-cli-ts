import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { BrowserContext, Page } from "playwright-core";
import { afterEach, describe, it, vi } from "vitest";

const browser = vi.hoisted(() => ({ create: vi.fn() }));

vi.mock("../browser/local-browser.js", () => ({
  createLocalBrowserSession: browser.create,
}));

import { refreshLocalStorageState } from "./storage-state.js";

const temporaryDirectories: string[] = [];

afterEach(async () => {
  browser.create.mockReset();
  await Promise.all(temporaryDirectories.splice(0).map((path) => rm(path, { recursive: true })));
});

describe("default Playwright storage-state refresh", () => {
  it("uses the production local-browser factory when no test factory is provided", async () => {
    const directory = await mkdtemp(join(tmpdir(), "substack-default-storage-state-"));
    temporaryDirectories.push(directory);
    const close = vi.fn(async () => undefined);
    browser.create.mockResolvedValue({
      page: {
        goto: vi.fn(async () => null),
        content: vi.fn(async () => "<html>publication</html>"),
        waitForTimeout: vi.fn(async () => undefined),
      } as unknown as Page,
      context: {
        storageState: vi.fn(async () => ({
          cookies: [
            {
              name: "substack.sid",
              value: "test-only",
              domain: ".substack.com",
              path: "/",
              expires: -1,
              httpOnly: true,
              secure: true,
              sameSite: "Lax" as const,
            },
          ],
          origins: [],
        })),
      } as unknown as BrowserContext,
      close,
    });

    const result = await refreshLocalStorageState({
      publicationUrl: "https://test.substack.com",
      headless: true,
      outputPath: join(directory, "state.json"),
    });

    assert.equal(result.status, "saved");
    assert.equal(browser.create.mock.calls[0]?.[0].headless, true);
    assert.equal(close.mock.calls.length, 1);
  });
});
