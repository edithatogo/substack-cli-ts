import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { resolveTransport } from "./transport.js";

describe("resolveTransport", () => {
  it("selects the browser workflow for auto transport", () => {
    const transport = resolveTransport("auto");

    assert.equal(transport.requested, "auto");
    assert.equal(transport.selected, "browser");
    assert.ok(transport.fallbackReason?.includes("--transport api"));
  });

  it("selects the browser workflow when explicitly requested", () => {
    const transport = resolveTransport("browser");

    assert.equal(transport.requested, "browser");
    assert.equal(transport.selected, "browser");
    assert.equal(transport.fallbackReason, undefined);
  });

  it("selects the api transport when explicitly requested", () => {
    const transport = resolveTransport("api");

    assert.equal(transport.requested, "api");
    assert.equal(transport.selected, "api");
    assert.equal(transport.fallbackReason, undefined);
  });
});
