import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { materialFromCookieHeader } from "./auth.js";
import type { FetchLike } from "./client.js";
import {
  buildNoteBatchPlan,
  executeNoteWrite,
  parseNoteScheduleFileContent,
  planNoteWrite,
  validateScheduledNoteContract,
} from "./note-write.js";

function material() {
  return materialFromCookieHeader(
    "substack.sid=fake-long-secret-value",
    "https://rareinsights.substack.com",
    "env",
  );
}

describe("note schedule parsing and planning", () => {
  it("parses note schedule files from array or object shapes", () => {
    const items = parseNoteScheduleFileContent(
      JSON.stringify({
        items: [
          {
            body: "Read the post https://rareinsights.substack.com/p/post.",
            post_url: "https://rareinsights.substack.com/p/post",
            scheduled_at: "2026-07-01T09:00:00Z",
            post_title: "Post",
            file: "notes/post.md",
          },
        ],
      }),
    );
    const arrayItems = parseNoteScheduleFileContent(
      JSON.stringify([
        { note: "Text", url: "https://example.com/p/1", at: "2026-07-02T09:00:00Z" },
      ]),
    );
    const numericItems = parseNoteScheduleFileContent(
      JSON.stringify([{ text: "Text", postUrl: "https://example.com/p/2", title: 123 }]),
    );

    assert.equal(items[0]?.text, "Read the post https://rareinsights.substack.com/p/post.");
    assert.equal(items[0]?.postUrl, "https://rareinsights.substack.com/p/post");
    assert.equal(items[0]?.textFile, "notes/post.md");
    assert.equal(arrayItems[0]?.scheduledAt, "2026-07-02T09:00:00Z");
    assert.equal(numericItems[0]?.title, "123");
  });

  it("rejects malformed schedule files", () => {
    assert.throws(() => parseNoteScheduleFileContent("{"), /Could not parse/);
    assert.throws(() => parseNoteScheduleFileContent(JSON.stringify({ notes: [] })), /items array/);
    assert.throws(
      () => parseNoteScheduleFileContent(JSON.stringify(["note"])),
      /must be an object/,
    );
  });

  it("blocks scheduled notes that violate the covering-note contract", () => {
    const issues = validateScheduledNoteContract({
      text: "One.Two.Three.Four.",
      postUrl: "https://rareinsights.substack.com/p/post",
      scheduledAt: "soon",
    });

    assert.deepEqual(
      issues.map((issue) => issue.code),
      ["post-url-not-mentioned", "too-many-sentences", "invalid-scheduled-at"],
    );
  });

  it("reports empty text and missing post URLs as contract issues", () => {
    const issues = validateScheduledNoteContract({
      text: "   ",
      scheduledAt: "2026-07-01T09:00:00Z",
    });

    assert.deepEqual(
      issues.map((issue) => issue.code),
      ["empty-note", "missing-post-url"],
    );
  });

  it("builds batch plans with skips, limits, and contract issues", () => {
    const plan = buildNoteBatchPlan({
      selectorSourceFile: "notes.json",
      limit: 2,
      items: [
        {
          text: "Read https://rareinsights.substack.com/p/a.",
          postUrl: "https://rareinsights.substack.com/p/a",
          scheduledAt: "2026-07-01T09:00:00Z",
        },
        {
          text: "Already scheduled https://rareinsights.substack.com/p/b.",
          postUrl: "https://rareinsights.substack.com/p/b",
          scheduledAt: "2026-07-02T09:00:00Z",
          status: "scheduled",
        },
        {
          text: "Missing link.",
          postUrl: "https://rareinsights.substack.com/p/c",
          scheduledAt: "2026-07-03T09:00:00Z",
        },
      ],
    });

    assert.equal(plan.status, "blocked");
    assert.equal(plan.items.length, 2);
    assert.equal(plan.skipped.length, 1);
    assert.equal(plan.issues.length, 1);
    assert.equal(plan.issues[0]?.issues[0]?.code, "post-url-not-mentioned");
  });
});

describe("note write planning and execution", () => {
  it("plans create requests using the Substack note body shape", () => {
    const plan = planNoteWrite("https://rareinsights.substack.com", "create", "Hello note.");
    const requestBody = plan.requestBody as {
      bodyJson: { content: Array<{ content: Array<{ text: string }> }> };
    };

    assert.equal(plan.endpoint, "https://rareinsights.substack.com/comment/feed/");
    assert.equal(requestBody.bodyJson.content[0]?.content[0]?.text, "Hello note.");
  });

  it("plans schedule requests with scheduled_at", () => {
    const plan = planNoteWrite("https://rareinsights.substack.com", "schedule", "Hello.", {
      scheduledAt: "2026-07-01T09:00:00Z",
    });

    assert.equal(plan.requestBody.scheduled_at, "2026-07-01T09:00:00Z");
  });

  it("executes writes and extracts note IDs", async () => {
    let capturedBody = "";
    const fetchImpl: FetchLike = (_url, init) => {
      capturedBody = String(init?.body);
      return Promise.resolve({
        status: 200,
        text: () => Promise.resolve(JSON.stringify({ id: 123, date: "2026-07-01T09:00:00Z" })),
      });
    };
    const plan = planNoteWrite("https://rareinsights.substack.com", "create", "Hello.");

    const result = await executeNoteWrite(plan, material(), fetchImpl);

    assert.equal(result.status, "created");
    assert.equal(result.noteId, "123");
    assert.match(capturedBody, /Hello/);
  });

  it("handles successful writes without response identifiers", async () => {
    const fetchImpl: FetchLike = () =>
      Promise.resolve({ status: 200, text: () => Promise.resolve("{}") });
    const plan = planNoteWrite("https://rareinsights.substack.com", "schedule", "Hello.", {
      scheduledAt: "2026-07-01T09:00:00Z",
    });

    const result = await executeNoteWrite(plan, material(), fetchImpl);

    assert.equal(result.status, "scheduled");
    assert.equal(result.noteId, undefined);
    assert.equal(result.publishedAt, undefined);
  });

  it("handles create success without response identifiers", async () => {
    const fetchImpl: FetchLike = () =>
      Promise.resolve({ status: 200, text: () => Promise.resolve("{}") });
    const plan = planNoteWrite("https://rareinsights.substack.com", "create", "Hello.");

    const result = await executeNoteWrite(plan, material(), fetchImpl);

    assert.equal(result.status, "created");
    assert.equal(result.message, "Note published.");
  });

  it("reports failed writes", async () => {
    const fetchImpl: FetchLike = () =>
      Promise.resolve({ status: 403, text: () => Promise.resolve("{}") });
    const plan = planNoteWrite("https://rareinsights.substack.com", "schedule", "Hello.", {
      scheduledAt: "2026-07-01T09:00:00Z",
    });

    const result = await executeNoteWrite(plan, material(), fetchImpl);

    assert.equal(result.status, "failed");
    assert.equal(result.error, "HTTP 403");
  });

  it("reports network write failures", async () => {
    const fetchImpl: FetchLike = () => Promise.reject(new Error("offline"));
    const plan = planNoteWrite("https://rareinsights.substack.com", "create", "Hello.");

    const result = await executeNoteWrite(plan, material(), fetchImpl);

    assert.equal(result.status, "failed");
    assert.equal(result.error, "Network error");
  });
});
