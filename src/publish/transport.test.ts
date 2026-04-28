import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { resolveTransport } from "./transport.js";

describe("resolveTransport", () => {
  it("selects the browser workflow for auto transport", () => {
    const transport = resolveTransport("auto");

    assert.equal(transport.requested, "auto");
    assert.equal(transport.selected, "browser");
    assert.equal(
      transport.fallbackReason,
      "API transport is unavailable, so the browser workflow was selected.",
    );
  });

  it("selects the browser workflow when explicitly requested", () => {
    const transport = resolveTransport("browser");

    assert.equal(transport.requested, "browser");
    assert.equal(transport.selected, "browser");
    assert.equal(transport.fallbackReason, undefined);
  });

  it("rejects explicit api transport for live operations", () => {
    assert.throws(
      () => resolveTransport("api"),
      /API transport is not enabled/,
    );
  });
});
