import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { materialFromCookieHeader } from "./auth.js";
import type { FetchLike } from "./client.js";
import { fetchGiftSubscriptions } from "./subscriber-gifts.js";

const material = materialFromCookieHeader(
  "substack.sid=fake-secret",
  "https://test.substack.com",
  "env",
);

function fakeFetch(status: number, body: unknown): FetchLike {
  return () =>
    Promise.resolve({
      status,
      text: () => Promise.resolve(typeof body === "string" ? body : JSON.stringify(body)),
    });
}

describe("fetchGiftSubscriptions", () => {
  it("returns gift subscriptions from a valid response", async () => {
    const fetchFn = fakeFetch(200, {
      gifts: [
        {
          id: "1",
          gifter_name: "Alice",
          gifter_email: "alice@example.com",
          recipient_email: "bob@example.com",
          tier: "monthly",
          status: "active",
          created_at: "2026-01-01T00:00:00Z",
          expires_at: "2027-01-01T00:00:00Z",
          is_active: true,
        },
        {
          id: "2",
          gifter_name: "Charlie",
          recipient_email: "dave@example.com",
          tier: "yearly",
          status: "expired",
          active: false,
        },
      ],
    });

    const result = await fetchGiftSubscriptions("https://test.substack.com", material, fetchFn);

    assert.equal(result.status, "ok");
    assert.equal(result.gifts!.length, 2);
    assert.equal(result.gifts![0]!.gifterName, "Alice");
    assert.equal(result.gifts![0]!.gifterEmail, "alice@example.com");
    assert.equal(result.gifts![0]!.recipientEmail, "bob@example.com");
    assert.equal(result.gifts![0]!.tier, "monthly");
    assert.equal(result.gifts![0]!.status, "active");
    assert.equal(result.gifts![0]!.isActive, true);
    assert.equal(result.gifts![1]!.gifterName, "Charlie");
    assert.equal(result.gifts![1]!.recipientEmail, "dave@example.com");
    assert.equal(result.gifts![1]!.tier, "yearly");
    assert.equal(result.gifts![1]!.isActive, false);
  });

  it("returns not-found when all known endpoints are missing", async () => {
    const result = await fetchGiftSubscriptions(
      "https://test.substack.com",
      material,
      fakeFetch(404, {}),
    );

    assert.equal(result.status, "not-found");
    assert.match(result.message, /No gift subscriptions endpoint/);
  });

  it("classifies non-404 failures", async () => {
    const result = await fetchGiftSubscriptions(
      "https://test.substack.com",
      material,
      fakeFetch(403, {}),
    );

    assert.equal(result.status, "forbidden");
  });

  it("returns ok with empty array for no gifts", async () => {
    const result = await fetchGiftSubscriptions(
      "https://test.substack.com",
      material,
      fakeFetch(200, { gifts: [] }),
    );

    assert.equal(result.status, "ok");
    assert.deepEqual(result.gifts, []);
  });
});
