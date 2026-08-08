import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, it } from "vitest";
import { writeSecureStorageState } from "./storage-state.js";

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
});
