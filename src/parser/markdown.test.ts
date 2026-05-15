import assert from "node:assert/strict";
import * as fc from "fast-check";
import { describe, expect, it } from "vitest";
import type { ProseMirrorNode } from "../types.js";
import { parseMarkdownString } from "./markdown.js";

function findNodes(root: ProseMirrorNode, type: string): ProseMirrorNode[] {
  const found: ProseMirrorNode[] = [];
  function walk(node: ProseMirrorNode) {
    if (node.type === type) found.push(node);
    if (node.content) for (const child of node.content) walk(child);
  }
  walk(root);
  return found;
}

describe("parseMarkdownString", () => {
  it("extracts front matter and creates a ProseMirror document", async () => {
    const parsed = await parseMarkdownString(`---
title: "Example post"
tags: [substack, markdown]
---
# Heading

Hello **world**.
`);

    assert.equal(parsed.metadata.title, "Example post");
    assert.deepEqual(parsed.metadata.tags, ["substack", "markdown"]);
    assert.equal(parsed.document.type, "doc");
    assert.equal(parsed.document.content?.[0]?.type, "heading");
  });

  it("documents block-list frontmatter tags as unsupported", async () => {
    const parsed = await parseMarkdownString(`---
title: Example
tags:
  - Policy That Thinks
  - New Zealand policy
---
Body
`);

    assert.deepEqual(parsed.metadata.tags, []);
    assert.ok(parsed.warnings?.some((warning) => warning.includes("Block-list frontmatter tags")));
  });

  it("maps Substack shortcodes to custom Tiptap nodes", async () => {
    const parsed = await parseMarkdownString(`Intro

{{paywall}}

{{subscribe: Join now}}
`);

    const nodeTypes = parsed.document.content?.map((node) => node.type);
    assert.ok(nodeTypes?.includes("paywallDivider"));
    assert.ok(nodeTypes?.includes("subscribeWidget"));
  });

  it("preserves arbitrary plain text in a paragraph", async () => {
    await fc.assert(
      fc.asyncProperty(fc.stringMatching(/^[A-Za-z0-9]{1,80}$/), async (text) => {
        const markdown = `Paragraph ${text}`;
        const parsed = await parseMarkdownString(markdown);
        const rendered = JSON.stringify(parsed.document);

        expect(rendered).toContain(JSON.stringify(markdown).slice(1, -1));
      }),
      { numRuns: 50 },
    );
  });

  describe("block-level formatting", () => {
    it("parses bullet lists with nesting", async () => {
      const parsed = await parseMarkdownString(`- Item A
- Item B
  - Nested one
  - Nested two
- Item C
`);
      const lists = findNodes(parsed.document, "bulletList");
      assert.ok(lists[0]);
      const topList = lists[0]!;
      assert.equal(topList.content?.length, 3);
    });

    it("parses ordered lists with nesting", async () => {
      const parsed = await parseMarkdownString(`1. First
2. Second
   1. Sub A
3. Third
`);
      const lists = findNodes(parsed.document, "orderedList");
      assert.ok(lists[0]);
      const topList = lists[0]!;
      assert.equal(topList.content?.length, 3);
      const nestedLists = findNodes(topList, "orderedList");
      assert.ok(nestedLists.length >= 1);
    });

    it("parses blockquotes", async () => {
      const parsed = await parseMarkdownString(`> A wise quotation.
> 
> A second paragraph.
`);
      const quotes = findNodes(parsed.document, "blockquote");
      assert.equal(quotes.length, 1);
      const quote = quotes[0]!;
      const paras = quote.content?.filter((n) => n.type === "paragraph");
      assert.equal(paras?.length, 2);
    });

    it("parses nested blockquotes", async () => {
      const parsed = await parseMarkdownString(`> Outer
> > Inner
`);
      const quotes = findNodes(parsed.document, "blockquote");
      assert.equal(quotes.length, 2);
    });

    it("parses code blocks with language annotation", async () => {
      const parsed = await parseMarkdownString("```ts\nconst x: number = 1;\n```");
      const blocks = findNodes(parsed.document, "codeBlock");
      assert.equal(blocks.length, 1);
      assert.equal(blocks[0]?.attrs?.language, "ts");
    });

    it("parses code blocks without language", async () => {
      const parsed = await parseMarkdownString("```\nplain code\n```");
      const blocks = findNodes(parsed.document, "codeBlock");
      assert.equal(blocks.length, 1);
    });

    it("parses horizontal rules", async () => {
      const parsed = await parseMarkdownString("Before\n\n---\n\nAfter");
      const rules = findNodes(parsed.document, "horizontalRule");
      assert.equal(rules.length, 1);
    });

    it("parses multiple heading levels", async () => {
      const parsed = await parseMarkdownString("# H1\n\n## H2\n\n### H3");
      const headings = findNodes(parsed.document, "heading");
      assert.equal(headings.length, 3);
      assert.equal(headings[0]?.attrs?.level, 1);
      assert.equal(headings[1]?.attrs?.level, 2);
      assert.equal(headings[2]?.attrs?.level, 3);
    });

    it("parses mixed content inside blockquotes", async () => {
      const parsed = await parseMarkdownString(`> A quote with a list:
> - Item 1
> - Item 2
`);
      const quotes = findNodes(parsed.document, "blockquote");
      assert.equal(quotes.length, 1);
      const quote = quotes[0]!;
      const lists = findNodes(quote, "bulletList");
      assert.equal(lists.length, 1);
      assert.equal(lists[0]?.content?.length, 2);
    });
  });

  describe("image handling", () => {
    it("parses standard Markdown images with alt and title", async () => {
      const parsed = await parseMarkdownString(
        '![Alt text](https://example.com/img.png "Title text")',
      );
      const images = findNodes(parsed.document, "image");
      assert.equal(images.length, 1);
      const img = images[0]!;
      assert.equal(img.attrs?.src, "https://example.com/img.png");
      assert.equal(img.attrs?.alt, "Alt text");
      assert.equal(img.attrs?.title, "Title text");
    });

    it("parses inline HTML images with data-caption", async () => {
      const parsed = await parseMarkdownString(
        '<img src="https://example.com/img.png" alt="Alt" data-caption="My caption">',
      );
      const images = findNodes(parsed.document, "image");
      assert.equal(images.length, 1);
      assert.equal(images[0]?.attrs?.caption, "My caption");
    });

    it("parses images without alt text", async () => {
      const parsed = await parseMarkdownString("![](https://example.com/banner.jpg)");
      const images = findNodes(parsed.document, "image");
      assert.equal(images.length, 1);
    });

    it("parses local image paths", async () => {
      const parsed = await parseMarkdownString("![Local](./assets/photo.png)");
      const images = findNodes(parsed.document, "image");
      assert.equal(images.length, 1);
      assert.equal(images[0]?.attrs?.src, "./assets/photo.png");
    });

    it("parses multiple images in sequence", async () => {
      const parsed = await parseMarkdownString(
        "![A](https://a.png)\n![B](https://b.png)\n![C](https://c.png)",
      );
      const images = findNodes(parsed.document, "image");
      assert.equal(images.length, 3);
    });

    it("preserves quoted image alt text and title metadata", async () => {
      const parsed = await parseMarkdownString(
        '![Policy That Thinks "Policy" title](https://example.com/img.png "Caption title")',
      );
      const images = findNodes(parsed.document, "image");
      assert.equal(images.length, 1);
      assert.equal(images[0]?.attrs?.alt, 'Policy That Thinks "Policy" title');
      assert.equal(images[0]?.attrs?.title, "Caption title");
    });

    it("preserves smart quotes in image alt text", async () => {
      const parsed = await parseMarkdownString(
        '![Policy That Thinks “Policy” title](https://example.com/img.png "Caption title")',
      );
      const images = findNodes(parsed.document, "image");
      assert.equal(images.length, 1);
      assert.equal(images[0]?.attrs?.alt, "Policy That Thinks “Policy” title");
      assert.equal(images[0]?.attrs?.title, "Caption title");
    });
  });

  describe("table support", () => {
    it("parses a basic GFM table into table/tableRow/tableCell nodes", async () => {
      const parsed = await parseMarkdownString(`| H1 | H2 |
|----|----|
| A  | B  |
`);
      const tables = findNodes(parsed.document, "table");
      assert.equal(tables.length, 1);
      const table = tables[0]!;
      const rows = table.content?.filter((n) => n.type === "tableRow" || n.type === "tableHeader");
      assert.ok(rows, "table should contain rows");
      assert.ok(table.content && table.content.length > 0);
    });

    it("preserves text content within table cells", async () => {
      const parsed = await parseMarkdownString(`| Name | Value |
|------|-------|
| Foo  | 42    |
| Bar  | 99    |
`);
      const content = JSON.stringify(parsed.document);
      assert.ok(content.includes("Foo"), "should preserve cell text");
      assert.ok(content.includes("42"), "should preserve cell text");
      assert.ok(content.includes("Bar"), "should preserve cell text");
      assert.ok(content.includes("99"), "should preserve cell text");
    });

    it("parses a table with inline formatting inside cells", async () => {
      const parsed = await parseMarkdownString(`| Feature | Status |
|---------|--------|
| **Bold** | Active |
| *Italic* | Active |
`);
      const content = JSON.stringify(parsed.document);
      assert.ok(content.includes("bold"), "should preserve bold mark");
      assert.ok(content.includes("italic"), "should preserve italic mark");
    });
  });

  describe("embed support", () => {
    it("parses a YouTube embed shortcode", async () => {
      const parsed = await parseMarkdownString(
        "{{youtube: https://www.youtube.com/watch?v=dQw4w9WgXcQ}}",
      );
      const embeds = findNodes(parsed.document, "embedNode");
      assert.equal(embeds.length, 1);
      assert.equal(embeds[0]?.attrs?.embedType, "youtube");
      assert.equal(embeds[0]?.attrs?.url, "https://www.youtube.com/watch?v=dQw4w9WgXcQ");
    });

    it("parses a generic URL embed shortcode", async () => {
      const parsed = await parseMarkdownString("{{embed: https://example.com/article}}");
      const embeds = findNodes(parsed.document, "embedNode");
      assert.equal(embeds.length, 1);
      assert.equal(embeds[0]?.attrs?.embedType, "embed");
    });

    it("parses a podcast embed shortcode", async () => {
      const parsed = await parseMarkdownString("{{podcast: https://open.spotify.com/episode/123}}");
      const embeds = findNodes(parsed.document, "embedNode");
      assert.equal(embeds.length, 1);
      assert.equal(embeds[0]?.attrs?.embedType, "podcast");
    });

    it("preserves text around embeds", async () => {
      const parsed = await parseMarkdownString(
        "Before\n\n{{youtube: https://youtu.be/abc}}\n\nAfter",
      );
      const embeds = findNodes(parsed.document, "embedNode");
      assert.equal(embeds.length, 1);
      const paras = parsed.document.content?.filter((n) => n.type === "paragraph");
      assert.ok(paras && paras.length >= 2);
    });
  });
});
