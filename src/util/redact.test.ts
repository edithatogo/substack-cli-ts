import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { redact, redactUrl } from "./redact.js";

describe("redact", () => {
  it("returns null for empty values", () => {
    assert.equal(redact(undefined), null);
    assert.equal(redact(""), null);
  });

  it("fully masks short values", () => {
    assert.equal(redact("secret"), "********");
  });

  it("keeps only the ends of long values", () => {
    assert.equal(redact("abcdefghijklmnop"), "abcd...mnop");
  });
});

describe("redactUrl", () => {
  it("returns null for empty values", () => {
    assert.equal(redactUrl(undefined), null);
    assert.equal(redactUrl(""), null);
  });

  it("redacts uuid-like path segments", () => {
    assert.equal(
      redactUrl("https://example.com/api/123e4567-e89b-12d3-a456-426614174000/details"),
      "https://example.com/api/123e...4000/details",
    );
  });

  it("falls back to value redaction for invalid URLs", () => {
    assert.equal(redactUrl("not a url but long enough"), "not ...ough");
  });
});
