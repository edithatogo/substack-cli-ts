import assert from "node:assert/strict";
import { describe, it } from "vitest";
import {
  materialFromCookieHeader,
  materialFromCookies,
  summarizeApiAuthMaterial,
  validateApiAuthMaterial,
} from "./auth.js";
import type { FetchLike } from "./client.js";

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
      summary.cookies.some((cookie) => cookie.value === "[REDACTED]"),
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

  it("validates a session with handle options and public profile probes", async () => {
    const material = materialFromCookieHeader(
      "substack.sid=fake-long-secret-value",
      "https://rareinsights.substack.com",
      "env",
    );
    const routes = new Map<string, unknown>([
      [
        "https://substack.com/api/v1/handle/options",
        {
          potentialHandles: [{ id: "rareinsights", handle: "rareinsights", type: "existing" }],
        },
      ],
      [
        "https://substack.com/api/v1/user/rareinsights/public_profile",
        {
          id: 123,
          name: "Example",
          handle: "rareinsights",
          publicationUsers: [
            {
              role: "admin",
              publication: {
                id: 456,
                name: "Rare Insights",
                subdomain: "rareinsights",
              },
            },
          ],
        },
      ],
    ]);
    const validation = await validateApiAuthMaterial(material, fakeFetch(routes));

    assert.equal(validation.status, "ok");
    assert.equal(validation.browserFallback, "not-needed");
    assert.equal(validation.handle, "rareinsights");
    assert.deepEqual(validation.publication, {
      id: 456,
      name: "Rare Insights",
      subdomain: "rareinsights",
      role: "admin",
    });
  });

  it("classifies forbidden validation responses", async () => {
    const material = materialFromCookieHeader(
      "substack.sid=fake-long-secret-value",
      "https://rareinsights.substack.com",
      "env",
    );
    const validation = await validateApiAuthMaterial(material, () =>
      Promise.resolve(response(403, { error: "forbidden" })),
    );

    assert.equal(validation.status, "browser-fallback-required");
    assert.equal(validation.browserFallback, "required");
  });

  it("surfaces fallback guidance and supports one explicit local-profile refresh", async () => {
    const stale = materialFromCookieHeader(
      "substack.sid=stale",
      "https://rareinsights.substack.com",
      "env",
    );
    const fresh = materialFromCookieHeader(
      "substack.sid=fresh",
      "https://rareinsights.substack.com",
      "local-profile",
    );
    const routes = new Map<string, unknown>([
      [
        "https://substack.com/api/v1/handle/options",
        { potentialHandles: [{ id: "rareinsights", handle: "rareinsights", type: "existing" }] },
      ],
      [
        "https://substack.com/api/v1/user/rareinsights/public_profile",
        { id: 123, name: "Example", handle: "rareinsights", publicationUsers: [] },
      ],
    ]);
    let challenged = false;
    const fetchImpl: FetchLike = (input, init) => {
      const cookie = (init?.headers as Record<string, string> | undefined)?.cookie;
      if (!challenged && cookie?.includes("stale")) {
        challenged = true;
        return Promise.resolve(response(403, "Just a moment... cf-chl-test"));
      }
      const body = routes.get(input);
      return Promise.resolve(response(body === undefined ? 404 : 200, body ?? {}));
    };

    const required = await validateApiAuthMaterial(stale, () =>
      Promise.resolve(response(403, "forbidden")),
    );
    assert.equal(required.status, "browser-fallback-required");

    challenged = false;
    const refreshed = await validateApiAuthMaterial(stale, fetchImpl, async () => fresh);
    assert.equal(refreshed.status, "ok");
    assert.equal(refreshed.browserFallback, "used");
  });
});

function fakeFetch(routes: Map<string, unknown>): FetchLike {
  return (input: string) => {
    const body = routes.get(input);
    if (body === undefined) {
      return Promise.resolve(response(404, { error: "not found" }));
    }

    return Promise.resolve(response(200, body));
  };
}

function response(status: number, body: unknown): Awaited<ReturnType<FetchLike>> {
  return {
    status,
    text: () => Promise.resolve(JSON.stringify(body)),
  };
}
