import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { redact, redactUrl, sanitizeStructured } from "./redact.js";

describe("redact", () => {
  it("returns null for empty values", () => {
    assert.equal(redact(undefined), null);
    assert.equal(redact(""), null);
  });

  it("fully masks values without retaining identifying fragments", () => {
    assert.equal(redact("secret"), "[REDACTED]");
    assert.equal(redact("abcdefghijklmnop"), "[REDACTED]");
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
      "https://example.com/api/[REDACTED]/details",
    );
  });

  it("falls back to value redaction for invalid URLs", () => {
    assert.equal(redactUrl("not a url but long enough"), "[REDACTED]");
  });
});

describe("sanitizeStructured", () => {
  it("redacts sensitive keys recursively before serialization", () => {
    assert.deepEqual(
      sanitizeStructured({
        nested: { authorization: "Bearer live-token", profile: { email: "a@example.com" } },
      }),
      { nested: { authorization: "[REDACTED]", profile: { email: "[REDACTED]" } } },
    );
  });

  it("redacts embedded bearer and assignment secrets in diagnostic text", () => {
    assert.equal(
      sanitizeStructured("request failed: Bearer abc123 token=def456"),
      "request failed: Bearer [REDACTED] token=[REDACTED]",
    );
  });

  it("bounds circular diagnostic structures", () => {
    const diagnostic: Record<string, unknown> = {};
    diagnostic.self = diagnostic;
    assert.deepEqual(sanitizeStructured(diagnostic), { self: "[CIRCULAR]" });
  });

  it("handles every structured diagnostic boundary without leaking", () => {
    assert.equal(sanitizeStructured(undefined), undefined);
    assert.equal(sanitizeStructured(null), null);
    assert.equal(sanitizeStructured("visible", "token"), "[REDACTED]");
    assert.deepEqual(sanitizeStructured([{ password: "live" }, 7]), [
      { password: "[REDACTED]" },
      7,
    ]);
    assert.deepEqual(sanitizeStructured(new Error("Bearer live-token")), {
      name: "Error",
      message: "Bearer [REDACTED]",
    });
    assert.equal(
      sanitizeStructured(new Date("2026-08-10T00:00:00.000Z")),
      "2026-08-10T00:00:00.000Z",
    );
    assert.equal(sanitizeStructured(new Map([["token", "live"]])), "[REDACTED OBJECT]");
    assert.equal(
      sanitizeStructured(
        "https://example.com/session/123e4567-e89b-12d3-a456-426614174000?q=secret",
        "url",
      ),
      "https://example.com/session/[REDACTED]",
    );
    assert.equal(sanitizeStructured(true), true);

    const nullPrototype = Object.create(null) as Record<string, unknown>;
    nullPrototype.cookie = "live";
    assert.deepEqual(sanitizeStructured(nullPrototype), { cookie: "[REDACTED]" });
  });
});
