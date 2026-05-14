import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { materialFromCookieHeader } from "./auth.js";
import { fetchDomainStatus } from "./domain.js";
import type { FetchLike } from "./client.js";

describe("fetchDomainStatus", () => {
  it("returns domain status with no custom domain configured", async () => {
    const result = await fetchDomainStatus(
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
            },
          ],
        ]),
      ),
    );

    assert.equal(result.status, "ok");
    assert.equal(result.domain?.customDomain, null);
    assert.equal(result.domain?.customDomainOptional, false);
    assert.equal(result.domain?.subdomain, "rareinsights");
    assert.equal(result.domain?.sslStatus, "unknown");
    assert.equal(result.domain?.verified, false);
    assert.deepEqual(result.domain?.dnsInstructions, []);
  });

  it("returns domain status with subdomain custom domain", async () => {
    const result = await fetchDomainStatus(
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
              custom_domain: "newsletter.rareinsights.com",
              custom_domain_optional: true,
              custom_domain_ssl_status: "active",
            },
          ],
        ]),
      ),
    );

    assert.equal(result.status, "ok");
    assert.equal(result.domain?.customDomain, "newsletter.rareinsights.com");
    assert.equal(result.domain?.customDomainOptional, true);
    assert.equal(result.domain?.subdomain, "rareinsights");
    assert.equal(result.domain?.sslStatus, "active");
    assert.equal(result.domain?.verified, true);
    assert.equal(result.domain?.dnsInstructions.length, 1);
    assert.equal(result.domain?.dnsInstructions[0]?.type, "CNAME");
    assert.equal(result.domain?.dnsInstructions[0]?.name, "newsletter");
    assert.equal(result.domain?.dnsInstructions[0]?.target, "rareinsights.substack.com");
    assert.equal(result.domain?.dnsInstructions[0]?.ttl, "3600");
  });

  it("returns domain status with apex custom domain", async () => {
    const result = await fetchDomainStatus(
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
              custom_domain: "rareinsights.com",
              custom_domain_optional: false,
            },
          ],
        ]),
      ),
    );

    assert.equal(result.status, "ok");
    assert.equal(result.domain?.customDomain, "rareinsights.com");
    assert.equal(result.domain?.customDomainOptional, false);
    assert.equal(result.domain?.verified, true);
    assert.equal(result.domain?.dnsInstructions.length, 1);
    assert.equal(result.domain?.dnsInstructions[0]?.type, "CNAME");
    assert.equal(result.domain?.dnsInstructions[0]?.name, "@");
    assert.equal(result.domain?.dnsInstructions[0]?.target, "rareinsights.substack.com");
  });

  it("maps ssl status values correctly", async () => {
    const scenarios = [
      { raw: "not_provisioned", expected: "not_provisioned" as const },
      { raw: "provisioning", expected: "provisioning" as const },
      { raw: "active", expected: "active" as const },
      { raw: "expired", expected: "expired" as const },
      { raw: "failed", expected: "failed" as const },
      { raw: "", expected: "unknown" as const },
      { raw: "unknown", expected: "unknown" as const },
    ];

    for (const scenario of scenarios) {
      const result = await fetchDomainStatus(
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
                custom_domain: "example.com",
                custom_domain_ssl_status: scenario.raw,
              },
            ],
          ]),
        ),
      );

      assert.equal(result.domain?.sslStatus, scenario.expected);
    }
  });

  it("classifies read failures", async () => {
    const result = await fetchDomainStatus("https://rareinsights.substack.com", material(), () =>
      Promise.resolve(response(403, { error: "forbidden" })),
    );

    assert.equal(result.status, "forbidden");
    assert.equal(result.domain, undefined);
  });

  it("classifies network errors", async () => {
    const result = await fetchDomainStatus("https://rareinsights.substack.com", material(), () =>
      Promise.resolve(response(0, null)),
    );

    assert.equal(result.status, "network-error");
    assert.equal(result.domain, undefined);
  });

  it("detects schema drift with malformed response", async () => {
    const result = await fetchDomainStatus(
      "https://rareinsights.substack.com",
      material(),
      fakeFetch(
        new Map<string, unknown>([
          [
            "https://rareinsights.substack.com/api/v1/publication",
            { id: "not-a-number", name: 42 },
          ],
        ]),
      ),
    );

    assert.equal(result.status, "schema-drift");
    assert.equal(result.domain, undefined);
  });

  it("handles missing ssl status as unknown", async () => {
    const result = await fetchDomainStatus(
      "https://rareinsights.substack.com",
      material(),
      fakeFetch(
        new Map<string, unknown>([
          [
            "https://rareinsights.substack.com/api/v1/publication",
            {
              id: 456,
              name: "Test Pub",
              subdomain: "testpub",
              custom_domain: "blog.testpub.com",
            },
          ],
        ]),
      ),
    );

    assert.equal(result.domain?.sslStatus, "unknown");
  });

  it("maps unrecognized ssl status to unknown", async () => {
    const result = await fetchDomainStatus(
      "https://rareinsights.substack.com",
      material(),
      fakeFetch(
        new Map<string, unknown>([
          [
            "https://rareinsights.substack.com/api/v1/publication",
            {
              id: 456,
              name: "Test Pub",
              subdomain: "testpub",
              custom_domain: "blog.testpub.com",
              custom_domain_ssl_status: "bogus_value",
            },
          ],
        ]),
      ),
    );

    assert.equal(result.domain?.sslStatus, "unknown");
  });

  it("generates correct DNS CNAME for tri-level subdomain", async () => {
    const result = await fetchDomainStatus(
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
              custom_domain: "blog.rareinsights.com",
              custom_domain_optional: true,
            },
          ],
        ]),
      ),
    );

    assert.equal(result.domain?.dnsInstructions.length, 1);
    assert.equal(result.domain?.dnsInstructions[0]?.type, "CNAME");
    assert.equal(result.domain?.dnsInstructions[0]?.name, "blog");
    assert.equal(result.domain?.dnsInstructions[0]?.target, "rareinsights.substack.com");
  });

  it("classifies 401 as unauthenticated", async () => {
    const result = await fetchDomainStatus("https://rareinsights.substack.com", material(), () =>
      Promise.resolve(response(401, { error: "unauthorized" })),
    );

    assert.equal(result.status, "unauthenticated");
  });

  it("classifies 500 as schema-drift", async () => {
    const result = await fetchDomainStatus("https://rareinsights.substack.com", material(), () =>
      Promise.resolve(response(500, { error: "server error" })),
    );

    assert.equal(result.status, "schema-drift");
  });

  it("defaults customDomainOptional to false", async () => {
    const result = await fetchDomainStatus(
      "https://rareinsights.substack.com",
      material(),
      fakeFetch(
        new Map<string, unknown>([
          [
            "https://rareinsights.substack.com/api/v1/publication",
            {
              id: 456,
              name: "Test",
              subdomain: "test",
              custom_domain: null,
            },
          ],
        ]),
      ),
    );

    assert.equal(result.domain?.customDomainOptional, false);
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
