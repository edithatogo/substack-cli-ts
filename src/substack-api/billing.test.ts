import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { materialFromCookieHeader } from "./auth.js";
import {
  fetchBillingSummary,
  fetchPayoutHistory,
  fetchSubscriptionTiers,
  fetchTaxFormStatus,
} from "./billing.js";
import type { FetchLike } from "./client.js";

function fakeFetch(status: number, body: string): FetchLike {
  return () =>
    Promise.resolve({
      status,
      text: () => Promise.resolve(body),
    });
}

function fakeFetchRoutes(routes: Map<string, unknown>): FetchLike {
  return (input: string) => {
    const body = routes.get(input);
    if (body === undefined) {
      return Promise.resolve({ status: 404, text: () => Promise.resolve("{}") });
    }
    return Promise.resolve({
      status: 200,
      text: () => Promise.resolve(JSON.stringify(body)),
    });
  };
}

const material = materialFromCookieHeader(
  "substack.sid=fake-secret",
  "https://test.substack.com",
  "env",
);

describe("fetchSubscriptionTiers", () => {
  it("returns tiers from array response", async () => {
    const fetchFn = fakeFetch(
      200,
      JSON.stringify([
        {
          id: "tier-free",
          name: "Free",
          price_monthly: 0,
          price_yearly: 0,
          currency: "usd",
          description: "Free tier",
          is_active: true,
        },
        {
          id: "tier-paid",
          name: "Paid",
          price_monthly: 5,
          price_yearly: 50,
          currency: "usd",
          description: "Paid tier",
          is_active: true,
        },
      ]),
    );

    const result = await fetchSubscriptionTiers("https://test.substack.com", material, fetchFn);

    assert.equal(result.status, "ok");
    assert.equal(result.tiers?.length, 2);
    assert.equal(result.tiers?.[0]?.id, "tier-free");
    assert.equal(result.tiers?.[0]?.name, "Free");
    assert.equal(result.tiers?.[0]?.priceMonthly, 0);
    assert.equal(result.tiers?.[1]?.priceMonthly, 5);
    assert.equal(result.tiers?.[1]?.priceYearly, 50);
  });

  it("parses tiers from nested data field", async () => {
    const fetchFn = fakeFetch(
      200,
      JSON.stringify({
        tiers: [{ id: "t1", name: "Tier 1", monthly_price: 10, yearly_price: 100 }],
      }),
    );

    const result = await fetchSubscriptionTiers("https://test.substack.com", material, fetchFn);

    assert.equal(result.status, "ok");
    assert.equal(result.tiers?.length, 1);
    assert.equal(result.tiers?.[0]?.priceMonthly, 10);
    assert.equal(result.tiers?.[0]?.priceYearly, 100);
  });

  it("returns not-found when all endpoints return 404", async () => {
    const fetchFn = fakeFetch(404, "{}");

    const result = await fetchSubscriptionTiers("https://test.substack.com", material, fetchFn);

    assert.equal(result.status, "not-found");
  });

  it("returns unauthenticated on 401", async () => {
    const fetchFn = fakeFetch(401, "{}");

    const result = await fetchSubscriptionTiers("https://test.substack.com", material, fetchFn);

    assert.equal(result.status, "unauthenticated");
  });
});

describe("fetchPayoutHistory", () => {
  it("returns payouts from array response", async () => {
    const fetchFn = fakeFetch(
      200,
      JSON.stringify([
        {
          id: "payout-1",
          amount: 500,
          currency: "usd",
          status: "completed",
          period: "2026-04",
          paid_at: "2026-05-01T00:00:00Z",
          estimated_arrival: "2026-05-03T00:00:00Z",
        },
      ]),
    );

    const result = await fetchPayoutHistory("https://test.substack.com", material, fetchFn);

    assert.equal(result.status, "ok");
    assert.equal(result.payouts?.length, 1);
    assert.equal(result.payouts?.[0]?.id, "payout-1");
    assert.equal(result.payouts?.[0]?.amount, 500);
    assert.equal(result.payouts?.[0]?.status, "completed");
  });

  it("parses amount_cents into amount", async () => {
    const fetchFn = fakeFetch(
      200,
      JSON.stringify([{ id: "p1", amount_cents: 50000, currency: "usd", status: "pending" }]),
    );

    const result = await fetchPayoutHistory("https://test.substack.com", material, fetchFn);

    assert.equal(result.status, "ok");
    assert.equal(result.payouts?.[0]?.amount, 500);
  });

  it("extracts next_payout from response", async () => {
    const fetchFn = fakeFetch(
      200,
      JSON.stringify({ payouts: [], next_payout: "2026-06-01T00:00:00Z" }),
    );

    const result = await fetchPayoutHistory("https://test.substack.com", material, fetchFn);

    assert.equal(result.status, "ok");
    assert.equal(result.nextPayout, "2026-06-01T00:00:00Z");
  });

  it("returns not-found when all endpoints return 404", async () => {
    const fetchFn = fakeFetch(404, "{}");

    const result = await fetchPayoutHistory("https://test.substack.com", material, fetchFn);

    assert.equal(result.status, "not-found");
  });
});

describe("fetchTaxFormStatus", () => {
  it("returns tax forms from array response", async () => {
    const fetchFn = fakeFetch(
      200,
      JSON.stringify([
        {
          form_type: "W-9",
          tax_year: 2025,
          status: "filed",
          filed_at: "2026-01-15T00:00:00Z",
        },
      ]),
    );

    const result = await fetchTaxFormStatus("https://test.substack.com", material, fetchFn);

    assert.equal(result.status, "ok");
    assert.equal(result.forms?.length, 1);
    assert.equal(result.forms?.[0]?.formType, "W-9");
    assert.equal(result.forms?.[0]?.taxYear, 2025);
    assert.equal(result.forms?.[0]?.status, "filed");
  });

  it("parses forms from nested data field", async () => {
    const fetchFn = fakeFetch(
      200,
      JSON.stringify({
        forms: [{ form_type: "1099", tax_year: 2026, status: "pending" }],
      }),
    );

    const result = await fetchTaxFormStatus("https://test.substack.com", material, fetchFn);

    assert.equal(result.status, "ok");
    assert.equal(result.forms?.length, 1);
    assert.equal(result.forms?.[0]?.formType, "1099");
  });

  it("returns not-found when all endpoints return 404", async () => {
    const fetchFn = fakeFetch(404, "{}");

    const result = await fetchTaxFormStatus("https://test.substack.com", material, fetchFn);

    assert.equal(result.status, "not-found");
  });
});

describe("fetchBillingSummary", () => {
  it("returns payments_state from publication", async () => {
    const routes = new Map<string, unknown>([
      [
        "https://test.substack.com/api/v1/publication",
        { name: "Test", subdomain: "test", payments_state: "enabled" },
      ],
      [
        "https://test.substack.com/api/v1/publication/tiers",
        [{ id: "t1", name: "Free", is_active: true }],
      ],
    ]);

    const result = await fetchBillingSummary(
      "https://test.substack.com",
      material,
      fakeFetchRoutes(routes),
    );

    assert.equal(result.status, "ok");
    assert.equal(result.paymentsState, "enabled");
    assert.equal(result.tiers?.status, "ok");
    assert.equal(result.tiers?.tiers?.length, 1);
  });

  it("returns not-found when all billing endpoints unavailable", async () => {
    const result = await fetchBillingSummary(
      "https://test.substack.com",
      material,
      fakeFetch(404, "{}"),
    );

    assert.equal(result.status, "not-found");
  });

  it("includes tier/payout/tax results", async () => {
    const routes = new Map<string, unknown>([
      [
        "https://test.substack.com/api/v1/publication",
        { name: "Test", subdomain: "test", payments_state: "disabled" },
      ],
      [
        "https://test.substack.com/api/v1/publication/tiers",
        [{ id: "t1", name: "Free", is_active: true }],
      ],
    ]);

    const result = await fetchBillingSummary(
      "https://test.substack.com",
      material,
      fakeFetchRoutes(routes),
    );

    assert.equal(result.status, "ok");
    assert.equal(result.tiers?.status, "ok");
    assert.equal(result.tiers?.tiers?.length, 1);
  });
});
