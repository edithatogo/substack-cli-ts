import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it } from "vitest";
import type { ProseMirrorNode } from "../types.js";
import { analyzeEditorCompatibility } from "./analyzer.js";
import {
  AUXILIARY_EDITOR_PROFILE,
  PRIMARY_EDITOR_PROFILE,
  PUBLIC_RENDER_PROFILE,
} from "./profiles.js";

const root = resolve(import.meta.dirname, "../..");
const fixtureDir = resolve(root, "fixtures/prosemirror/editor-compatibility");

function loadDoc(name: string): ProseMirrorNode {
  const content = readFileSync(resolve(fixtureDir, name), "utf8");
  return (JSON.parse(content) as { document: ProseMirrorNode }).document;
}

describe("Editor Compatibility Contract", () => {
  it("maintains strict independence between the five verification facets", () => {
    const richDoc = loadDoc("rich-pilot-control.json");
    const tableDoc = loadDoc("me-001-tables.json");

    const richAssessment = analyzeEditorCompatibility(richDoc, {
      browserVerification: {
        ok: false,
        status: "failed",
        observedAlert: "Something has gone wrong. Please refresh the page and try again.",
      },
    });

    const tableAssessment = analyzeEditorCompatibility(tableDoc, {
      browserVerification: {
        ok: false,
        status: "failed",
        details: "RangeError: Unknown node type: tableHeader",
      },
    });

    // 1. Contract invariant: Public render success does NOT imply primary editor compatibility
    assert.equal(tableAssessment.publicRender.ok, true);
    assert.equal(tableAssessment.primaryEditor.ok, false);

    // 2. Contract invariant: Stored body validity does NOT imply primary editor compatibility
    assert.equal(tableAssessment.storedBodyRoundTrip.ok, true);
    assert.equal(tableAssessment.primaryEditor.ok, false);

    // 3. Contract invariant: Primary editor compatibility does NOT imply auxiliary editor compatibility
    assert.equal(richAssessment.primaryEditor.ok, true);
    assert.equal(richAssessment.auxiliaryEditor.ok, false);
    assert.equal(richAssessment.auxiliaryEditor.riskLevel, "high");

    // 4. Contract invariant: Browser verification state is independent of static checks
    assert.equal(richAssessment.browserVerification?.status, "failed");
    assert.equal(richAssessment.browserVerification?.ok, false);

    // 5. Contract invariant: Incompatible facets are not collapsed into a single status
    assert.notEqual(richAssessment.primaryEditor.status, richAssessment.auxiliaryEditor.riskLevel);
  });

  it("produces deterministic schema fingerprints that detect profile drift", () => {
    assert.equal(typeof PUBLIC_RENDER_PROFILE.schemaFingerprint, "string");
    assert.equal(PUBLIC_RENDER_PROFILE.schemaFingerprint.length, 16);

    assert.equal(typeof PRIMARY_EDITOR_PROFILE.schemaFingerprint, "string");
    assert.equal(PRIMARY_EDITOR_PROFILE.schemaFingerprint.length, 16);

    assert.equal(typeof AUXILIARY_EDITOR_PROFILE.schemaFingerprint, "string");
    assert.equal(AUXILIARY_EDITOR_PROFILE.schemaFingerprint.length, 16);

    // All fingerprints must differ
    assert.notEqual(
      PUBLIC_RENDER_PROFILE.schemaFingerprint,
      PRIMARY_EDITOR_PROFILE.schemaFingerprint,
    );
    assert.notEqual(
      PRIMARY_EDITOR_PROFILE.schemaFingerprint,
      AUXILIARY_EDITOR_PROFILE.schemaFingerprint,
    );
  });
});
