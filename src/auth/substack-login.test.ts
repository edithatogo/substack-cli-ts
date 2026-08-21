import assert from "node:assert/strict";
import { describe, it, vi, beforeEach } from "vitest";
import { performSubstackLogin } from "./substack-login.js";
import { insertTextIntoActiveElement } from "../browser/editor.js";
import type { StagehandSession } from "../browser/stagehand.js";

vi.mock("../browser/editor.js", () => ({
  insertTextIntoActiveElement: vi.fn(),
}));

describe("performSubstackLogin", () => {
  let mockSession: StagehandSession;
  let actMock: any;
  let urlMock: any;

  beforeEach(() => {
    actMock = vi.fn().mockResolvedValue(undefined);
    urlMock = vi.fn().mockResolvedValue("https://example.substack.com/");

    mockSession = {
      stagehand: {
        act: actMock,
      } as any,
      page: {
        url: urlMock,
      } as any,
      publicationUrl: "https://example.substack.com",
      close: vi.fn(),
    } as unknown as StagehandSession;

    vi.mocked(insertTextIntoActiveElement).mockReset();
  });

  it("successfully logs in when email and password can be inserted", async () => {
    vi.mocked(insertTextIntoActiveElement).mockResolvedValue({ ok: true, target: "test" });

    const result = await performSubstackLogin(mockSession, {
      email: "test@example.com",
      password: "password123",
    });

    assert.equal(result.status, "attempted");
    assert.equal(result.emailInserted, true);
    assert.equal(result.passwordInserted, true);
    assert.equal(result.finalUrl, "https://example.substack.com/");

    assert.equal(actMock.mock.calls.length, 5);
    assert.equal(vi.mocked(insertTextIntoActiveElement).mock.calls.length, 2);
  });

  it("throws an error if email insertion fails", async () => {
    vi.mocked(insertTextIntoActiveElement).mockResolvedValueOnce({
      ok: false,
      target: null,
      reason: "element not found",
    });

    await assert.rejects(
      performSubstackLogin(mockSession, {
        email: "test@example.com",
        password: "password123",
      }),
      (err: Error) => {
        assert.equal(err.message, "Could not insert Substack email: element not found");
        return true;
      },
    );

    assert.equal(actMock.mock.calls.length, 2);
    assert.equal(vi.mocked(insertTextIntoActiveElement).mock.calls.length, 1);
  });

  it("returns partial success if password insertion fails (magic link flow)", async () => {
    vi.mocked(insertTextIntoActiveElement)
      .mockResolvedValueOnce({ ok: true, target: "email-input" })
      .mockResolvedValueOnce({ ok: false, target: null, reason: "no password field" });

    const result = await performSubstackLogin(mockSession, {
      email: "test@example.com",
      password: "password123",
    });

    assert.equal(result.status, "attempted");
    assert.equal(result.emailInserted, true);
    assert.equal(result.passwordInserted, false);
    assert.equal(result.finalUrl, "https://example.substack.com/");
    assert.match(result.note || "", /Email was inserted, but no password field was available/);

    assert.equal(actMock.mock.calls.length, 4); // Does not reach the final form submit
    assert.equal(vi.mocked(insertTextIntoActiveElement).mock.calls.length, 2);
  });
});
