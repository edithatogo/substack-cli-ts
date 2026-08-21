import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { z } from "zod";
import { validateProseMirrorDocument, collectNodeTypes, collectMarkTypes } from "./schema.js";

describe("validateProseMirrorDocument", () => {
  it("passes when valid root node (type: 'doc') is provided", () => {
    const doc = { type: "doc" };
    const result = validateProseMirrorDocument(doc);
    assert.deepEqual(result, doc);
  });

  it("throws ZodError when invalid root node is provided", () => {
    const doc = { type: "paragraph" };
    assert.throws(() => validateProseMirrorDocument(doc), z.ZodError);
  });

  it("throws ZodError when type is missing", () => {
    const doc = { attrs: {} };
    assert.throws(() => validateProseMirrorDocument(doc), z.ZodError);
  });

  it("validates nested content properly", () => {
    const doc = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "Hello World",
              marks: [{ type: "bold" }],
            },
          ],
        },
      ],
    };
    const result = validateProseMirrorDocument(doc);
    assert.deepEqual(result, doc);
  });

  it("throws ZodError when nested content is invalid", () => {
    const doc = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            {
              text: "Hello World",
              marks: [{ type: "bold" }],
            },
          ],
        },
      ],
    };
    assert.throws(() => validateProseMirrorDocument(doc), z.ZodError);
  });
});

describe("collectNodeTypes", () => {
  it("collects unique node types in alphabetical order", () => {
    const doc = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text" }, { type: "text" }],
        },
        {
          type: "heading",
        },
        {
          type: "paragraph",
        },
      ],
    };
    const result = collectNodeTypes(doc);
    assert.deepEqual(result, ["doc", "heading", "paragraph", "text"]);
  });
});

describe("collectMarkTypes", () => {
  it("collects unique mark types in alphabetical order", () => {
    const doc = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              marks: [{ type: "italic" }, { type: "bold" }],
            },
            {
              type: "text",
              marks: [{ type: "bold" }],
            },
          ],
        },
        {
          type: "heading",
          content: [
            {
              type: "text",
              marks: [{ type: "strike" }],
            },
          ],
        },
      ],
    };
    const result = collectMarkTypes(doc);
    assert.deepEqual(result, ["bold", "italic", "strike"]);
  });
});
