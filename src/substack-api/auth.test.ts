import assert from "node:assert/strict";
import { describe, it } from "vitest";
import {
  materialFromCookieHeader,
  materialFromCookies,
  summarizeApiAuthMaterial,
} from "./auth.js";

describe("API auth material", () => {
  it("redacts cookie values and detects likely session cookies", () => {
    const material = materialFromCookieHeader(
      "substack.sid=fake-long-secret-value; theme=dark",
      "https://example.substack.com",
      "env",
    );
    const summary = summarizeApiAuthMaterial(material);

    assert.equal(summary.source, "env");
    assert.equal(summary.publicationHost, "example.substack.com");
    assert.equal(summary.cookieCount, 2);
    assert.equal(summary.hasLikelySessionCookie, true);
    assert.equal(material.cookieHeader.includes("long-secret-value"), true);
    assert.equal(
      summary.cookies.some((cookie) => cookie.value === "fake...alue"),
      true,
    );
  });

  it("filters unrelated cookie domains", () => {
    const material = materialFromCookies(
      [
        {
          name: "connect.sid",
          value: "secret",
          domain: ".substack.com",
          path: "/",
          expires: -1,
          httpOnly: true,
          secure: true,
          sameSite: "Lax",
        },
        {
          name: "unrelated",
          value: "secret",
          domain: "example.com",
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

    assert.equal(material.cookies.length, 1);
    assert.equal(material.cookies[0]?.name, "connect.sid");
  });
});
