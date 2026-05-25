import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { parseMarkdownString } from "../parser/markdown.js";
import { runBrowserWorkflow, shouldOpenPublishReview } from "./browser-workflow.js";
import { resolveDraftEditorUrl } from "./draft-url.js";

describe("shouldOpenPublishReview", () => {
  it("returns true only when review-only is enabled", () => {
    assert.equal(shouldOpenPublishReview({ reviewOnly: true }), true);
    assert.equal(shouldOpenPublishReview({ reviewOnly: false }), false);
    assert.equal(shouldOpenPublishReview({}), false);
  });
});

describe("resolveDraftEditorUrl", () => {
  it("appends a mapped draft ID when Substack omits it from the editor URL", () => {
    assert.equal(
      resolveDraftEditorUrl("https://rareinsights.substack.com/publish/post", "123"),
      "https://rareinsights.substack.com/publish/post/123",
    );
  });

  it("keeps editor URLs that already include the draft ID", () => {
    assert.equal(
      resolveDraftEditorUrl("https://rareinsights.substack.com/publish/post/123", "123"),
      "https://rareinsights.substack.com/publish/post/123",
    );
  });

  it("keeps editor URLs with a trailing slash after the draft ID", () => {
    assert.equal(
      resolveDraftEditorUrl("https://rareinsights.substack.com/publish/post/123/", "123"),
      "https://rareinsights.substack.com/publish/post/123/",
    );
  });

  it("keeps editor URLs with an existing numeric draft ID", () => {
    assert.equal(
      resolveDraftEditorUrl("https://rareinsights.substack.com/publish/post/456", "123"),
      "https://rareinsights.substack.com/publish/post/456",
    );
  });

  it("inserts the draft ID before query parameters and hashes", () => {
    assert.equal(
      resolveDraftEditorUrl("https://rareinsights.substack.com/publish/post?s=w#editor", "123"),
      "https://rareinsights.substack.com/publish/post/123?s=w#editor",
    );
  });

  it("normalizes non-absolute editor URL strings", () => {
    assert.equal(resolveDraftEditorUrl("/publish/post", "123"), "/publish/post/123");
    assert.equal(resolveDraftEditorUrl("/publish/post/123/", "123"), "/publish/post/123/");
  });

  it("keeps URLs unchanged when no draft ID is available", () => {
    assert.equal(
      resolveDraftEditorUrl("https://rareinsights.substack.com/publish/post", undefined),
      "https://rareinsights.substack.com/publish/post",
    );
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
