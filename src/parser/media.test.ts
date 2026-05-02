import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { parseMarkdownString } from "./markdown.js";
import { summarizeMediaManifest } from "./media.js";

describe("media manifest", () => {
  it("collects remote and local images with caption metadata", async () => {
    const parsed = await parseMarkdownString(`---
title: Media test
---
![Remote alt](https://example.com/image.png "Remote caption")

![Local alt](./assets/local-image.png "Local caption")
`);

    assert.equal(parsed.media.assets.length, 2);
    assert.equal(parsed.media.remoteCount, 1);
    assert.equal(parsed.media.localCount, 1);
    const remote = parsed.media.assets[0];
    const local = parsed.media.assets[1];

    assert.ok(remote);
    assert.ok(local);
    assert.equal(remote.kind, "remote");
    assert.equal(local.kind, "local");
    assert.equal(
      local.resolvedSource?.endsWith("assets\\local-image.png") ||
        local.resolvedSource?.endsWith("assets/local-image.png"),
      true,
    );
    assert.equal(remote.caption, "Remote caption");

    const summary = summarizeMediaManifest(parsed.media);
    assert.equal(summary[0]?.status, "remote-ok");
    assert.equal(summary[1]?.status, "needs-upload");
  });

  it("uses title attribute as caption fallback for standard Markdown images", async () => {
    const parsed = await parseMarkdownString(
      '![Alt](https://example.com/pic.png "Title text")',
    );
    assert.equal(parsed.media.assets.length, 1);
    // buildMediaManifest falls back from caption → title
    assert.equal(parsed.media.assets[0]?.caption, "Title text");
    assert.equal(parsed.media.assets[0]?.title, "Title text");
  });

  it("uses explicit data-caption from inline HTML when available", async () => {
    const parsed = await parseMarkdownString(
      '<img src="https://example.com/pic.png" alt="Alt" data-caption="Explicit caption">',
    );
    assert.equal(parsed.media.assets.length, 1);
    assert.equal(parsed.media.assets[0]?.caption, "Explicit caption");
  });

  it("classifies image without alt text correctly", async () => {
    const parsed = await parseMarkdownString(
      "![](https://example.com/banner.jpg)",
    );
    assert.equal(parsed.media.assets.length, 1);
    assert.equal(parsed.media.assets[0]?.kind, "remote");
    assert.equal(parsed.media.assets[0]?.alt, undefined);
  });

  it("detects non-image assets as local (data URIs)", async () => {
    const parsed = await parseMarkdownString(
      "![](data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVQIHWNgAAIABQABNjN9GQAAAAlwSFlzAAAWJQAAFiUBSVIk8AAAAA0lEQVQY02NgYPgPAAEDAQAR3X2ZAAAASUVORK5CYII=)",
    );
    assert.equal(parsed.media.assets.length, 1);
    assert.equal(parsed.media.assets[0]?.kind, "data");
  });

  it("populates the media manifest with multiple images in sequence", async () => {
    const parsed = await parseMarkdownString(`![A](https://a.png "A")
![B](https://b.png "B")
![C](https://c.png "C")`);
    assert.equal(parsed.media.assets.length, 3);
    assert.equal(parsed.media.remoteCount, 3);
    assert.equal(parsed.media.assets[1]?.caption, "B");
  });
});
