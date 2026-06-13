import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { buildDraftIdInspectionReport } from "./draft-id-inspect.js";
import type { ApiReadInventory } from "./read-model.js";

const baseInventory: ApiReadInventory = {
  status: "ok",
  endpoints: ["/api/v1/drafts"],
  message: "ok",
  drafts: [
    {
      id: 123,
      publicationId: 1,
      draftTitle: "Example Draft",
      title: null,
      draftUpdatedAt: "2026-06-01T00:00:00Z",
      type: "newsletter",
      audience: "everyone",
      sectionId: null,
      sectionName: null,
      sectionSlug: null,
      isPublished: false,
      slug: "example-draft",
      writeCommentPermissions: null,
    },
  ],
  draftHasMore: false,
};

describe("buildDraftIdInspectionReport", () => {
  it("returns the matching draft and editor URL", () => {
    const report = buildDraftIdInspectionReport({
      draftId: "123",
      publicationUrl: "https://rareinsights.substack.com/",
      inventory: baseInventory,
    });

    assert.equal(report.status, "found");
    assert.equal(report.draft?.draftTitle, "Example Draft");
    assert.equal(report.draftUrl, "https://rareinsights.substack.com/publish/post/123");
    assert.equal(report.inspectedDraftCount, 1);
  });

  it("reports a missing draft and suggests raising the window when more drafts exist", () => {
    const report = buildDraftIdInspectionReport({
      draftId: 999,
      publicationUrl: "https://rareinsights.substack.com/",
      inventory: { ...baseInventory, draftHasMore: true },
    });

    assert.equal(report.status, "missing");
    assert.match(report.message, /increase --draft-limit/);
  });

  it("reports a missing draft when the fetched draft inventory is empty", () => {
    const report = buildDraftIdInspectionReport({
      draftId: 999,
      publicationUrl: "https://rareinsights.substack.com/",
      inventory: {
        status: "ok",
        endpoints: ["/api/v1/drafts"],
        message: "ok",
        draftHasMore: false,
      },
    });

    assert.equal(report.status, "missing");
    assert.equal(report.inspectedDraftCount, 0);
    assert.match(report.message, /not found in the current draft inventory/);
  });

  it("reports inventory failures without pretending the draft is absent", () => {
    const report = buildDraftIdInspectionReport({
      draftId: "123",
      publicationUrl: "https://rareinsights.substack.com/",
      inventory: {
        status: "unauthenticated",
        endpoints: [],
        message: "Substack rejected the session as unauthenticated.",
      },
    });

    assert.equal(report.status, "inventory-unavailable");
    assert.match(report.message, /unauthenticated/);
  });
});
