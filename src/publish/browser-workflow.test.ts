import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { shouldOpenPublishReview } from "./browser-workflow.js";

describe("shouldOpenPublishReview", () => {
  it("returns true only when review-only is enabled", () => {
    assert.equal(shouldOpenPublishReview({ reviewOnly: true }), true);
    assert.equal(shouldOpenPublishReview({ reviewOnly: false }), false);
    assert.equal(shouldOpenPublishReview({}), false);
  });
});
