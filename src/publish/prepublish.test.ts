import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { parseMarkdownString } from "../parser/markdown.js";
import { prepublishPost } from "./prepublish.js";

describe("prepublishPost", () => {
  it("produces a ready prepublish report for supported content", async () => {
    const prepared = {
      mode: "publish" as const,
      scheduleAt: undefined,
      post: await parseMarkdownString(
        `---
title: "Publish Ready"
tags: [api]
---
# Publish Ready

Hello **world**.
`,
        "ready.md",
      ),
    };

    const report = prepublishPost(prepared);

    assert.equal(report.status, "ready");
    assert.equal(report.title, "Publish Ready");
    assert.equal(report.payload?.title, "Publish Ready");
    assert.equal(report.compatibility.ok, true);
  });

  it("blocks unsupported content before publishing", () => {
    const prepared = {
      mode: "schedule" as const,
      scheduleAt: "2026-05-01T09:00:00Z",
      post: {
        filePath: "blocked.md",
        metadata: { tags: [] },
        markdown: "",
        html: "",
        document: {
          type: "doc",
          content: [{ type: "unsupportedWidget" }],
        },
        media: {
          assets: [],
          localCount: 0,
          remoteCount: 0,
          dataCount: 0,
        },
      },
    };

    const report = prepublishPost(prepared);

    assert.equal(report.status, "blocked");
    assert.equal(report.compatibility.ok, false);
    assert.equal(report.payload, undefined);
    assert.match(report.message, /unsupported Substack payload content/i);
  });
});
