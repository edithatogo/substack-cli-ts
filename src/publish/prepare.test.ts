import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "vitest";
import { preparePost } from "./prepare.js";

describe("preparePost", () => {
  it("defaults to draft mode and frontmatter scheduleAt", async () => {
    const file = await writeTempMarkdown(`---
title: Draft
scheduleAt: 2026-05-20T00:00:00Z
---
Body.
`);

    try {
      const prepared = await preparePost(file);

      assert.equal(prepared.mode, "draft");
      assert.equal(prepared.scheduleAt, "2026-05-20T00:00:00Z");
      assert.equal(prepared.post.metadata.title, "Draft");
    } finally {
      await cleanup(file);
    }
  });

  it("promotes a leading heading to the post title without duplicating it in the body", async () => {
    const file = await writeTempMarkdown(`# Heading Title

Body.
`);

    try {
      const prepared = await preparePost(file);

      assert.equal(prepared.post.metadata.title, "Heading Title");
      assert.equal(prepared.post.markdown, "Body.\n");
      assert.doesNotMatch(prepared.post.html, /<h1>Heading Title<\/h1>/);
      assert.equal(prepared.post.document.content?.[0]?.type, "paragraph");
      assert.equal(prepared.post.document.content?.[0]?.content?.[0]?.text, "Body.");
    } finally {
      await cleanup(file);
    }
  });

  it("promotes a leading Setext heading without duplicating it in the body", async () => {
    const file = await writeTempMarkdown(`Setext Title
============

Body.
`);

    try {
      const prepared = await preparePost(file);

      assert.equal(prepared.post.metadata.title, "Setext Title");
      assert.equal(prepared.post.markdown, "Body.\n");
      assert.doesNotMatch(prepared.post.html, /<h1>Setext Title<\/h1>/);
      assert.equal(prepared.post.document.content?.[0]?.type, "paragraph");
    } finally {
      await cleanup(file);
    }
  });

  it("removes a matching leading heading when frontmatter already supplies the title", async () => {
    const file = await writeTempMarkdown(`---
title: Same Title
subtitle: Separate subtitle
---
# Same Title

Body.
`);

    try {
      const prepared = await preparePost(file);

      assert.equal(prepared.post.metadata.title, "Same Title");
      assert.equal(prepared.post.metadata.subtitle, "Separate subtitle");
      assert.equal(prepared.post.markdown, "Body.\n");
      assert.equal(prepared.post.document.content?.[0]?.type, "paragraph");
    } finally {
      await cleanup(file);
    }
  });

  it("preserves a leading heading that differs from the frontmatter title", async () => {
    const file = await writeTempMarkdown(`---
title: Post Title
---
# Section Heading

Body.
`);

    try {
      const prepared = await preparePost(file);

      assert.equal(prepared.post.metadata.title, "Post Title");
      assert.match(prepared.post.html, /<h1>Section Heading<\/h1>/);
      assert.equal(prepared.post.document.content?.[0]?.type, "heading");
    } finally {
      await cleanup(file);
    }
  });

  it("removes an exact leading episode label and metadata subtitle", async () => {
    const file = await writeTempMarkdown(`---
title: Post Title
subtitle: Exact subtitle.
---
# Post Title

*Season 1, Episode 5*

**Subtitle:** Exact subtitle.

Story prose.
`);

    try {
      const prepared = await preparePost(file);

      assert.equal(prepared.post.markdown, "Story prose.\n");
      assert.doesNotMatch(prepared.post.html, /Season 1|Subtitle:/);
      assert.equal(prepared.post.document.content?.length, 1);
      assert.equal(
        prepared.post.document.content?.[0]?.content?.[0]?.text,
        "Story prose.",
      );
    } finally {
      await cleanup(file);
    }
  });

  it("preserves an ambiguous leading metadata block when the subtitle differs", async () => {
    const file = await writeTempMarkdown(`---
title: Post Title
subtitle: Metadata subtitle.
---
# Post Title

*Season 1, Episode 5*

**Subtitle:** Deliberately different body text.

Story prose.
`);

    try {
      const prepared = await preparePost(file);

      assert.match(prepared.post.markdown, /Season 1, Episode 5/);
      assert.match(prepared.post.markdown, /Deliberately different body text/);
      assert.equal(prepared.post.document.content?.[0]?.type, "paragraph");
      assert.equal(prepared.post.document.content?.length, 3);
    } finally {
      await cleanup(file);
    }
  });

  it("accepts an explicit scheduleAt override", async () => {
    const file = await writeTempMarkdown(`---
title: Scheduled
---
Body.
`);

    try {
      const prepared = await preparePost(file, {
        mode: "schedule",
        scheduleAt: "2026-05-21T00:00:00Z",
      });

      assert.equal(prepared.mode, "schedule");
      assert.equal(prepared.scheduleAt, "2026-05-21T00:00:00Z");
    } finally {
      await cleanup(file);
    }
  });

  it("rejects schedule mode without a timestamp", async () => {
    const file = await writeTempMarkdown(`---
title: Scheduled
---
Body.
`);

    try {
      await assert.rejects(() => preparePost(file, { mode: "schedule" }), /requires --at/);
    } finally {
      await cleanup(file);
    }
  });

  it("rejects invalid schedule timestamps", async () => {
    const file = await writeTempMarkdown(`---
title: Scheduled
---
Body.
`);

    try {
      await assert.rejects(
        () => preparePost(file, { mode: "schedule", scheduleAt: "not-a-date" }),
        /Invalid schedule timestamp/,
      );
    } finally {
      await cleanup(file);
    }
  });
});

async function writeTempMarkdown(markdown: string): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "substack-cli-prepare-"));
  const file = join(dir, "post.md");
  await writeFile(file, markdown, "utf8");
  return file;
}

async function cleanup(file: string): Promise<void> {
  await rm(join(file, ".."), { recursive: true, force: true });
}
