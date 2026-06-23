import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { materialFromCookieHeader } from "./auth.js";
import type { FetchLike } from "./client.js";
import {
  changeTeamMemberRole,
  fetchTeamActivity,
  fetchTeamMembers,
  inviteTeamMember,
  isValidTeamRole,
  redactEmail,
  removeTeamMember,
} from "./team.js";

function fakeFetch(status: number, body: string): FetchLike {
  return () =>
    Promise.resolve({
      status,
      text: () => Promise.resolve(body),
    });
}

function captureFetch(
  status: number,
  body: unknown,
  capture: { url?: string; body?: string },
): FetchLike {
  return (url, init) => {
    capture.url = url;
    capture.body = String(init?.body ?? "");
    return Promise.resolve({
      status,
      text: () => Promise.resolve(JSON.stringify(body)),
    });
  };
}

const material = materialFromCookieHeader(
  "substack.sid=fake-secret",
  "https://test.substack.com",
  "env",
);

describe("fetchTeamMembers", () => {
  it("returns members from a valid response", async () => {
    const fetchFn = fakeFetch(
      200,
      JSON.stringify([
        { id: 1, name: "Alice", email: "alice@example.com", role: "admin" },
        { id: 2, name: "Bob", role: "editor" },
      ]),
    );

    const result = await fetchTeamMembers("https://test.substack.com", material, fetchFn);

    assert.equal(result.status, "ok");
    assert.equal(result.members!.length, 2);
    assert.equal(result.members![0]!.name, "Alice");
    assert.equal(result.members![0]!.email, "a...e@example.com");
    assert.equal(result.members![0]!.role, "admin");
    assert.equal(result.members![1]!.name, "Bob");
    assert.equal(result.members![1]!.email, undefined);
    assert.equal(result.members![1]!.role, "editor");
    assert.match(result.message, /Found 2 team members/);
  });

  it("includes full emails only when requested", async () => {
    const fetchFn = fakeFetch(
      200,
      JSON.stringify([{ id: 1, name: "Alice", email: "alice@example.com", role: "admin" }]),
    );

    const result = await fetchTeamMembers("https://test.substack.com", material, fetchFn, {
      includeEmails: true,
    });

    assert.equal(result.status, "ok");
    assert.equal(result.members![0]!.email, "alice@example.com");
  });

  it("returns empty members for empty response", async () => {
    const fetchFn = fakeFetch(200, JSON.stringify([]));

    const result = await fetchTeamMembers("https://test.substack.com", material, fetchFn);

    assert.equal(result.status, "ok");
    assert.equal(result.members!.length, 0);
  });

  it("returns schema-drift for non-array response body", async () => {
    const fetchFn = fakeFetch(200, JSON.stringify({ not: "array" }));

    const result = await fetchTeamMembers("https://test.substack.com", material, fetchFn);

    assert.equal(result.status, "schema-drift");
  });

  it("returns unauthenticated on 401", async () => {
    const fetchFn = fakeFetch(401, JSON.stringify({ error: "unauthorized" }));

    const result = await fetchTeamMembers("https://test.substack.com", material, fetchFn);

    assert.equal(result.status, "unauthenticated");
  });

  it("returns forbidden on 403", async () => {
    const fetchFn = fakeFetch(403, JSON.stringify({}));

    const result = await fetchTeamMembers("https://test.substack.com", material, fetchFn);

    assert.equal(result.status, "forbidden");
  });

  it("returns not-found on 404", async () => {
    const fetchFn = fakeFetch(404, JSON.stringify({}));

    const result = await fetchTeamMembers("https://test.substack.com", material, fetchFn);

    assert.equal(result.status, "not-found");
  });

  it("returns network-error when fetch throws", async () => {
    const fetchFn: FetchLike = () => Promise.reject(new Error("Network failure"));

    const result = await fetchTeamMembers("https://test.substack.com", material, fetchFn);

    assert.equal(result.status, "network-error");
  });

  it("parses id from string", async () => {
    const fetchFn = fakeFetch(200, JSON.stringify([{ id: "42", name: "Charlie", role: "writer" }]));

    const result = await fetchTeamMembers("https://test.substack.com", material, fetchFn);

    assert.equal(result.status, "ok");
    assert.equal(result.members![0]!.id, 42);
  });

  it("falls back to display_name when name is missing", async () => {
    const fetchFn = fakeFetch(
      200,
      JSON.stringify([{ id: 3, display_name: "Display Name", role: "viewer" }]),
    );

    const result = await fetchTeamMembers("https://test.substack.com", material, fetchFn);

    assert.equal(result.status, "ok");
    assert.equal(result.members![0]!.name, "Display Name");
  });

  it("filters out items without valid id or name", async () => {
    const fetchFn = fakeFetch(
      200,
      JSON.stringify([
        { id: null, name: "NoId", role: "admin" },
        { name: "", role: "viewer" },
      ]),
    );

    const result = await fetchTeamMembers("https://test.substack.com", material, fetchFn);

    assert.equal(result.status, "ok");
    assert.equal(result.members!.length, 0);
  });
});

describe("redactEmail", () => {
  it("redacts local part while preserving domain", () => {
    assert.equal(redactEmail("alice@example.com"), "a...e@example.com");
  });

  it("handles malformed email-like strings", () => {
    assert.equal(redactEmail("ab"), "**");
  });
});

describe("fetchTeamActivity", () => {
  it("parses activity entries", async () => {
    const result = await fetchTeamActivity(
      "https://test.substack.com",
      material,
      fakeFetch(
        200,
        JSON.stringify({ activities: [{ id: "a1", actor: "Alice", action: "invite" }] }),
      ),
    );

    assert.equal(result.status, "ok");
    assert.equal(result.activities![0]!.action, "invite");
  });

  it("returns not-found when activity endpoints are unavailable", async () => {
    const result = await fetchTeamActivity(
      "https://test.substack.com",
      material,
      fakeFetch(404, JSON.stringify({})),
    );

    assert.equal(result.status, "not-found");
  });
});

describe("team write probes", () => {
  it("validates known roles", () => {
    assert.equal(isValidTeamRole("admin"), true);
    assert.equal(isValidTeamRole("owner"), false);
  });

  it("sends invite payload to the first available endpoint", async () => {
    const capture: { url?: string; body?: string } = {};
    const result = await inviteTeamMember(
      "https://test.substack.com",
      "alice@example.com",
      "editor",
      material,
      captureFetch(200, {}, capture),
    );

    assert.equal(result.status, "ok");
    assert.match(capture.url!, /\/api\/v1\/publication\/users\/invite$/);
    assert.deepEqual(JSON.parse(capture.body!), { email: "alice@example.com", role: "editor" });
  });

  it("rejects invalid role changes before probing endpoints", async () => {
    const result = await changeTeamMemberRole(
      "https://test.substack.com",
      1,
      "owner",
      material,
      captureFetch(200, {}, {}),
    );

    assert.equal(result.status, "schema-drift");
  });

  it("returns not-found for unavailable remove endpoints", async () => {
    const result = await removeTeamMember(
      "https://test.substack.com",
      1,
      material,
      fakeFetch(404, JSON.stringify({})),
    );

    assert.equal(result.status, "not-found");
  });
});
