import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { materialFromCookieHeader } from "./auth.js";
import { fetchPublication, fetchPublicationChecklist } from "./publication.js";
import type { FetchLike } from "./client.js";

describe("fetchPublication", () => {
  it("returns publication details with branding fields", async () => {
    const details = await fetchPublication(
      "https://rareinsights.substack.com",
      material(),
      fakeFetch(
        new Map<string, unknown>([
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
              logo_url: "https://substackcdn.com/logo.png",
              favicon_url: "https://substackcdn.com/favicon.ico",
              colors: {
                primary: "#000000",
                secondary: "#444444",
                background: "#ffffff",
                text: "#333333",
              },
              font_family_heading: "Lora",
              font_family_body: "Merriweather",
              custom_domain_enabled: false,
            },
          ],
        ]),
      ),
    );

    assert.equal(details.name, "Rare Insights");
    assert.equal(details.subdomain, "rareinsights");
    assert.equal(details.heroText, "Evidence-based writing");
    assert.equal(details.logoUrl, "https://substackcdn.com/logo.png");
    assert.equal(details.faviconUrl, "https://substackcdn.com/favicon.ico");
    assert.deepEqual(details.colors, {
      primary: "#000000",
      secondary: "#444444",
      background: "#ffffff",
      text: "#333333",
    });
    assert.equal(details.fontFamilyHeading, "Lora");
    assert.equal(details.fontFamilyBody, "Merriweather");
    assert.equal(details.customDomainEnabled, false);
    assert.equal(details.paymentsState, "disabled");
  });

  it("handles minimal publication response", async () => {
    const details = await fetchPublication(
      "https://minimal.substack.com",
      material(),
      fakeFetch(
        new Map<string, unknown>([
          [
            "https://minimal.substack.com/api/v1/publication",
            {
              name: "Minimal",
              subdomain: "minimal",
            },
          ],
        ]),
      ),
    );

    assert.equal(details.name, "Minimal");
    assert.equal(details.subdomain, "minimal");
    assert.equal(details.heroText, undefined);
    assert.equal(details.logoUrl, undefined);
  });

  it("throws on non-200 status", async () => {
    await assert.rejects(
      fetchPublication("https://rareinsights.substack.com", material(), () =>
        Promise.resolve(response(404, { error: "not found" })),
      ),
      /Failed to fetch publication/,
    );
  });

  it("throws on network error (status 0)", async () => {
    await assert.rejects(
      fetchPublication("https://rareinsights.substack.com", material(), () =>
        Promise.resolve(response(0, null)),
      ),
      /Failed to fetch publication/,
    );
  });

  it("throws on schema drift with malformed response", async () => {
    await assert.rejects(
      fetchPublication(
        "https://rareinsights.substack.com",
        material(),
        fakeFetch(
          new Map<string, unknown>([
            [
              "https://rareinsights.substack.com/api/v1/publication",
              { id: "not-a-number", name: 123 },
            ],
          ]),
        ),
      ),
      /Publication response schema drift/,
    );
  });

  it("handles null colors gracefully", async () => {
    const details = await fetchPublication(
      "https://rareinsights.substack.com",
      material(),
      fakeFetch(
        new Map<string, unknown>([
          [
            "https://rareinsights.substack.com/api/v1/publication",
            {
              name: "No Colors Pub",
              subdomain: "nocolors",
              colors: null,
            },
          ],
        ]),
      ),
    );

    assert.equal(details.name, "No Colors Pub");
    assert.equal(details.colors, null);
  });

  it("handles undefined optional fields", async () => {
    const details = await fetchPublication(
      "https://rareinsights.substack.com",
      material(),
      fakeFetch(
        new Map<string, unknown>([
          [
            "https://rareinsights.substack.com/api/v1/publication",
            {
              name: "Minimal Pub",
              subdomain: "minimal",
              custom_domain: null,
            },
          ],
        ]),
      ),
    );

    assert.equal(details.customDomain, null);
    assert.equal(details.customDomainEnabled, undefined);
    assert.equal(details.fontFamilyHeading, undefined);
  });
});

describe("fetchPublicationChecklist", () => {
  it("returns subscriber count and raw data", async () => {
    const result = await fetchPublicationChecklist(
      "https://rareinsights.substack.com",
      material(),
      fakeFetch(
        new Map<string, unknown>([
          [
            "https://rareinsights.substack.com/api/v1/publication_launch_checklist",
            {
              subscriber_count: 1234,
              has_published: true,
              publication_state: "active",
            },
          ],
        ]),
      ),
    );

    assert.equal(result.subscriberCount, 1234);
    assert.equal(result.has_published, true);
  });

  it("handles null subscriber count", async () => {
    const result = await fetchPublicationChecklist(
      "https://rareinsights.substack.com",
      material(),
      fakeFetch(
        new Map<string, unknown>([
          [
            "https://rareinsights.substack.com/api/v1/publication_launch_checklist",
            { has_published: false },
          ],
        ]),
      ),
    );

    assert.equal(result.subscriberCount, null);
  });

  it("throws on non-200 status", async () => {
    await assert.rejects(
      fetchPublicationChecklist("https://rareinsights.substack.com", material(), () =>
        Promise.resolve(response(403, { error: "forbidden" })),
      ),
      /Failed to fetch publication checklist/,
    );
  });

  it("throws on network error (status 0)", async () => {
    await assert.rejects(
      fetchPublicationChecklist("https://rareinsights.substack.com", material(), () =>
        Promise.resolve(response(0, null)),
      ),
      /Failed to fetch publication checklist/,
    );
  });

  it("throws on 401", async () => {
    await assert.rejects(
      fetchPublicationChecklist("https://rareinsights.substack.com", material(), () =>
        Promise.resolve(response(401, { error: "unauthorized" })),
      ),
      /Failed to fetch publication checklist/,
    );
  });

  it("passes through raw response fields", async () => {
    const result = await fetchPublicationChecklist(
      "https://rareinsights.substack.com",
      material(),
      fakeFetch(
        new Map<string, unknown>([
          [
            "https://rareinsights.substack.com/api/v1/publication_launch_checklist",
            {
              subscriber_count: 500,
              has_published: true,
              publication_state: "active",
              has_custom_domain: false,
              items_completed: 7,
              items_total: 10,
            },
          ],
        ]),
      ),
    );

    assert.equal(result.subscriberCount, 500);
    assert.equal(result.has_published, true);
    assert.equal(result.publication_state, "active");
    assert.equal(result.has_custom_domain, false);
    assert.equal(result.items_completed, 7);
  });

  it("handles non-numeric subscriber_count as null", async () => {
    const result = await fetchPublicationChecklist(
      "https://rareinsights.substack.com",
      material(),
      fakeFetch(
        new Map<string, unknown>([
          [
            "https://rareinsights.substack.com/api/v1/publication_launch_checklist",
            { subscriber_count: "five hundred" },
          ],
        ]),
      ),
    );

    assert.equal(result.subscriberCount, null);
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
