import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { materialFromCookieHeader } from "./auth.js";
import { readApiInventory } from "./read-model.js";
import type { FetchLike } from "./client.js";

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
        ]),
      ),
    );

    assert.equal(inventory.status, "ok");
    assert.equal(inventory.user?.handle, "rareinsights");
    assert.equal(inventory.user.publications[0]?.role, "admin");
    assert.equal(inventory.configuredPublication?.id, 456);
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

function response(
  status: number,
  body: unknown,
): Awaited<ReturnType<FetchLike>> {
  return {
    status,
    text: () => Promise.resolve(JSON.stringify(body)),
  };
}
