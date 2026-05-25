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
