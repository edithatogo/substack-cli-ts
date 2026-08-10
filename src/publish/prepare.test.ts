import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "vitest";
import { preparePost } from "./prepare.js";

describe("preparePost", () => {
  const metadataCases = [
    {
      name: "plain title and subtitle paragraphs",
      source: `---
title: Post Title
subtitle: Post subtitle
---
Post Title

Post subtitle

Body.
`,
      expectedBody: "Body.",
    },
    {
      name: "formatted title and subtitle paragraphs",
      source: `---
title: Formatted title
subtitle: Formatted subtitle
---
**Formatted title**

*Formatted subtitle*

Body.
`,
      expectedBody: "Body.",
    },
    {
      name: "heading title and subtitle",
      source: `---
title: Heading title
subtitle: Heading subtitle
---
# Heading title

## Heading subtitle

Body.
`,
      expectedBody: "Body.",
    },
    {
      name: "mismatched metadata remains in the body",
      source: `---
title: Header title
subtitle: Header subtitle
---
# Different title

Different subtitle

Body.
`,
      expectedBody: "# Different title\n\nDifferent subtitle\n\nBody.",
    },
    {
      name: "matching text later in the body remains",
      source: `---
title: Header title
subtitle: Header subtitle
---
Introductory text

Header title

Header subtitle
`,
      expectedBody: "Introductory text\n\nHeader title\n\nHeader subtitle",
    },
    {
      name: "heading fallback becomes metadata without duplication",
      source: `# Heading fallback

Body.
`,
      expectedBody: "Body.",
    },
  ] as const;

  it.each(metadataCases)(
    "keeps metadata and body representations consistent: $name",
    async (testCase) => {
      const file = await writeTempMarkdown(testCase.source);

      try {
        const prepared = await preparePost(file);
        const bodyText = prepared.post.document.content
          ?.flatMap((node) => node.content ?? [])
          .map((node) => node.text ?? "")
          .filter(Boolean)
          .join("\n");

        assert.equal(prepared.post.markdown.trim(), testCase.expectedBody);
        assert.doesNotMatch(
          prepared.post.html,
          /<h1>(Post Title|Formatted title|Heading title|Heading fallback)<\/h1>/,
        );
        assert.doesNotMatch(
          prepared.post.html,
          /Post subtitle|Formatted subtitle|Heading subtitle/,
        );
        assert.equal(bodyText.includes("Body.") || bodyText.includes("Header subtitle"), true);
      } finally {
        await cleanup(file);
      }
    },
  );

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

  it("removes matching leading title and subtitle blocks", async () => {
    const file = await writeTempMarkdown(`---
title: Same Title
subtitle: Separate subtitle
---
# Same Title

Separate subtitle

Body.
`);

    try {
      const prepared = await preparePost(file);

      assert.equal(prepared.post.markdown, "Body.\n");
      assert.doesNotMatch(prepared.post.html, /Same Title|Separate subtitle/);
      assert.equal(prepared.post.document.content?.length, 1);
      assert.equal(prepared.post.document.content?.[0]?.content?.[0]?.text, "Body.");
    } finally {
      await cleanup(file);
    }
  });

  it("removes a formatted subtitle that exactly matches its rendered metadata", async () => {
    const file = await writeTempMarkdown(`---
title: Post Title
subtitle: Formatted subtitle
---
**Formatted subtitle**

Body.
`);

    try {
      const prepared = await preparePost(file);

      assert.equal(prepared.post.markdown, "Body.\n");
      assert.equal(prepared.post.document.content?.[0]?.content?.[0]?.text, "Body.");
    } finally {
      await cleanup(file);
    }
  });

  it("removes a formatted paragraph title when explicit title metadata matches", async () => {
    const file = await writeTempMarkdown(`---
title: Formatted title
subtitle: Header subtitle
---
**Formatted title**

Header subtitle

Body.
`);

    try {
      const prepared = await preparePost(file);

      assert.equal(prepared.post.markdown, "Body.\n");
      assert.equal(prepared.post.document.content?.[0]?.content?.[0]?.text, "Body.");
    } finally {
      await cleanup(file);
    }
  });

  it("does not promote a leading paragraph to a missing title", async () => {
    const file = await writeTempMarkdown(`Opening paragraph

Body.
`);

    try {
      const prepared = await preparePost(file);

      assert.equal(prepared.post.metadata.title, undefined);
      assert.match(prepared.post.markdown, /^Opening paragraph/);
    } finally {
      await cleanup(file);
    }
  });

  it("preserves leading body text that differs from the subtitle", async () => {
    const file = await writeTempMarkdown(`---
title: Post Title
subtitle: Header subtitle
---
Editorial standfirst

Body.
`);

    try {
      const prepared = await preparePost(file);

      assert.match(prepared.post.markdown, /^Editorial standfirst/);
      assert.equal(prepared.post.document.content?.[0]?.content?.[0]?.text, "Editorial standfirst");
    } finally {
      await cleanup(file);
    }
  });

  it("preserves a non-matching leading heading and matching text later in the body", async () => {
    const file = await writeTempMarkdown(`---
title: Post Title
subtitle: Header subtitle
---
# Section heading

Header subtitle
`);

    try {
      const prepared = await preparePost(file);

      assert.equal(prepared.post.document.content?.[0]?.type, "heading");
      assert.match(prepared.post.markdown, /^# Section heading/);
      assert.match(prepared.post.markdown, /Header subtitle/);
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
