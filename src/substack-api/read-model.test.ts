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
            "https://rareinsights.substack.com/api/v1/posts",
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
            "https://rareinsights.substack.com/api/v1/drafts",
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
