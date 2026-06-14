import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { parseFrontmatter } from "./frontmatter.js";

describe("parseFrontmatter", () => {
  it("returns the original body when no frontmatter exists", () => {
    const result = parseFrontmatter("Plain text body.\n");

    assert.deepEqual(result.metadata, { tags: [] });
    assert.equal(result.body, "Plain text body.\n");
    assert.deepEqual(result.warnings, []);
  });

  it("parses block-list tags and coerced metadata values", () => {
    const result = parseFrontmatter(`---
title: Example title
subtitle: Example subtitle
slug: example-title
tags:
  - alpha
  - beta
audience: paid
section: News
sectionId: 42
comments: enabled
scheduleAt: 2026-05-01T00:00:00Z
shouldSendEmail: true
---
Body text.
`);

    assert.equal(result.metadata.title, "Example title");
    assert.equal(result.metadata.subtitle, "Example subtitle");
    assert.deepEqual(result.metadata.tags, ["alpha", "beta"]);
    assert.equal(result.metadata.audience, "paid");
    assert.equal(result.metadata.sectionId, 42);
    assert.equal(result.metadata.shouldSendEmail, true);
    assert.equal(result.body, "Body text.\n");
  });

  it("parses comma-separated tags and ignores comments and blank lines", () => {
    const result = parseFrontmatter(`---
# metadata comment
tags: foo, bar , baz
comments: disabled

---
Post body.
`);

    assert.deepEqual(result.metadata.tags, ["foo", "bar", "baz"]);
    assert.equal(result.metadata.comments, "disabled");
    assert.equal(result.body, "Post body.\n");
  });

  it("parses array tags and quoted scalars", () => {
    const result = parseFrontmatter(`---
tags: ["alpha", "beta"]
title: "Quoted title"
subtitle: 'Quoted subtitle'
---
Body.
`);

    assert.deepEqual(result.metadata.tags, ["alpha", "beta"]);
    assert.equal(result.metadata.title, "Quoted title");
    assert.equal(result.metadata.subtitle, "Quoted subtitle");
  });

  it("parses Creator OS front matter fields", () => {
    const result = parseFrontmatter(`---
title: Creator OS
seoTitle: Creator SEO
seoDescription: Creator description
socialImage: ./social.png
canonicalUrl: https://example.substack.com/p/creator-os
campaign: creator-os-launch
utm: source=newsletter&medium=launch&campaign=creator-os
video: ./video.mp4
audio: ./episode.mp3
transcript: ./transcript.md
thumbnail: ./thumb.png
---
Body.
`);

    assert.equal(result.metadata.seoTitle, "Creator SEO");
    assert.equal(result.metadata.seoDescription, "Creator description");
    assert.equal(result.metadata.socialImage, "./social.png");
    assert.equal(result.metadata.canonicalUrl, "https://example.substack.com/p/creator-os");
    assert.equal(result.metadata.campaign, "creator-os-launch");
    assert.equal(result.metadata.utm, "source=newsletter&medium=launch&campaign=creator-os");
    assert.equal(result.metadata.video, "./video.mp4");
    assert.equal(result.metadata.audio, "./episode.mp3");
    assert.equal(result.metadata.transcript, "./transcript.md");
    assert.equal(result.metadata.thumbnail, "./thumb.png");
  });
});
