import assert from "node:assert/strict";
import { describe, it, vi } from "vitest";
import { loadSession } from "./session-store.js";

vi.mock("node:fs/promises", async (importOriginal) => {
  const mod = await importOriginal<typeof import("node:fs/promises")>();
  return {
    ...mod,
    readFile: vi.fn(mod.readFile),
  };
});

import { readFile } from "node:fs/promises";

describe("loadSession", () => {
  it("returns null when the session file is missing (ENOENT)", async () => {
    vi.mocked(readFile).mockRejectedValueOnce(
      Object.assign(new Error("File not found"), { code: "ENOENT" }),
    );

    const session = await loadSession();
    assert.equal(session, null);
  });

  it("throws non-ENOENT errors when reading the session file fails", async () => {
    vi.mocked(readFile).mockRejectedValueOnce(
      Object.assign(new Error("Permission denied"), { code: "EACCES" }),
    );

    await assert.rejects(loadSession(), /Permission denied/);
  });

  it("returns the parsed session when the file exists and is valid", async () => {
    const fakeSession = {
      browserbaseSessionId: "fake-id",
      publicationUrl: "https://example.substack.com",
      createdAt: "2023-01-01T00:00:00.000Z",
      updatedAt: "2023-01-01T00:00:00.000Z",
    };
    vi.mocked(readFile).mockResolvedValueOnce(JSON.stringify(fakeSession));

    const session = await loadSession();
    assert.deepEqual(session, fakeSession);
  });
});
