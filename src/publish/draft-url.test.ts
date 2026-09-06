import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { resolveDraftEditorUrl } from "./draft-url.js";

describe("resolveDraftEditorUrl", () => {
  it("returns the original url if draftId is undefined", () => {
    assert.equal(
      resolveDraftEditorUrl("https://example.substack.com/publish/post", undefined),
      "https://example.substack.com/publish/post",
    );
  });

  it("returns empty string if draftId is undefined and draftUrl is empty", () => {
    assert.equal(resolveDraftEditorUrl("", undefined), "");
  });

  it("returns empty string if draftUrl is empty", () => {
    assert.equal(resolveDraftEditorUrl("", "12345"), "");
  });

  it("returns the original url if it already ends with the draftId", () => {
    assert.equal(
      resolveDraftEditorUrl("https://example.substack.com/publish/post/12345", "12345"),
      "https://example.substack.com/publish/post/12345",
    );
  });

  it("returns the original url if it already ends with the draftId and has trailing slash", () => {
    assert.equal(
      resolveDraftEditorUrl("https://example.substack.com/publish/post/12345/", "12345"),
      "https://example.substack.com/publish/post/12345/",
    );
  });

  it("replaces existing numeric draft ID with the new one", () => {
    assert.equal(
      resolveDraftEditorUrl("https://example.substack.com/publish/post/999", "12345"),
      "https://example.substack.com/publish/post/12345",
    );
  });

  it("appends draftId if it is missing", () => {
    assert.equal(
      resolveDraftEditorUrl("https://example.substack.com/publish/post", "12345"),
      "https://example.substack.com/publish/post/12345",
    );
  });

  it("handles urls with trailing slash", () => {
    assert.equal(
      resolveDraftEditorUrl("https://example.substack.com/publish/post/", "12345"),
      "https://example.substack.com/publish/post/12345",
    );
  });

  it("preserves query parameters and hashes (catch block logic)", () => {
    assert.equal(
      resolveDraftEditorUrl("example.substack.com/publish/post?foo=bar#baz", "12345"),
      "example.substack.com/publish/post/12345?foo=bar#baz",
    );
  });

  it("preserves query parameters and hashes when replacing draftId (catch block logic)", () => {
    assert.equal(
      resolveDraftEditorUrl("example.substack.com/publish/post/999?foo=bar#baz", "12345"),
      "example.substack.com/publish/post/12345?foo=bar#baz",
    );
  });

  it("preserves query parameters and hashes when draftId is already correct (catch block logic)", () => {
    assert.equal(
      resolveDraftEditorUrl("example.substack.com/publish/post/12345?foo=bar#baz", "12345"),
      "example.substack.com/publish/post/12345?foo=bar#baz",
    );
  });
});
