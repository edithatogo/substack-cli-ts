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
});
