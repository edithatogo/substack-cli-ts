import assert from "node:assert/strict";
import { describe, it } from "vitest";
import {
  materialFromCookieHeader,
  materialFromCookies,
} from "./auth.js";
import {
  createSubstackClient,
  extractSessionToken,
} from "./substack-adapter.js";

describe("extractSessionToken", () => {
  it("extracts substack.sid from cookie header", () => {
    const material = materialFromCookieHeader(
      "substack.sid=abc123; theme=dark; other=val",
      "https://test.substack.com",
      "env",
    );
    assert.equal(extractSessionToken(material), "abc123");
  });

  it("extracts connect.sid from cookie header", () => {
    const material = materialFromCookieHeader(
      "connect.sid=session-value; theme=dark",
      "https://test.substack.com",
      "env",
    );
    assert.equal(extractSessionToken(material), "session-value");
  });

  it("returns the first matching session cookie", () => {
    const material = materialFromCookieHeader(
      "theme=dark; connect.sid=found-first; substack.sid=found-second",
      "https://test.substack.com",
      "env",
    );
    assert.equal(extractSessionToken(material), "found-first");
  });

  it("throws when no session cookie is present", () => {
    const material = materialFromCookieHeader(
      "theme=dark; other=val",
      "https://test.substack.com",
      "env",
    );
    assert.throws(() => extractSessionToken(material), /No session cookie/);
  });

  it("works with material from raw cookie objects", () => {
    const material = materialFromCookies(
      [
        {
          name: "connect.sid",
          value: "raw-secret",
          domain: ".substack.com",
          path: "/",
          expires: -1,
          httpOnly: true,
          secure: true,
          sameSite: "Lax",
        },
        {
          name: "theme",
          value: "dark",
          domain: ".substack.com",
          path: "/",
          expires: -1,
          httpOnly: false,
          secure: true,
          sameSite: "Lax",
        },
      ],
      "https://rareinsights.substack.com",
      "local-profile",
    );
    assert.equal(extractSessionToken(material), "raw-secret");
  });

  it("throws when cookie header is empty string", () => {
    const material = materialFromCookieHeader(
      "",
      "https://test.substack.com",
      "env",
    );
    assert.throws(
      () => extractSessionToken(material),
      /No session cookie/,
    );
  });

  it("throws when cookies array is empty", () => {
    const material = materialFromCookies(
      [],
      "https://test.substack.com",
      "local-profile",
    );
    assert.throws(
      () => extractSessionToken(material),
      /No session cookie/,
    );
  });

  it("creates client with publication URL containing a path", () => {
    const material = materialFromCookieHeader(
      "substack.sid=fake-token",
      "https://substack.com/@username",
      "env",
    );
    const client = createSubstackClient(material);
    assert.ok(client);
  });
});
