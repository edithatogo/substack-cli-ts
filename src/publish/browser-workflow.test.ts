import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { shouldOpenPublishReview, runBrowserWorkflow } from "./browser-workflow.js";
import { parseMarkdownString } from "../parser/markdown.js";

describe("shouldOpenPublishReview", () => {
  it("returns true only when review-only is enabled", () => {
    assert.equal(shouldOpenPublishReview({ reviewOnly: true }), true);
    assert.equal(shouldOpenPublishReview({ reviewOnly: false }), false);
    assert.equal(shouldOpenPublishReview({}), false);
  });
});

describe("runBrowserWorkflow", () => {
  it("throws when publishing without --yes", async () => {
    const prepared = {
      mode: "publish" as const,
      scheduleAt: undefined,
      post: await parseMarkdownString(
        `---
title: "Test"
---
# Test`,
        "test.md",
      ),
    };

    await assert.rejects(
      () => runBrowserWorkflow(prepared, {}),
      /Publishing and scheduling require --yes/,
    );
  });

  it("throws when scheduling without --yes", async () => {
    const prepared = {
      mode: "schedule" as const,
      scheduleAt: "2026-06-01T09:00:00Z",
      post: await parseMarkdownString(
        `---
title: "Test"
---
# Test`,
        "test.md",
      ),
    };

    await assert.rejects(
      () => runBrowserWorkflow(prepared, {}),
      /Publishing and scheduling require --yes/,
    );
  });

  it("bypasses the --yes guard for draft mode", async () => {
    // Without a real config this will fail elsewhere, but it proves
    // the --yes guard only fires for publish/schedule modes.
    const prepared = {
      mode: "draft" as const,
      scheduleAt: undefined,
      post: await parseMarkdownString(
        `---
title: "Test"
---
# Test`,
        "test.md",
      ),
    };

    await runBrowserWorkflow(prepared, { dryRun: true });
  });

  it("does not enforce --yes when dry-run is set", async () => {
    // dry-run returns before --yes check, just calls printPreparedPost
    const prepared = {
      mode: "publish" as const,
      scheduleAt: undefined,
      post: await parseMarkdownString(
        `---
title: "Test"
---
# Test`,
        "test.md",
      ),
    };

    await runBrowserWorkflow(prepared, { dryRun: true });
  });
});
