import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { parseMarkdownString } from "../parser/markdown.js";
import { verifyDraftContent } from "./content-verification.js";

describe("verifyDraftContent", () => {
  it("passes for a valid post with title and body", async () => {
    const parsed = await parseMarkdownString(`---
title: "My Post"
---
Hello **world**.
`);
    const report = verifyDraftContent(parsed);
    assert.equal(report.ok, true);
    assert.equal(report.hasTitle, true);
    assert.equal(report.hasBody, true);
    assert.equal(report.issues.length, 0);
  });

  it("reports missing title", async () => {
    const parsed = await parseMarkdownString("No frontmatter here.\n");
    const report = verifyDraftContent(parsed);
    assert.equal(report.ok, false);
    assert.equal(report.hasTitle, false);
    const titleIssue = report.issues.find(
      (i) => i.path === "metadata.title",
    );
    assert.ok(titleIssue);
    assert.equal(titleIssue?.severity, "error");
  });

  it("reports empty title", async () => {
    const parsed = await parseMarkdownString(`---
title: ""
---
Content.
`);
    const report = verifyDraftContent(parsed);
    assert.equal(report.ok, false);
    assert.equal(report.hasTitle, false);
  });

  it("reports missing body content", async () => {
    const parsed = await parseMarkdownString(`---
title: "Empty Post"
---
`);
    const report = verifyDraftContent(parsed);
    assert.equal(report.ok, false);
    assert.equal(report.hasBody, false);
  });

  it("counts links in the document", async () => {
    const parsed = await parseMarkdownString(`---
title: "Link Test"
---
[valid](https://example.com) and [another](https://other.com).
`);
    const report = verifyDraftContent(parsed);
    assert.equal(report.linkCount, 2);
    assert.equal(report.ok, true);
  });

  it("warns about tables in the content", async () => {
    const parsed = await parseMarkdownString(`---
title: "Table Test"
---
| A | B |
|---|---|
| 1 | 2 |
`);
    const report = verifyDraftContent(parsed);
    const tableIssue = report.issues.find(
      (i) => i.path === "document.tables",
    );
    assert.ok(tableIssue);
    assert.equal(tableIssue?.severity, "warning");
  });

  it("counts total nodes and text length", async () => {
    const parsed = await parseMarkdownString(`---
title: "Stats"
---
# Heading

Paragraph with **bold** text.
`);
    const report = verifyDraftContent(parsed);
    assert.ok(report.totalNodes > 0);
    assert.ok(report.textLength > 0);
  });
});
