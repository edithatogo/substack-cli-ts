import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "vitest";
import type { ProseMirrorNode } from "../types.js";
import { generateMinimalUpstreamReproductionPackage, runDisposableEditorCanary } from "./canary.js";

const sampleDoc: ProseMirrorNode = {
  type: "doc",
  content: [
    {
      type: "paragraph",
      content: [{ type: "text", text: "Canary sample" }],
    },
  ],
};

describe("Disposable Canary and Upstream Escalation", () => {
  it("enforces no-email, no-publication, and isolated scope invariants", async () => {
    const receipt = await runDisposableEditorCanary(sampleDoc, {
      publicationUrl: "https://example.substack.com",
      targetDraftId: "test-draft-999",
    });

    assert.equal(receipt.status, "verified");
    assert.equal(receipt.invariantsSatisfied.noEmailSent, true);
    assert.equal(receipt.invariantsSatisfied.noPublicPublication, true);
    assert.equal(receipt.invariantsSatisfied.isolatedDraftScope, true);
    assert.equal(receipt.cleanupState.cleanedUp, true);
    assert.equal(receipt.runtimeObservations.tiptapErrorDetected, false);
    assert.equal(receipt.runtimeObservations.mountedEditorsCount, 1);
    assert.equal(receipt.runtimeObservations.domDuplicationDetected, false);
  });

  it("captures runtime errors, duplicate editor mounting, and DOM escalation", async () => {
    const receipt = await runDisposableEditorCanary(sampleDoc, {
      publicationUrl: "https://example.substack.com",
      targetDraftId: "test-draft-999",
      simulatedConsoleErrors: [
        "Editor content error encountered: [tiptap error]: Invalid JSON content",
        "RangeError: Unknown node type: tableHeader",
      ],
      simulatedAlert: "Something has gone wrong. Please refresh the page and try again.",
    });

    assert.equal(receipt.status, "failed");
    assert.equal(receipt.runtimeObservations.tiptapErrorDetected, true);
    assert.equal(receipt.runtimeObservations.mountedEditorsCount, 2);
    assert.equal(receipt.runtimeObservations.domDuplicationDetected, true);
    assert.equal(receipt.cleanupState.cleanedUp, true);
    assert.match(
      receipt.assessment.browserVerification?.observedAlert ?? "",
      /Something has gone wrong/,
    );
  });

  it("generates clean minimal upstream escalation reproduction package", async () => {
    const tempDir = await mkdtemp(join(tmpdir(), "substack-repro-package-"));
    try {
      const result = await generateMinimalUpstreamReproductionPackage(tempDir);
      assert.equal(result.files.length, 3);

      const readme = await readFile(join(tempDir, "README.md"), "utf8");
      assert.match(readme, /Unknown node type: tableHeader/);
      assert.match(readme, /Invalid JSON content/);

      const tableRepro = await readFile(join(tempDir, "reproduction-table-header.json"), "utf8");
      const parsedTable = JSON.parse(tableRepro) as { document: ProseMirrorNode };
      assert.equal(parsedTable.document.type, "doc");

      const richRepro = await readFile(join(tempDir, "reproduction-rich-auxiliary.json"), "utf8");
      const parsedRich = JSON.parse(richRepro) as { document: ProseMirrorNode };
      assert.equal(parsedRich.document.type, "doc");
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });
});
