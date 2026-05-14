import assert from "node:assert/strict";
import { describe, it, vi } from "vitest";
import { materialFromCookieHeader } from "./auth.js";
import { createSubstackClient } from "./substack-adapter.js";
import { type FetchLike } from "./client.js";

vi.mock("./substack-adapter.js", () => ({
  createSubstackClient: vi.fn(),
}));

const { listNotes, getNote, createNote, deleteNote, likeNote, reshareNote } = await import(
  "./notes.js"
);

function material() {
  return materialFromCookieHeader(
    "substack.sid=fake-long-secret-value",
    "https://rareinsights.substack.com",
    "env",
  );
}

function fakeFetch(status: number, body: string): FetchLike {
  return () =>
    Promise.resolve({
      status,
      text: () => Promise.resolve(body),
    });
}

function asyncIterable<T>(items: T[]): AsyncIterable<T> {
  return {
    [Symbol.asyncIterator]() {
      let i = 0;
      return {
        next() {
          if (i < items.length) {
            return Promise.resolve({ value: items[i++] as T, done: false });
          }
          return Promise.resolve({ value: undefined, done: true });
        },
      };
    },
  };
}

function mockClient(overrides?: Record<string, unknown>) {
  return {
    ownProfile: vi.fn(),
    noteForId: vi.fn(),
    ...overrides,
  };
}

describe("listNotes", () => {
  it("returns note summaries from own profile notes", async () => {
    const client = mockClient();
    client.ownProfile.mockResolvedValue({
      notes: vi.fn().mockReturnValue(
        asyncIterable([
          {
            id: "note-1",
            body: "First note",
            author: { name: "Author One" },
            publishedAt: new Date("2026-01-15T10:00:00Z"),
            likesCount: 5,
          },
          {
            id: "note-2",
            body: "Second note",
            author: { name: "Author Two" },
            publishedAt: new Date("2026-02-20T14:30:00Z"),
            likesCount: 12,
          },
        ]),
      ),
    });
    vi.mocked(createSubstackClient).mockReturnValue(client as never);

    const notes = await listNotes(material(), 10);

    assert.equal(notes.length, 2);
    assert.equal(notes[0]?.id, "note-1");
    assert.equal(notes[0]?.body, "First note");
    assert.equal(notes[0]?.author, "Author One");
    assert.equal(notes[0]?.publishedAt, "2026-01-15T10:00:00.000Z");
    assert.equal(notes[0]?.likesCount, 5);
    assert.equal(notes[1]?.id, "note-2");
    assert.equal(notes[1]?.body, "Second note");
    assert.equal(notes[1]?.author, "Author Two");
    assert.equal(notes[1]?.likesCount, 12);
  });

  it("passes limit parameter to notes iterator", async () => {
    const client = mockClient();
    const notesFn = vi.fn().mockReturnValue(asyncIterable([]));
    client.ownProfile.mockResolvedValue({ notes: notesFn });
    vi.mocked(createSubstackClient).mockReturnValue(client as never);

    await listNotes(material(), 5);

    assert.equal(notesFn.mock.calls[0]?.[0]?.limit, 5);
  });

  it("defaults to limit of 10", async () => {
    const client = mockClient();
    const notesFn = vi.fn().mockReturnValue(asyncIterable([]));
    client.ownProfile.mockResolvedValue({ notes: notesFn });
    vi.mocked(createSubstackClient).mockReturnValue(client as never);

    await listNotes(material());

    assert.equal(notesFn.mock.calls[0]?.[0]?.limit, 10);
  });

  it("propagates errors from ownProfile", async () => {
    const client = mockClient();
    client.ownProfile.mockRejectedValue(new Error("Network failure"));
    vi.mocked(createSubstackClient).mockReturnValue(client as never);

    await assert.rejects(listNotes(material()), /Network failure/);
  });
});

describe("getNote", () => {
  it("returns note detail for a given id", async () => {
    const client = mockClient();
    client.noteForId.mockResolvedValue({
      id: "note-detail-1",
      body: "Detailed note body",
      author: {
        id: 42,
        name: "Author Name",
        handle: "@author",
        avatarUrl: "https://example.com/avatar.png",
      },
      publishedAt: new Date("2026-03-10T08:00:00Z"),
      likesCount: 27,
    });
    vi.mocked(createSubstackClient).mockReturnValue(client as never);

    const note = await getNote(material(), 1);

    assert.equal(note.id, "note-detail-1");
    assert.equal(note.body, "Detailed note body");
    assert.deepEqual(note.author, {
      id: 42,
      name: "Author Name",
      handle: "@author",
      avatarUrl: "https://example.com/avatar.png",
    });
    assert.equal(note.publishedAt, "2026-03-10T08:00:00.000Z");
    assert.equal(note.likesCount, 27);
  });

  it("propagates errors from noteForId", async () => {
    const client = mockClient();
    client.noteForId.mockRejectedValue(new Error("Note not found"));
    vi.mocked(createSubstackClient).mockReturnValue(client as never);

    await assert.rejects(getNote(material(), 999), /Note not found/);
  });
});

describe("createNote", () => {
  it("returns id and publishedAt from published note", async () => {
    const client = mockClient();
    const publishFn = vi.fn().mockResolvedValue({ id: 789, date: "2026-04-01T12:00:00Z" });
    const textFn = vi.fn().mockReturnValue({ publish: publishFn });
    const paragraphFn = vi.fn().mockReturnValue({ text: textFn });
    const newNoteFn = vi.fn().mockReturnValue({ paragraph: paragraphFn });
    client.ownProfile.mockResolvedValue({ newNote: newNoteFn });
    vi.mocked(createSubstackClient).mockReturnValue(client as never);

    const result = await createNote(material(), "My new note body");

    assert.equal(result.id, 789);
    assert.equal(result.publishedAt, "2026-04-01T12:00:00Z");
    assert.equal(newNoteFn.mock.calls.length, 1);
    assert.equal(textFn.mock.calls[0]?.[0], "My new note body");
  });

  it("propagates errors from publish", async () => {
    const client = mockClient();
    const publishFn = vi.fn().mockRejectedValue(new Error("Publish denied"));
    const textFn = vi.fn().mockReturnValue({ publish: publishFn });
    const paragraphFn = vi.fn().mockReturnValue({ text: textFn });
    const newNoteFn = vi.fn().mockReturnValue({ paragraph: paragraphFn });
    client.ownProfile.mockResolvedValue({ newNote: newNoteFn });
    vi.mocked(createSubstackClient).mockReturnValue(client as never);

    await assert.rejects(createNote(material(), "bad"), /Publish denied/);
  });
});

describe("deleteNote", () => {
  it("sends DELETE and returns status on success", async () => {
    const result = await deleteNote(material(), 42, fakeFetch(200, "{}"));
    assert.equal(result.status, 200);
  });

  it("returns status on not-found response", async () => {
    const result = await deleteNote(material(), 999, fakeFetch(404, "{}"));
    assert.equal(result.status, 404);
  });

  it("returns status 0 when fetch throws", async () => {
    const failingFetch: FetchLike = () => Promise.reject(new Error("Network failure"));
    const result = await deleteNote(material(), 1, failingFetch);
    assert.equal(result.status, 0);
  });

  it("targets the correct URL", async () => {
    let capturedUrl = "";
    const urlCapturingFetch: FetchLike = (url) => {
      capturedUrl = url;
      return Promise.resolve({ status: 200, text: () => Promise.resolve("{}") });
    };
    await deleteNote(material(), 42, urlCapturingFetch);
    assert.equal(capturedUrl, "https://rareinsights.substack.com/api/v1/notes/42");
  });
});

describe("likeNote", () => {
  it("calls like on the note returned by noteForId", async () => {
    const likeFn = vi.fn().mockResolvedValue(undefined);
    const client = mockClient();
    client.noteForId.mockResolvedValue({
      id: "note-like-1",
      body: "Note to like",
      author: { id: 1, name: "Author", handle: "@author", avatarUrl: "" },
      publishedAt: new Date("2026-01-01T00:00:00Z"),
      likesCount: 0,
      like: likeFn,
    });
    vi.mocked(createSubstackClient).mockReturnValue(client as never);

    await likeNote(material(), 1);

    assert.equal(client.noteForId.mock.calls[0]?.[0], 1);
    assert.equal(likeFn.mock.calls.length, 1);
  });

  it("propagates errors from noteForId", async () => {
    const client = mockClient();
    client.noteForId.mockRejectedValue(new Error("Note not found"));
    vi.mocked(createSubstackClient).mockReturnValue(client as never);

    await assert.rejects(likeNote(material(), 999), /Note not found/);
  });

  it("propagates errors from like", async () => {
    const likeFn = vi.fn().mockRejectedValue(new Error("Like failed"));
    const client = mockClient();
    client.noteForId.mockResolvedValue({
      id: "note-like-2",
      body: "Note",
      author: { id: 1, name: "Author", handle: "@author", avatarUrl: "" },
      publishedAt: new Date("2026-01-01T00:00:00Z"),
      likesCount: 0,
      like: likeFn,
    });
    vi.mocked(createSubstackClient).mockReturnValue(client as never);

    await assert.rejects(likeNote(material(), 1), /Like failed/);
  });
});

describe("reshareNote", () => {
  it("sends POST and returns status on success", async () => {
    const result = await reshareNote(material(), 42, fakeFetch(200, "{}"));
    assert.equal(result.status, 200);
  });

  it("returns status on not-found response", async () => {
    const result = await reshareNote(material(), 999, fakeFetch(404, "{}"));
    assert.equal(result.status, 404);
  });

  it("returns status 0 when fetch throws", async () => {
    const failingFetch: FetchLike = () => Promise.reject(new Error("Network failure"));
    const result = await reshareNote(material(), 1, failingFetch);
    assert.equal(result.status, 0);
  });

  it("targets the correct URL", async () => {
    let capturedUrl = "";
    const urlCapturingFetch: FetchLike = (url) => {
      capturedUrl = url;
      return Promise.resolve({ status: 200, text: () => Promise.resolve("{}") });
    };
    await reshareNote(material(), 42, urlCapturingFetch);
    assert.equal(capturedUrl, "https://rareinsights.substack.com/api/v1/notes/42/reshare");
  });
});
