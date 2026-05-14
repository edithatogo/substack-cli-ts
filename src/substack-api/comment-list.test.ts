import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { materialFromCookieHeader } from "./auth.js";
import { type FetchLike } from "./client.js";
import { fetchCommentsForPost, moderateComment, replyToComment } from "./comment-list.js";

function fakeFetch(status: number, body: string): FetchLike {
  return () =>
    Promise.resolve({
      status,
      text: () => Promise.resolve(body),
    });
}

const material = materialFromCookieHeader(
  "substack.sid=fake-secret",
  "https://test.substack.com",
  "env",
);

describe("fetchCommentsForPost", () => {
  it("returns comments from a valid response", async () => {
    const fetchFn = fakeFetch(
      200,
      JSON.stringify([
        {
          id: 1,
          body: "Great post!",
          author_name: "Alice",
          author_handle: "alice",
          published_at: "2025-01-01T00:00:00Z",
          status: "approved",
          post_id: 100,
        },
        {
          id: 2,
          body: "Thanks for sharing.",
          author_name: "Bob",
          author_handle: "bob",
          published_at: "2025-01-02T00:00:00Z",
          status: "pending",
          post_id: 100,
        },
      ]),
    );

    const result = await fetchCommentsForPost("https://test.substack.com", 100, material, fetchFn);

    assert.equal(result.status, "ok");
    assert.equal(result.comments!.length, 2);
    assert.equal(result.comments![0]!.id, 1);
    assert.equal(result.comments![0]!.body, "Great post!");
    assert.equal(result.comments![0]!.authorName, "Alice");
    assert.equal(result.comments![0]!.authorHandle, "alice");
    assert.equal(result.comments![0]!.publishedAt, "2025-01-01T00:00:00Z");
    assert.equal(result.comments![0]!.status, "approved");
    assert.equal(result.comments![0]!.postId, 100);
    assert.equal(result.comments![1]!.authorName, "Bob");
    assert.match(result.message, /Found 2 comments/);
  });

  it("returns empty comments for empty response", async () => {
    const fetchFn = fakeFetch(200, JSON.stringify([]));

    const result = await fetchCommentsForPost("https://test.substack.com", 100, material, fetchFn);

    assert.equal(result.status, "ok");
    assert.equal(result.comments!.length, 0);
  });

  it("returns schema-drift for non-array response body", async () => {
    const fetchFn = fakeFetch(200, JSON.stringify({ not: "array" }));

    const result = await fetchCommentsForPost("https://test.substack.com", 100, material, fetchFn);

    assert.equal(result.status, "schema-drift");
  });

  it("returns unauthenticated on 401", async () => {
    const fetchFn = fakeFetch(401, JSON.stringify({ error: "unauthorized" }));

    const result = await fetchCommentsForPost("https://test.substack.com", 100, material, fetchFn);

    assert.equal(result.status, "unauthenticated");
  });

  it("returns forbidden on 403", async () => {
    const fetchFn = fakeFetch(403, JSON.stringify({}));

    const result = await fetchCommentsForPost("https://test.substack.com", 100, material, fetchFn);

    assert.equal(result.status, "forbidden");
  });

  it("returns not-found on 404", async () => {
    const fetchFn = fakeFetch(404, JSON.stringify({}));

    const result = await fetchCommentsForPost("https://test.substack.com", 100, material, fetchFn);

    assert.equal(result.status, "not-found");
  });

  it("returns network-error when fetch throws", async () => {
    const fetchFn: FetchLike = () => Promise.reject(new Error("Network failure"));

    const result = await fetchCommentsForPost("https://test.substack.com", 100, material, fetchFn);

    assert.equal(result.status, "network-error");
  });

  it("parses id from string", async () => {
    const fetchFn = fakeFetch(
      200,
      JSON.stringify([
        {
          id: "42",
          body: "Test",
          author_name: "Charlie",
          author_handle: "charlie",
          published_at: "2025-01-01T00:00:00Z",
          status: "approved",
        },
      ]),
    );

    const result = await fetchCommentsForPost("https://test.substack.com", 100, material, fetchFn);

    assert.equal(result.status, "ok");
    assert.equal(result.comments![0]!.id, 42);
  });

  it("applies limit option", async () => {
    const fetchFn = fakeFetch(
      200,
      JSON.stringify([
        {
          id: 1,
          body: "First",
          author_name: "A",
          author_handle: "a",
          published_at: "2025-01-01T00:00:00Z",
          status: "approved",
        },
        {
          id: 2,
          body: "Second",
          author_name: "B",
          author_handle: "b",
          published_at: "2025-01-02T00:00:00Z",
          status: "approved",
        },
        {
          id: 3,
          body: "Third",
          author_name: "C",
          author_handle: "c",
          published_at: "2025-01-03T00:00:00Z",
          status: "approved",
        },
      ]),
    );

    const result = await fetchCommentsForPost("https://test.substack.com", 100, material, fetchFn, {
      limit: 2,
    });

    assert.equal(result.status, "ok");
    assert.equal(result.comments!.length, 2);
    assert.equal(result.comments![0]!.id, 1);
    assert.equal(result.comments![1]!.id, 2);
  });

  it("filters out items without valid id", async () => {
    const fetchFn = fakeFetch(
      200,
      JSON.stringify([
        {
          id: null,
          body: "NoId",
          author_name: "X",
          author_handle: "x",
          published_at: "",
          status: "",
        },
        { body: "MissingId", author_name: "Y", author_handle: "y", published_at: "", status: "" },
      ]),
    );

    const result = await fetchCommentsForPost("https://test.substack.com", 100, material, fetchFn);

    assert.equal(result.status, "ok");
    assert.equal(result.comments!.length, 0);
  });

  it("extracts author name from nested author object", async () => {
    const fetchFn = fakeFetch(
      200,
      JSON.stringify([
        {
          id: 1,
          body: "Nested",
          author: { name: "NestedAuthor", handle: "nested" },
          published_at: "2025-01-01T00:00:00Z",
          status: "approved",
        },
      ]),
    );

    const result = await fetchCommentsForPost("https://test.substack.com", 100, material, fetchFn);

    assert.equal(result.status, "ok");
    assert.equal(result.comments![0]!.authorName, "NestedAuthor");
    assert.equal(result.comments![0]!.authorHandle, "nested");
  });
});

describe("moderateComment", () => {
  it("returns ok on successful approve", async () => {
    const fetchFn = fakeFetch(200, JSON.stringify({ status: "ok" }));

    const result = await moderateComment(
      "https://test.substack.com",
      42,
      "approve",
      material,
      fetchFn,
    );

    assert.equal(result.status, "ok");
    assert.equal(result.action, "approve");
    assert.equal(result.commentId, 42);
    assert.match(result.message, /approve succeeded/);
  });

  it("returns ok on successful delete", async () => {
    const fetchFn = fakeFetch(200, JSON.stringify({}));

    const result = await moderateComment(
      "https://test.substack.com",
      42,
      "delete",
      material,
      fetchFn,
    );

    assert.equal(result.status, "ok");
    assert.equal(result.action, "delete");
    assert.equal(result.commentId, 42);
  });

  it("returns ok on successful pin", async () => {
    const fetchFn = fakeFetch(200, JSON.stringify({}));

    const result = await moderateComment("https://test.substack.com", 42, "pin", material, fetchFn);

    assert.equal(result.status, "ok");
    assert.equal(result.action, "pin");
    assert.equal(result.commentId, 42);
  });

  it("returns failed on 401", async () => {
    const fetchFn = fakeFetch(401, JSON.stringify({ error: "unauthorized" }));

    const result = await moderateComment(
      "https://test.substack.com",
      42,
      "approve",
      material,
      fetchFn,
    );

    assert.equal(result.status, "failed");
    assert.equal(result.action, "approve");
    assert.equal(result.commentId, 42);
  });

  it("returns failed on 403", async () => {
    const fetchFn = fakeFetch(403, JSON.stringify({}));

    const result = await moderateComment(
      "https://test.substack.com",
      42,
      "delete",
      material,
      fetchFn,
    );

    assert.equal(result.status, "failed");
    assert.equal(result.action, "delete");
  });

  it("returns failed on 404", async () => {
    const fetchFn = fakeFetch(404, JSON.stringify({}));

    const result = await moderateComment("https://test.substack.com", 42, "pin", material, fetchFn);

    assert.equal(result.status, "failed");
    assert.equal(result.action, "pin");
  });

  it("returns failed when fetch throws", async () => {
    const fetchFn: FetchLike = () => Promise.reject(new Error("Network failure"));

    const result = await moderateComment(
      "https://test.substack.com",
      42,
      "approve",
      material,
      fetchFn,
    );

    assert.equal(result.status, "failed");
    assert.equal(result.action, "approve");
    assert.equal(result.commentId, 42);
  });
});

describe("replyToComment", () => {
  it("returns ok on successful reply", async () => {
    const fetchFn = fakeFetch(200, JSON.stringify({ id: 99 }));

    const result = await replyToComment(
      "https://test.substack.com",
      42,
      "Thanks for reading!",
      material,
      fetchFn,
    );

    assert.equal(result.status, "ok");
    assert.equal(result.action, "reply");
    assert.equal(result.commentId, 42);
    assert.match(result.message, /Reply posted successfully/);
  });

  it("returns failed on 401", async () => {
    const fetchFn = fakeFetch(401, JSON.stringify({ error: "unauthorized" }));

    const result = await replyToComment(
      "https://test.substack.com",
      42,
      "Reply text",
      material,
      fetchFn,
    );

    assert.equal(result.status, "failed");
    assert.equal(result.action, "reply");
    assert.equal(result.commentId, 42);
  });

  it("returns failed on 403", async () => {
    const fetchFn = fakeFetch(403, JSON.stringify({}));

    const result = await replyToComment(
      "https://test.substack.com",
      42,
      "Reply text",
      material,
      fetchFn,
    );

    assert.equal(result.status, "failed");
    assert.equal(result.action, "reply");
  });

  it("returns failed on 404", async () => {
    const fetchFn = fakeFetch(404, JSON.stringify({}));

    const result = await replyToComment(
      "https://test.substack.com",
      42,
      "Reply text",
      material,
      fetchFn,
    );

    assert.equal(result.status, "failed");
    assert.equal(result.action, "reply");
  });

  it("returns failed when fetch throws", async () => {
    const fetchFn: FetchLike = () => Promise.reject(new Error("Network failure"));

    const result = await replyToComment(
      "https://test.substack.com",
      42,
      "Reply text",
      material,
      fetchFn,
    );

    assert.equal(result.status, "failed");
    assert.equal(result.action, "reply");
    assert.equal(result.commentId, 42);
  });
});
