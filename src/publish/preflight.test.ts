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
previewText: "A concise preview that fits email client inbox snippets for readers."
canonicalUrl: https://rareinsights.substack.com/p/ready-post
socialImage: https://example.com/cover.png
campaign: ready-post
audience: everyone
---
# Ready Post

![Cover](https://example.com/cover.png)

[Body link](https://example.com/?utm_source=newsletter&utm_medium=email&utm_campaign=ready-post)
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

  it("flags deliverability and compliance gaps", async () => {
    const prepared = {
      mode: "publish" as const,
      scheduleAt: undefined,
      post: await parseMarkdownString(
        `---
title: "${"Long ".repeat(25)}"
canonicalUrl: not-a-url
socialImage: ftp://example.com/social.png
---
# Deliverability

![missing alt](https://example.com/image.png)

[Bad link](ftp://example.com/file)
`,
        "deliverability.md",
      ),
    };

    prepared.post.media.assets[0]!.alt = "";
    const report = buildPreflightReport(prepared, {
      publicationUrl: "https://rareinsights.substack.com",
      strict: true,
    });

    assert.equal(report.status, "blocked");
    assert.equal(checkStatus(report, "subject-length"), "fail");
    assert.equal(checkStatus(report, "preview-text-present"), "fail");
    assert.equal(checkStatus(report, "canonical-url-valid"), "fail");
    assert.equal(checkStatus(report, "social-image-valid"), "fail");
    assert.equal(checkStatus(report, "image-alt-text"), "fail");
    assert.equal(checkStatus(report, "links-http-valid"), "fail");
    assert.equal(checkStatus(report, "utm-present"), "fail");
  });

  it("allows relative, anchor, and mailto markdown links while still blocking unsafe schemes", async () => {
    const valid = buildPreflightReport(
      {
        mode: "publish",
        scheduleAt: undefined,
        post: await parseMarkdownString(
          `---
title: "Relative Links"
---
# Relative Links

[Relative](/archive)
[Sibling](./next)
[Parent](../previous)
[Bare](relative-page)
[Anchor](#section)
[Mail](mailto:editor@example.com)
<a href="/html-link">HTML link</a>
<a href="//example.com/protocol-relative">Protocol relative</a>
`,
          "relative-links.md",
        ),
      },
      { publicationUrl: "https://rareinsights.substack.com" },
    );
    const invalid = buildPreflightReport(
      {
        mode: "publish",
        scheduleAt: undefined,
        post: await parseMarkdownString(
          `---
title: "Unsafe Link"
---
# Unsafe Link

[Bad](javascript:alert(1))
[Also bad](foo:bar)
`,
          "unsafe-link.md",
        ),
      },
      { publicationUrl: "https://rareinsights.substack.com" },
    );

    assert.notEqual(checkStatus(valid, "links-http-valid"), "fail");
    assert.equal(checkStatus(invalid, "links-http-valid"), "fail");
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

  it("uses a singular blocked message for one failed check", async () => {
    const prepared = {
      mode: "publish" as const,
      scheduleAt: undefined,
      post: await parseMarkdownString(
        `---
title: "Almost Ready"
subtitle: "Ready subtitle"
slug: almost-ready
section: essays
tags: [ops]
previewText: "A concise preview that fits email client inbox snippets for readers."
canonicalUrl: https://rareinsights.substack.com/p/almost-ready
socialImage: https://example.com/cover.png
campaign: almost-ready
audience: everyone
---
# Almost Ready

![Cover](https://example.com/cover.png)

[Body link](https://example.com/?utm_source=newsletter&utm_medium=email&utm_campaign=almost-ready)
`,
        "almost-ready.md",
      ),
    };

    const report = buildPreflightReport(prepared, { strict: true });

    assert.equal(report.status, "blocked");
    assert.equal(report.message, "Preflight blocked live mutation with 1 failed check.");
  });

  it("allows benign HTML comments while blocking editorial comment tokens", async () => {
    const benign = buildPreflightReport(
      {
        mode: "publish",
        scheduleAt: undefined,
        post: await parseMarkdownString(
          `---
title: "Commented"
---
# Commented

<!-- prettier-ignore -->
Body.
`,
          "commented.md",
        ),
      },
      { publicationUrl: "https://rareinsights.substack.com" },
    );
    const editorial = buildPreflightReport(
      {
        mode: "publish",
        scheduleAt: undefined,
        post: await parseMarkdownString(
          `---
title: "Commented"
---
# Commented

<!-- TODO: rewrite this -->
Body.
`,
          "editorial.md",
        ),
      },
      { publicationUrl: "https://rareinsights.substack.com" },
    );

    assert.notEqual(checkStatus(benign, "no-editorial-placeholders"), "fail");
    assert.equal(checkStatus(editorial, "no-editorial-placeholders"), "fail");
  });

  it("blocks editorial tokens inside later HTML comments", async () => {
    const report = buildPreflightReport(
      {
        mode: "publish",
        scheduleAt: undefined,
        post: await parseMarkdownString(
          `---
title: "Later Comment"
---
# Later Comment

<!-- prettier-ignore -->

Body.

<!-- TK: add source -->
`,
          "later-comment.md",
        ),
      },
      { publicationUrl: "https://rareinsights.substack.com" },
    );

    assert.equal(checkStatus(report, "no-editorial-placeholders"), "fail");
  });

  it("blocks inline editorial comment placeholders", async () => {
    const report = buildPreflightReport(
      {
        mode: "publish",
        scheduleAt: undefined,
        post: await parseMarkdownString(
          `---
title: "Comment Marker"
---
# Comment Marker

{{ comment: expand this section }}
`,
          "comment-marker.md",
        ),
      },
      { publicationUrl: "https://rareinsights.substack.com" },
    );

    assert.equal(checkStatus(report, "no-editorial-placeholders"), "fail");
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

  it("blocks invalid schedule timestamps before live mutation", async () => {
    const prepared = {
      mode: "schedule" as const,
      scheduleAt: "not-a-date",
      post: await parseMarkdownString(
        `---
title: "Invalid Schedule"
---
# Invalid Schedule
`,
        "invalid-schedule.md",
      ),
    };

    const report = buildPreflightReport(prepared, {
      publicationUrl: "https://rareinsights.substack.com",
    });

    assert.equal(report.status, "blocked");
    assert.equal(checkStatus(report, "schedule-time-parseable"), "fail");
    assert.equal(checkStatus(report, "schedule-time-future"), "fail");
  });

  it("blocks missing schedule timestamps before live mutation", async () => {
    const prepared = {
      mode: "schedule" as const,
      scheduleAt: undefined,
      post: await parseMarkdownString(
        `---
title: "Missing Schedule"
---
# Missing Schedule
`,
        "missing-schedule.md",
      ),
    };

    const report = buildPreflightReport(prepared, {
      publicationUrl: "https://rareinsights.substack.com",
      scheduleItems: [{ title: "Other", scheduledAt: "2027-01-01T00:00:00Z" }],
    });

    assert.equal(report.status, "blocked");
    assert.equal(checkStatus(report, "schedule-time-parseable"), "fail");
    assert.equal(checkStatus(report, "schedule-time-no-collision"), "pass");
  });

  it("ignores schedule collisions for the current draft id", async () => {
    const prepared = {
      mode: "schedule" as const,
      scheduleAt: "2027-01-01T00:00:00Z",
      post: await parseMarkdownString(
        `---
title: "Scheduled Post"
---
# Scheduled Post
`,
        "scheduled.md",
      ),
    };

    const report = buildPreflightReport(prepared, {
      publicationUrl: "https://rareinsights.substack.com",
      draftId: "123",
      scheduleItems: [{ draftId: "123", scheduledAt: "2027-01-01T00:00:00Z" }],
    });

    assert.equal(checkStatus(report, "schedule-time-no-collision"), "pass");
  });

  it("ignores schedule collisions for current source file and title", async () => {
    const prepared = {
      mode: "schedule" as const,
      scheduleAt: "2027-01-01T00:00:00Z",
      post: await parseMarkdownString(
        `---
title: "Scheduled Post"
---
# Scheduled Post
`,
        "scheduled.md",
      ),
    };

    const report = buildPreflightReport(prepared, {
      publicationUrl: "https://rareinsights.substack.com",
      scheduleItems: [
        { title: "Other", sourceFile: "scheduled.md", scheduledAt: "2027-01-01T00:00:00Z" },
        { title: " scheduled post ", sourceFile: "other.md", scheduledAt: "2027-01-01T00:00:00Z" },
        { title: "Bad Timestamp", sourceFile: "bad.md", scheduledAt: "not-a-date" },
        { title: "Other Time", sourceFile: "other.md", scheduledAt: "2027-01-02T00:00:00Z" },
      ],
    });

    assert.equal(checkStatus(report, "schedule-time-no-collision"), "pass");
  });

  it("uses a fallback collision message when schedule items have no display name", async () => {
    const prepared = {
      mode: "schedule" as const,
      scheduleAt: "2027-01-01T00:00:00Z",
      post: await parseMarkdownString(
        `---
title: "Scheduled Post"
---
# Scheduled Post
`,
        "scheduled.md",
      ),
    };

    const report = buildPreflightReport(prepared, {
      publicationUrl: "https://rareinsights.substack.com",
      scheduleItems: [{ draftId: "other-draft", scheduledAt: "2027-01-01T00:00:00Z" }],
    });

    assert.equal(checkStatus(report, "schedule-time-no-collision"), "fail");
    assert.equal(
      report.checks.find((check) => check.code === "schedule-time-no-collision")?.message,
      "Schedule time collides with another item.",
    );
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

  it("includes the source name in schedule parse errors", () => {
    assert.throws(
      () => parsePreflightScheduleFile("{", "planned-posts.json"),
      /Could not parse planned-posts\.json as JSON/,
    );
  });
});

function checkStatus(report: ReturnType<typeof buildPreflightReport>, code: string) {
  return report.checks.find((check) => check.code === code)?.status;
}
