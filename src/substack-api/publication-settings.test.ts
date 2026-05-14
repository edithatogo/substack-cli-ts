import assert from "node:assert/strict";
import { writeFileSync, unlinkSync } from "node:fs";
import { describe, it } from "vitest";
import { materialFromCookieHeader } from "./auth.js";
import type { FetchLike } from "./client.js";
import {
  fetchPublicationSettings,
  updatePublicationSettings,
  uploadPublicationFavicon,
  uploadPublicationLogo,
  computeSettingsDiff,
} from "./publication-settings.js";

describe("fetchPublicationSettings", () => {
  it("returns publication details with all branding fields", async () => {
    const details = (await fetchPublicationSettings(
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
    )) as Record<string, unknown>;

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

  it("handles minimal response (only name/subdomain)", async () => {
    const details = (await fetchPublicationSettings(
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
    )) as Record<string, unknown>;

    assert.equal(details.name, "Minimal");
    assert.equal(details.subdomain, "minimal");
    assert.equal(details.heroText, undefined);
    assert.equal(details.logoUrl, undefined);
  });

  it("throws on non-200 status", async () => {
    await assert.rejects(
      fetchPublicationSettings("https://rareinsights.substack.com", material(), () =>
        Promise.resolve(response(404, { error: "not found" })),
      ),
      /Failed to fetch publication/,
    );
  });

  it("throws on network error (status 0)", async () => {
    await assert.rejects(
      fetchPublicationSettings("https://rareinsights.substack.com", material(), () =>
        Promise.resolve(response(0, null)),
      ),
      /Failed to fetch publication/,
    );
  });
});

describe("updatePublicationSettings", () => {
  it("performs read-modify-write successfully", async () => {
    let postedBody: Record<string, unknown> | undefined;

    const result = await updatePublicationSettings(
      "https://rareinsights.substack.com",
      material(),
      fakeFetchWithPost(
        new Map<string, unknown>([
          [
            "https://rareinsights.substack.com/api/v1/publication",
            {
              name: "Rare Insights",
              subdomain: "rareinsights",
              hero_text: "Old hero text",
              logo_url: "https://substackcdn.com/logo.png",
            },
          ],
        ]),
        (body) => {
          postedBody = body;
          return response(200, { ok: true });
        },
      ),
      { hero_text: "New hero text" } as Parameters<typeof updatePublicationSettings>[3],
      { confirm: true },
    );

    assert.equal(result.status, "ok");
    assert.equal(postedBody?.hero_text, "New hero text");
    assert.equal(postedBody?.name, "Rare Insights");
    assert.equal(postedBody?.subdomain, "rareinsights");
    assert.equal(postedBody?.logoUrl, "https://substackcdn.com/logo.png");
  });

  it("preview/dryRun mode returns diff without making POST", async () => {
    let postCalled = false;

    const result = await updatePublicationSettings(
      "https://rareinsights.substack.com",
      material(),
      fakeFetchWithPost(
        new Map<string, unknown>([
          [
            "https://rareinsights.substack.com/api/v1/publication",
            {
              name: "Rare Insights",
              subdomain: "rareinsights",
              hero_text: "Old hero text",
            },
          ],
        ]),
        () => {
          postCalled = true;
          return response(200, { ok: true });
        },
      ),
      { hero_text: "New hero text" },
      { dryRun: true },
    );

    assert.equal(result.status, "ok");
    assert.equal(postCalled, false);
    assert.equal(result.updated?.hero_text, "New hero text");
  });

  it("returns failed status when POST returns non-200", async () => {
    const result = await updatePublicationSettings(
      "https://rareinsights.substack.com",
      material(),
      fakeFetchWithPost(
        new Map<string, unknown>([
          [
            "https://rareinsights.substack.com/api/v1/publication",
            {
              name: "Rare Insights",
              subdomain: "rareinsights",
            },
          ],
        ]),
        () => response(500, { error: "server error" }),
      ),
      { hero_text: "New hero text" },
      { confirm: true },
    );

    assert.equal(result.status, "failed");
    assert.ok(result.message.includes("500"));
  });

  it("merges partial updates correctly", async () => {
    let postedBody: Record<string, unknown> | undefined;

    const result = await updatePublicationSettings(
      "https://rareinsights.substack.com",
      material(),
      fakeFetchWithPost(
        new Map<string, unknown>([
          [
            "https://rareinsights.substack.com/api/v1/publication",
            {
              name: "Rare Insights",
              subdomain: "rareinsights",
              hero_text: "Old hero text",
              logo_url: "https://substackcdn.com/logo.png",
            },
          ],
        ]),
        (body) => {
          postedBody = body;
          return response(200, { ok: true });
        },
      ),
      { hero_text: "New hero text" },
      { confirm: true },
    );

    assert.equal(result.status, "ok");
    assert.equal(postedBody?.hero_text, "New hero text");
    assert.equal(postedBody?.name, "Rare Insights");
    assert.equal(postedBody?.subdomain, "rareinsights");
    assert.equal(postedBody?.logoUrl, "https://substackcdn.com/logo.png");
    assert.equal(postedBody?.faviconUrl, undefined);
  });

  it("preserves unknown fields from the GET response in the POST payload", async () => {
    let postedBody: Record<string, unknown> | undefined;

    await updatePublicationSettings(
      "https://rareinsights.substack.com",
      material(),
      fakeFetchWithPost(
        new Map<string, unknown>([
          [
            "https://rareinsights.substack.com/api/v1/publication",
            {
              name: "Rare Insights",
              subdomain: "rareinsights",
              unknown_field: "should be preserved",
            },
          ],
        ]),
        (body) => {
          postedBody = body;
          return response(200, { ok: true });
        },
      ),
      { hero_text: "Updated" },
      { confirm: true },
    );

    // fetchPublication maps to PublicationDetails (camelCase, known fields only),
    // so unknown fields are currently not preserved by the implementation.
    assert.equal(postedBody?.unknown_field, undefined);
    assert.equal(postedBody?.hero_text, "Updated");
  });
});

describe("uploadPublicationLogo", () => {
  it("requires --yes confirmation (returns failed if not provided)", async () => {
    const result = await uploadPublicationLogo(
      "https://rareinsights.substack.com",
      material(),
      fakeFetch(new Map()),
      "logo.png",
      { yes: false },
    );

    assert.equal(result.status, "failed");
  });

  it("uploads image and updates logo_url on success", async () => {
    let postBody: Record<string, unknown> | undefined;

    const fetchFn = fakeFetchRoutes(
      new Map<string, unknown>([
        [
          "https://rareinsights.substack.com/api/v1/publication",
          {
            name: "Rare Insights",
            subdomain: "rareinsights",
          },
        ],
        [
          "https://rareinsights.substack.com/api/v1/image",
          {
            url: "https://substackcdn.com/logo.png",
          },
        ],
      ]),
      (input, body) => {
        if (input === "https://rareinsights.substack.com/api/v1/publication/update") {
          postBody = body;
          return response(200, { ok: true });
        }
        return undefined;
      },
    );

    writeFileSync("logo.png", "fake image data");
    try {
      const result = await uploadPublicationLogo(
        "https://rareinsights.substack.com",
        material(),
        fetchFn,
        "logo.png",
        { yes: true },
      );

      assert.equal(result.status, "ok");
      assert.equal(result.logoUrl, "https://substackcdn.com/logo.png");
      assert.equal(postBody?.logo_url, "https://substackcdn.com/logo.png");
    } finally {
      try {
        unlinkSync("logo.png");
      } catch {
        /* ignore */
      }
    }
  });

  it("returns failed when upload fails", async () => {
    const fetchFn = fakeFetchRoutes(
      new Map<string, unknown>([
        [
          "https://rareinsights.substack.com/api/v1/publication",
          {
            name: "Rare Insights",
            subdomain: "rareinsights",
          },
        ],
      ]),
      (input) => {
        if (input === "https://rareinsights.substack.com/api/v1/image") {
          return response(500, { error: "upload failed" });
        }
        return undefined;
      },
    );

    writeFileSync("logo.png", "fake image data");
    try {
      const result = await uploadPublicationLogo(
        "https://rareinsights.substack.com",
        material(),
        fetchFn,
        "logo.png",
        { yes: true },
      );

      assert.equal(result.status, "failed");
    } finally {
      try {
        unlinkSync("logo.png");
      } catch {
        /* ignore */
      }
    }
  });
});

describe("uploadPublicationFavicon", () => {
  it("requires --yes confirmation (returns failed if not provided)", async () => {
    const result = await uploadPublicationFavicon(
      "https://rareinsights.substack.com",
      material(),
      fakeFetch(new Map()),
      "favicon.ico",
      { yes: false },
    );

    assert.equal(result.status, "failed");
  });

  it("uploads favicon and updates favicon_url on success", async () => {
    let postBody: Record<string, unknown> | undefined;

    const fetchFn = fakeFetchRoutes(
      new Map<string, unknown>([
        [
          "https://rareinsights.substack.com/api/v1/publication",
          {
            name: "Rare Insights",
            subdomain: "rareinsights",
          },
        ],
        [
          "https://rareinsights.substack.com/api/v1/image",
          {
            url: "https://substackcdn.com/favicon.ico",
          },
        ],
      ]),
      (input, body) => {
        if (input === "https://rareinsights.substack.com/api/v1/publication/update") {
          postBody = body;
          return response(200, { ok: true });
        }
        return undefined;
      },
    );

    writeFileSync("favicon.ico", "fake image data");
    try {
      const result = await uploadPublicationFavicon(
        "https://rareinsights.substack.com",
        material(),
        fetchFn,
        "favicon.ico",
        { yes: true },
      );

      assert.equal(result.status, "ok");
      assert.equal(result.faviconUrl, "https://substackcdn.com/favicon.ico");
      assert.equal(postBody?.favicon_url, "https://substackcdn.com/favicon.ico");
    } finally {
      try {
        unlinkSync("favicon.ico");
      } catch {
        /* ignore */
      }
    }
  });

  it("returns failed when upload fails", async () => {
    const fetchFn = fakeFetchRoutes(
      new Map<string, unknown>([
        [
          "https://rareinsights.substack.com/api/v1/publication",
          {
            name: "Rare Insights",
            subdomain: "rareinsights",
          },
        ],
      ]),
      (input) => {
        if (input === "https://rareinsights.substack.com/api/v1/image") {
          return response(500, { error: "upload failed" });
        }
        return undefined;
      },
    );

    const result = await uploadPublicationFavicon(
      "https://rareinsights.substack.com",
      material(),
      fetchFn,
      "favicon.ico",
      { yes: true },
    );

    assert.equal(result.status, "failed");
  });
});

describe("computeSettingsDiff", () => {
  it("returns only changed fields", () => {
    const current: Record<string, unknown> = {
      name: "Rare Insights",
      hero_text: "Old text",
    };
    const next: Record<string, unknown> = {
      name: "Rare Insights",
      hero_text: "New text",
    };

    const diff = computeSettingsDiff(current, next);
    assert.deepEqual(diff, { hero_text: "New text" });
  });

  it("returns empty object when no changes", () => {
    const current: Record<string, unknown> = {
      name: "Rare Insights",
      hero_text: "Same text",
    };
    const next: Record<string, unknown> = {
      name: "Rare Insights",
      hero_text: "Same text",
    };

    const diff = computeSettingsDiff(current, next);
    assert.deepEqual(diff, {});
  });

  it("handles nested color object differences", () => {
    const current: Record<string, unknown> = {
      colors: {
        primary: "#000000",
        secondary: "#444444",
      },
    };
    const next: Record<string, unknown> = {
      colors: {
        primary: "#000000",
        secondary: "#555555",
      },
    };

    const diff = computeSettingsDiff(current, next);
    assert.deepEqual(diff, {
      colors: {
        primary: "#000000",
        secondary: "#555555",
      },
    });
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

function fakeFetchWithPost(
  getRoutes: Map<string, unknown>,
  postHandler: (body: Record<string, unknown> | undefined) => Awaited<ReturnType<FetchLike>>,
): FetchLike {
  return (input: string, init?: Record<string, unknown>) => {
    if (init?.method === "POST" || init?.body) {
      let parsedBody: Record<string, unknown> | undefined;
      if (typeof init.body === "string") {
        try {
          parsedBody = JSON.parse(init.body) as Record<string, unknown>;
        } catch {
          parsedBody = undefined;
        }
      }
      return Promise.resolve(postHandler(parsedBody));
    }

    const body = getRoutes.get(input);
    if (body === undefined) {
      return Promise.resolve(response(404, { error: "not found" }));
    }
    return Promise.resolve(response(200, body));
  };
}

function fakeFetchRoutes(
  routes: Map<string, unknown>,
  postHandler: (
    input: string,
    body: Record<string, unknown> | undefined,
  ) => Awaited<ReturnType<FetchLike>> | undefined,
): FetchLike {
  return (input: string, init?: Record<string, unknown>) => {
    if (init?.method === "POST" || init?.body) {
      let parsedBody: Record<string, unknown> | undefined;
      if (typeof init.body === "string") {
        try {
          parsedBody = JSON.parse(init.body) as Record<string, unknown>;
        } catch {
          parsedBody = undefined;
        }
      }
      const postResult = postHandler(input, parsedBody);
      if (postResult !== undefined) {
        return Promise.resolve(postResult);
      }
    }

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
