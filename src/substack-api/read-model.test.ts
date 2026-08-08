import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { materialFromCookieHeader } from "./auth.js";
import type { FetchLike } from "./client.js";
import { readApiInventory } from "./read-model.js";

describe("readApiInventory", () => {
  it("returns a typed user and configured publication inventory", async () => {
    const inventory = await readApiInventory(
      material(),
      fakeFetch(
        new Map<string, unknown>([
          [
            "https://substack.com/api/v1/handle/options",
            {
              potentialHandles: [{ handle: "rareinsights", type: "existing" }],
            },
          ],
          [
            "https://substack.com/api/v1/user/rareinsights/public_profile",
            {
              id: 123,
              name: "Example User",
              handle: "rareinsights",
              publicationUsers: [
                {
                  role: "admin",
                  is_primary: true,
                  publication: {
                    id: 456,
                    name: "Rare Insights",
                    subdomain: "rareinsights",
                    custom_domain: null,
                  },
                },
              ],
            },
          ],
          [
            "https://rareinsights.substack.com/api/v1/publication",
            {
              id: 456,
              name: "Rare Insights",
              subdomain: "rareinsights",
              custom_domain: null,
              hero_text: "Evidence-based writing",
              author_id: 123,
              payments_state: "disabled",
            },
          ],
          [
            "https://rareinsights.substack.com/api/v1/publication/sections",
            [
              {
                id: 1,
                publication_id: 456,
                name: "Main",
                slug: "main",
                description: null,
                is_podcast: false,
              },
            ],
          ],
          [
            "https://rareinsights.substack.com/api/v1/posts?limit=10",
            [
              {
                id: 10,
                publication_id: 456,
                title: "Recent Post",
                slug: "recent-post",
                post_date: "2026-04-01T00:00:00.000Z",
                type: "newsletter",
                audience: "everyone",
                canonical_url: "https://rareinsights.substack.com/p/recent-post",
                section_id: 1,
              },
            ],
          ],
          [
            "https://rareinsights.substack.com/api/v1/drafts?limit=10",
            {
              posts: [
                {
                  id: 20,
                  publication_id: 456,
                  type: "newsletter",
                  post_date: null,
                  email_sent_at: null,
                  is_published: false,
                  title: null,
                  draft_title: "Draft Title",
                  draft_updated_at: "2026-04-02T00:00:00.000Z",
                  audience: "everyone",
                  slug: null,
                  scheduled_at: "2026-05-01T09:00:00.000Z",
                  should_send_email: null,
                  write_comment_permissions: "only_paid",
                  section_id: null,
                  section_name: null,
                  section_slug: null,
                },
              ],
              hasMore: false,
            },
          ],
        ]),
      ),
    );

    assert.equal(inventory.status, "ok");
    assert.equal(inventory.user?.handle, "rareinsights");
    assert.equal(inventory.user.publications[0]?.role, "admin");
    assert.equal(inventory.configuredPublication?.id, 456);
    assert.equal(inventory.sections?.[0]?.slug, "main");
    assert.equal(inventory.posts?.[0]?.slug, "recent-post");
    assert.equal(inventory.drafts?.[0]?.draftTitle, "Draft Title");
    assert.equal(inventory.drafts?.[0]?.scheduledAt, "2026-05-01T09:00:00.000Z");
    assert.equal(inventory.draftHasMore, false);
  });

  it("fetches paginated posts and drafts across cursor pages", async () => {
    const inventory = await readApiInventory(
      material(),
      fakeFetch(
        new Map<string, unknown>([
          [
            "https://substack.com/api/v1/handle/options",
            {
              potentialHandles: [{ handle: "rareinsights", type: "existing" }],
            },
          ],
          [
            "https://substack.com/api/v1/user/rareinsights/public_profile",
            {
              id: 123,
              name: "Example User",
              handle: "rareinsights",
              publicationUsers: [
                {
                  role: "admin",
                  is_primary: true,
                  publication: {
                    id: 456,
                    name: "Rare Insights",
                    subdomain: "rareinsights",
                    custom_domain: null,
                  },
                },
              ],
            },
          ],
          [
            "https://rareinsights.substack.com/api/v1/publication",
            {
              id: 456,
              name: "Rare Insights",
              subdomain: "rareinsights",
              custom_domain: null,
              hero_text: "Evidence-based writing",
              author_id: 123,
              payments_state: "disabled",
            },
          ],
          [
            "https://rareinsights.substack.com/api/v1/publication/sections",
            [
              {
                id: 1,
                publication_id: 456,
                name: "Main",
                slug: "main",
                description: null,
                is_podcast: false,
              },
            ],
          ],
          [
            "https://rareinsights.substack.com/api/v1/posts?limit=4",
            {
              posts: [
                {
                  id: 1,
                  publication_id: 456,
                  title: "First",
                  slug: "first",
                  post_date: "2026-01-01T00:00:00.000Z",
                  type: "newsletter",
                  audience: "everyone",
                  canonical_url: "https://rareinsights.substack.com/p/first",
                  section_id: 1,
                },
                {
                  id: 2,
                  publication_id: 456,
                  title: "Second",
                  slug: "second",
                  post_date: "2026-01-02T00:00:00.000Z",
                  type: "newsletter",
                  audience: "everyone",
                  canonical_url: "https://rareinsights.substack.com/p/second",
                  section_id: 1,
                },
              ],
              hasMore: true,
              nextCursor: 3,
            },
          ],
          [
            "https://rareinsights.substack.com/api/v1/posts?limit=4&cursor=3",
            {
              posts: [
                {
                  id: 3,
                  publication_id: 456,
                  title: "Third",
                  slug: "third",
                  post_date: "2026-01-03T00:00:00.000Z",
                  type: "newsletter",
                  audience: "everyone",
                  canonical_url: "https://rareinsights.substack.com/p/third",
                  section_id: 1,
                },
                {
                  id: 4,
                  publication_id: 456,
                  title: "Fourth",
                  slug: "fourth",
                  post_date: "2026-01-04T00:00:00.000Z",
                  type: "newsletter",
                  audience: "everyone",
                  canonical_url: "https://rareinsights.substack.com/p/fourth",
                  section_id: 1,
                },
              ],
              hasMore: false,
              nextCursor: null,
            },
          ],
          [
            "https://rareinsights.substack.com/api/v1/drafts?limit=2",
            {
              posts: [
                {
                  id: 21,
                  publication_id: 456,
                  type: "newsletter",
                  post_date: null,
                  email_sent_at: null,
                  is_published: false,
                  title: null,
                  draft_title: "Draft One",
                  draft_updated_at: "2026-02-01T00:00:00.000Z",
                  audience: "everyone",
                  slug: null,
                  scheduled_at: "2026-05-01T09:00:00.000Z",
                  should_send_email: null,
                  write_comment_permissions: "only_paid",
                  section_id: null,
                  section_name: null,
                  section_slug: null,
                },
              ],
              hasMore: true,
              nextCursor: "c2",
            },
          ],
          [
            "https://rareinsights.substack.com/api/v1/drafts?limit=2&cursor=c2",
            {
              posts: [
                {
                  id: 22,
                  publication_id: 456,
                  type: "newsletter",
                  post_date: null,
                  email_sent_at: null,
                  is_published: false,
                  title: null,
                  draft_title: "Draft Two",
                  draft_updated_at: "2026-02-02T00:00:00.000Z",
                  audience: "everyone",
                  slug: null,
                  scheduled_at: "2026-05-02T09:00:00.000Z",
                  should_send_email: null,
                  write_comment_permissions: "only_paid",
                  section_id: null,
                  section_name: null,
                  section_slug: null,
                },
              ],
              hasMore: false,
              nextCursor: null,
            },
          ],
        ]),
      ),
      {
        postLimit: 4,
        draftLimit: 2,
      },
    );

    assert.equal(inventory.status, "ok");
    assert.equal(inventory.posts?.length, 4);
    assert.deepEqual(
      inventory.posts?.map((post) => post.id),
      [1, 2, 3, 4],
    );
    assert.equal(inventory.drafts?.length, 2);
    assert.deepEqual(
      inventory.drafts?.map((draft) => draft.id),
      [21, 22],
    );
    assert.equal(inventory.draftHasMore, false);
  });

  it("classifies read failures", async () => {
    const inventory = await readApiInventory(material(), () =>
      Promise.resolve(response(403, { error: "forbidden" })),
    );

    assert.equal(inventory.status, "forbidden");
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

function response(status: number, body: unknown): Awaited<ReturnType<FetchLike>> {
  return {
    status,
    text: () => Promise.resolve(JSON.stringify(body)),
  };
}
