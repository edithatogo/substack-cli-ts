import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { materialFromCookieHeader } from "./auth.js";
import { readOwnProfile, readPublicProfile } from "./profile.js";
import type { FetchLike } from "./client.js";

describe("readOwnProfile", () => {
  it("returns own profile data with follower count from public profile", async () => {
    const result = await readOwnProfile(
      material(),
      fakeFetch(
        new Map<string, unknown>([
          [
            "https://substack.com/api/v1/handle/options",
            {
              potentialHandles: [
                {
                  id: "rareinsights",
                  handle: "rareinsights",
                  type: "existing",
                },
              ],
            },
          ],
          [
            "https://substack.com/api/v1/user/rareinsights",
            {
              id: 123,
              name: "Rare Insights Author",
              handle: "rareinsights",
              email: "author@example.com",
              is_email_confirmed: true,
              stripe_customer_id: "cus_abc123",
              subscriberCountNumber: 5000,
            },
          ],
          [
            "https://substack.com/api/v1/user/rareinsights/public_profile",
            {
              id: 123,
              name: "Rare Insights Author",
              handle: "rareinsights",
              subscriberCountNumber: 7500,
            },
          ],
        ]),
      ),
    );

    assert.equal(result.status, "ok");
    assert.equal(result.data?.id, 123);
    assert.equal(result.data?.name, "Rare Insights Author");
    assert.equal(result.data?.handle, "rareinsights");
    assert.equal(result.data?.slug, "rareinsights");
    assert.equal(result.data?.email, "author@example.com");
    assert.equal(result.data?.isEmailConfirmed, true);
    assert.equal(result.data?.stripeCustomerId, "cus_abc123");
    assert.equal(result.data?.followerCount, 7500);
  });

  it("falls back to own profile subscriber count when public profile has none", async () => {
    const result = await readOwnProfile(
      material(),
      fakeFetch(
        new Map<string, unknown>([
          [
            "https://substack.com/api/v1/handle/options",
            {
              potentialHandles: [
                {
                  id: "rareinsights",
                  handle: "rareinsights",
                  type: "existing",
                },
              ],
            },
          ],
          [
            "https://substack.com/api/v1/user/rareinsights",
            {
              id: 123,
              name: "Rare Insights Author",
              handle: "rareinsights",
              subscriberCountNumber: 5000,
            },
          ],
          ["https://substack.com/api/v1/user/rareinsights/public_profile", {}],
        ]),
      ),
    );

    assert.equal(result.status, "ok");
    assert.equal(result.data?.followerCount, 5000);
  });

  it("returns unauthenticated when handle cannot be resolved", async () => {
    const result = await readOwnProfile(
      material(),
      fakeFetch(
        new Map<string, unknown>([
          ["https://substack.com/api/v1/handle/options", { potentialHandles: [] }],
        ]),
      ),
    );

    assert.equal(result.status, "unauthenticated");
    assert.equal(result.data, undefined);
  });

  it("returns unauthenticated when handle endpoint returns non-200", async () => {
    const result = await readOwnProfile(material(), fakeFetch(new Map<string, unknown>()));

    assert.equal(result.status, "unauthenticated");
  });

  it("classifies forbidden user response", async () => {
    const result = await readOwnProfile(
      material(),
      makeRouter([
        route("https://substack.com/api/v1/handle/options", 200, {
          potentialHandles: [{ id: "rareinsights", handle: "rareinsights", type: "existing" }],
        }),
        route("https://substack.com/api/v1/user/rareinsights", 403, {
          error: "forbidden",
        }),
      ]),
    );

    assert.equal(result.status, "forbidden");
    assert.equal(result.message, "Failed to fetch own profile: HTTP 403");
  });

  it("detects schema drift in own profile response", async () => {
    const result = await readOwnProfile(
      material(),
      makeRouter([
        route("https://substack.com/api/v1/handle/options", 200, {
          potentialHandles: [{ id: "rareinsights", handle: "rareinsights", type: "existing" }],
        }),
        route("https://substack.com/api/v1/user/rareinsights", 200, {
          id: "not-a-number",
          name: 42,
          handle: true,
        }),
      ]),
    );

    assert.equal(result.status, "schema-drift");
  });
});

describe("readPublicProfile", () => {
  it("returns public profile data", async () => {
    const result = await readPublicProfile(
      material(),
      "rareinsights",
      fakeFetch(
        new Map<string, unknown>([
          [
            "https://substack.com/api/v1/user/rareinsights/public_profile",
            {
              id: 123,
              name: "Rare Insights Author",
              handle: "rareinsights",
              slug: "rareinsights",
              bio: "Writing about rare diseases",
              photo_url: "https://example.com/photo.jpg",
              subscriberCountNumber: 7500,
              isFollowing: true,
            },
          ],
        ]),
      ),
    );

    assert.equal(result.status, "ok");
    assert.equal(result.data?.id, 123);
    assert.equal(result.data?.name, "Rare Insights Author");
    assert.equal(result.data?.handle, "rareinsights");
    assert.equal(result.data?.slug, "rareinsights");
    assert.equal(result.data?.bio, "Writing about rare diseases");
    assert.equal(result.data?.photoUrl, "https://example.com/photo.jpg");
    assert.equal(result.data?.followerCount, 7500);
    assert.equal(result.data?.isFollowing, true);
  });

  it("uses handle as slug when slug is absent", async () => {
    const result = await readPublicProfile(
      material(),
      "rareinsights",
      fakeFetch(
        new Map<string, unknown>([
          [
            "https://substack.com/api/v1/user/rareinsights/public_profile",
            {
              id: 123,
              name: "Rare Insights Author",
              handle: "rareinsights",
            },
          ],
        ]),
      ),
    );

    assert.equal(result.data?.slug, "rareinsights");
  });

  it("classifies not-found public profile", async () => {
    const result = await readPublicProfile(
      material(),
      "nonexistent",
      fakeFetch(new Map<string, unknown>()),
    );

    assert.equal(result.status, "not-found");
  });

  it("classifies forbidden public profile", async () => {
    const result = await readPublicProfile(
      material(),
      "rareinsights",
      makeRouter([
        route("https://substack.com/api/v1/user/rareinsights/public_profile", 403, {
          error: "forbidden",
        }),
      ]),
    );

    assert.equal(result.status, "forbidden");
  });

  it("detects schema drift in public profile response", async () => {
    const result = await readPublicProfile(
      material(),
      "rareinsights",
      makeRouter([
        route("https://substack.com/api/v1/user/rareinsights/public_profile", 200, {
          name: 42,
          handle: true,
        }),
      ]),
    );

    assert.equal(result.status, "schema-drift");
  });

  it("defaults followerCount and isFollowing when absent", async () => {
    const result = await readPublicProfile(
      material(),
      "rareinsights",
      fakeFetch(
        new Map<string, unknown>([
          [
            "https://substack.com/api/v1/user/rareinsights/public_profile",
            {
              id: 123,
              name: "Rare Insights Author",
              handle: "rareinsights",
            },
          ],
        ]),
      ),
    );

    assert.equal(result.data?.followerCount, 0);
    assert.equal(result.data?.isFollowing, false);
  });
});

function material() {
  return materialFromCookieHeader(
    "substack.sid=fake-long-secret-value",
    "https://rareinsights.substack.com",
    "env",
  );
}

function fakeFetch(routes: Map<string, unknown>): FetchLike {
  return (input: string) => {
    const body = routes.get(input);
    if (body === undefined) {
      return Promise.resolve(response(404, { error: "not found" }));
    }
    return Promise.resolve(response(200, body));
  };
}

function route(url: string, status: number, body: unknown) {
  return { url, status, body };
}

function makeRouter(routes: { url: string; status: number; body: unknown }[]): FetchLike {
  const map = new Map(routes.map((r) => [r.url, r]));
  return (input: string) => {
    const match = map.get(input);
    if (!match) return Promise.resolve(response(404, { error: "not found" }));
    return Promise.resolve(response(match.status, match.body));
  };
}

function response(status: number, body: unknown): Awaited<ReturnType<FetchLike>> {
  return {
    status,
    text: () => Promise.resolve(JSON.stringify(body)),
  };
}
