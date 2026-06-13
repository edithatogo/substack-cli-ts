import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { parseMarkdownString } from "../parser/markdown.js";
import { buildPreflightReport, parsePreflightScheduleFile } from "./preflight.js";

describe("buildPreflightReport", () => {
  it("passes a fully specified publish preflight", async () => {
    const prepared = {
      mode: "publish" as const,
      scheduleAt: undefined,
      post: await parseMarkdownString(
        `---
title: "Ready Post"
subtitle: "Ready subtitle"
slug: ready-post
section: essays
tags: [ops]
---
# Ready Post

![Cover](https://example.com/cover.png)

Body text.
`,
        "ready.md",
      ),
    };

    const report = buildPreflightReport(prepared, {
      publicationUrl: "https://rareinsights.substack.com",
      strict: true,
    });

    assert.equal(report.status, "ready");
    assert.equal(report.strict, true);
    assert.equal(report.payload !== undefined, true);
    assert.equal(
      report.checks.every((check) => check.status === "pass"),
      true,
    );
  });

  it("blocks missing publication targets and editorial placeholders", async () => {
    const prepared = {
      mode: "publish" as const,
      scheduleAt: undefined,
      post: await parseMarkdownString(
        `---
title: "Blocked Post"
---
# Blocked Post

TODO: finish this.
`,
        "blocked.md",
      ),
    };

    const report = buildPreflightReport(prepared);

    assert.equal(report.status, "blocked");
    assert.equal(checkStatus(report, "publication-target"), "fail");
    assert.equal(checkStatus(report, "no-editorial-placeholders"), "fail");
    assert.equal(checkStatus(report, "subtitle-present"), "warn");
  });

  it("carries unsupported payload failures into preflight", () => {
    const report = buildPreflightReport(
      {
        mode: "publish",
        scheduleAt: undefined,
        post: {
          filePath: "unsupported.md",
          metadata: { title: "Unsupported", slug: "unsupported", tags: ["ops"] },
          markdown: "# Unsupported",
          html: "<h1>Unsupported</h1>",
          document: { type: "doc", content: [{ type: "unsupportedWidget" }] },
          media: { assets: [], localCount: 0, remoteCount: 0, dataCount: 0 },
          warnings: [],
        },
      },
      { publicationUrl: "https://rareinsights.substack.com" },
    );

    assert.equal(report.status, "blocked");
    assert.equal(checkStatus(report, "payload-printable"), "fail");
    assert.equal(checkStatus(report, "payload-compatible"), "fail");
  });

  it("escalates optional workflow checks in strict mode", async () => {
    const prepared = {
      mode: "publish" as const,
      scheduleAt: undefined,
      post: await parseMarkdownString(
        `---
title: "Strict Post"
slug: Invalid Slug
---
# Strict Post
`,
        "strict.md",
      ),
    };

    const report = buildPreflightReport(prepared, {
      publicationUrl: "https://rareinsights.substack.com",
      strict: true,
    });

    assert.equal(report.status, "blocked");
    assert.equal(checkStatus(report, "subtitle-present"), "fail");
    assert.equal(checkStatus(report, "section-resolved"), "fail");
    assert.equal(checkStatus(report, "tags-resolved"), "fail");
    assert.equal(checkStatus(report, "cover-image-present"), "fail");
    assert.equal(checkStatus(report, "slug-valid"), "fail");
  });

  it("blocks invalid, past, and colliding schedule times", async () => {
    const prepared = {
      mode: "schedule" as const,
      scheduleAt: "2020-01-01T00:00:00Z",
      post: await parseMarkdownString(
        `---
title: "Scheduled Post"
slug: scheduled-post
---
# Scheduled Post
`,
        "scheduled.md",
      ),
    };

    const report = buildPreflightReport(prepared, {
      publicationUrl: "https://rareinsights.substack.com",
      scheduleItems: [
        {
          title: "Other Post",
          sourceFile: "other.md",
          scheduledAt: "2020-01-01T00:00:00Z",
        },
      ],
    });

    assert.equal(report.status, "blocked");
    assert.equal(checkStatus(report, "schedule-time-parseable"), "pass");
    assert.equal(checkStatus(report, "schedule-time-future"), "fail");
    assert.equal(checkStatus(report, "schedule-time-no-collision"), "fail");
  });
});

describe("parsePreflightScheduleFile", () => {
  it("uses schedule reconciliation parsing rules", () => {
    const items = parsePreflightScheduleFile(
      JSON.stringify([{ title: "Post", scheduledAt: "2026-07-01T09:00:00Z" }]),
    );

    assert.equal(items[0]?.title, "Post");
    assert.equal(items[0]?.scheduledAt, "2026-07-01T09:00:00Z");
  });
});

function checkStatus(report: ReturnType<typeof buildPreflightReport>, code: string) {
  return report.checks.find((check) => check.code === code)?.status;
}
