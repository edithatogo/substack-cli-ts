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
    assert.equal(report.mode, "publish");
    assert.equal(report.filePath, "ready.md");
    assert.deepEqual(report.warnings, []);
  });

  it("produces a ready report for draft mode", async () => {
    const prepared = {
      mode: "draft" as const,
      scheduleAt: undefined,
      post: await parseMarkdownString(
        `---
title: "Draft Post"
---
# Draft Post`,
        "draft.md",
      ),
    };

    const report = prepublishPost(prepared);

    assert.equal(report.status, "ready");
    assert.equal(report.mode, "draft");
    assert.equal(report.filePath, "draft.md");
    assert.deepEqual(report.warnings, []);
  });

  it("includes scheduleAt when present", async () => {
    const prepared = {
      mode: "schedule" as const,
      scheduleAt: "2026-06-15T14:00:00Z",
      post: await parseMarkdownString(
        `---
title: "Scheduled Post"
---
# Scheduled Post`,
        "scheduled.md",
      ),
    };

    const report = prepublishPost(prepared);

    assert.equal(report.status, "ready");
    assert.equal(report.mode, "schedule");
    assert.equal(report.scheduleAt, "2026-06-15T14:00:00Z");
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
        warnings: [],
      },
    };

    const report = prepublishPost(prepared);

    assert.equal(report.status, "blocked");
    assert.equal(report.compatibility.ok, false);
    assert.equal(report.payload, undefined);
    assert.match(report.message, /unsupported Substack payload content/i);
  });

  it("reports blocked with correct file path and mode", () => {
    const prepared = {
      mode: "publish" as const,
      scheduleAt: undefined,
      post: {
        filePath: "bad.md",
        metadata: { tags: [] },
        markdown: "",
        html: "",
        document: {
          type: "doc",
          content: [{ type: "unknownBlockType" }],
        },
        media: {
          assets: [],
          localCount: 0,
          remoteCount: 0,
          dataCount: 0,
        },
        warnings: ["Parser warning"],
      },
    };

    const report = prepublishPost(prepared);

    assert.equal(report.status, "blocked");
    assert.equal(report.mode, "publish");
    assert.equal(report.filePath, "bad.md");
    assert.equal(report.payload, undefined);
    assert.deepEqual(report.warnings, ["Parser warning"]);
  });

  it("blocks prepublish when document contains tableHeader nodes", () => {
    const prepared = {
      mode: "draft" as const,
      scheduleAt: undefined,
      post: {
        filePath: "table-post.md",
        metadata: { title: "Table Post", tags: [] },
        markdown: "",
        html: "",
        document: {
          type: "doc",
          content: [
            {
              type: "table",
              content: [
                {
                  type: "tableRow",
                  content: [
                    {
                      type: "tableHeader",
                      content: [{ type: "paragraph", content: [{ type: "text", text: "Header" }] }],
                    },
                  ],
                },
              ],
            },
          ],
        },
        media: {
          assets: [],
          localCount: 0,
          remoteCount: 0,
          dataCount: 0,
        },
        warnings: [],
      },
    };

    const report = prepublishPost(prepared);

    assert.equal(report.status, "blocked");
    assert.equal(report.editorCompatibility?.primaryEditor.ok, false);
    assert.equal(report.editorCompatibility?.primaryEditor.tableHeaderCount, 1);
    assert.match(report.message, /primary editor rejects tableHeader nodes/i);
    assert.match(report.message, /table normalization/i);
  });
});
