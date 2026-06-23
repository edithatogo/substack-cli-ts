import assert from "node:assert/strict";
import { describe, it } from "vitest";
import {
  SAFE_SURFACE_IDS,
  SAFE_SURFACES,
  buildSafeSurfaceInspectOutput,
  buildSafeSurfaceListOutput,
  buildUnsafeWriteBlockedOutput,
} from "./safe-surfaces.js";

describe("safe frontier surfaces", () => {
  it("lists one surface for every requested safe-boundary track", () => {
    const output = buildSafeSurfaceListOutput();

    assert.equal(output.operation, "coverage.safe-surfaces");
    assert.equal(output.status, "ready");
    assert.equal(output.count, 7);
    assert.deepEqual(
      output.surfaces.map((surface) => surface.id),
      [...SAFE_SURFACE_IDS],
    );
  });

  it("keeps all safe surfaces tied to decisions, options, and manual runbooks", () => {
    for (const surface of SAFE_SURFACES) {
      assert.ok(surface.capabilityIds.length > 0, surface.id);
      assert.ok(surface.existingImplementations.length > 0, surface.id);
      assert.equal(surface.implementationOptions.filter((option) => option.selected).length, 1);
      assert.ok(surface.manualRunbook.length > 0, surface.id);
      assert.ok(surface.endpointCaptureRequirements.length > 0, surface.id);
      assert.ok(surface.blockedOperations.length > 0, surface.id);
      assert.ok(surface.decisionRecord.id.startsWith("DR-"), surface.id);
    }
  });

  it("inspects existing and missing safe surfaces", () => {
    const found = buildSafeSurfaceInspectOutput("publication-admin-writes");
    const missing = buildSafeSurfaceInspectOutput("missing-surface");

    assert.equal(found.status, "ready");
    assert.equal(found.surface?.status, "manual-admin");
    assert.equal(missing.status, "blocked");
    assert.equal(missing.message, "Safe surface ID was not found.");
  });

  it("builds structured blockers for unsafe writes", () => {
    const blocked = buildUnsafeWriteBlockedOutput(
      "integrations-import-crosspost-tokens",
      "api integrations crosspost",
    );

    assert.equal(blocked.status, "blocked");
    assert.equal(blocked.surfaceId, "integrations-import-crosspost-tokens");
    assert.equal(blocked.safetyClass, "credential-sensitive");
    assert.match(blocked.message, /safe endpoint captures/);
    assert.ok(blocked.allowedAlternatives.some((alternative) => alternative.includes("redacted")));
  });

  it("fails closed when an unsafe write references an unregistered surface", () => {
    assert.throws(
      () => buildUnsafeWriteBlockedOutput("missing-surface" as never, "unsafe write"),
      /Safe surface is not registered: missing-surface/,
    );
  });

  it("represents the requested safety classifications", () => {
    const byId = Object.fromEntries(SAFE_SURFACES.map((surface) => [surface.id, surface]));

    assert.equal(byId["native-video-live-automation"]?.status, "planning-only");
    assert.equal(byId["recommendations-boost-probe"]?.status, "probe-only");
    assert.equal(byId["subscriber-import-export-segments"]?.status, "manual-admin");
    assert.equal(byId["analytics-revenue-dashboards"]?.status, "probe-only");
    assert.equal(byId["chat-dm-live-chat"]?.status, "unsupported");
    assert.equal(byId["publication-admin-writes"]?.status, "manual-admin");
    assert.equal(byId["integrations-import-crosspost-tokens"]?.status, "manual-admin");
  });
});
