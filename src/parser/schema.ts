import { z } from "zod";
import type { ProseMirrorMark, ProseMirrorNode } from "../types.js";

const MarkSchema: z.ZodType<ProseMirrorMark> = z
  .object({
    type: z.string().min(1),
    attrs: z.record(z.string(), z.unknown()).optional(),
  })
  .passthrough();

const NodeSchema: z.ZodType<ProseMirrorNode> = z.lazy(() =>
  z
    .object({
      type: z.string().min(1),
      attrs: z.record(z.string(), z.unknown()).optional(),
      content: z.array(NodeSchema).optional(),
      text: z.string().optional(),
      marks: z.array(MarkSchema).optional(),
    })
    .passthrough(),
);

const DocumentSchema = NodeSchema.refine((node) => node.type === "doc", {
  message: "Expected a ProseMirror document root node",
});

export function validateProseMirrorDocument(input: unknown): ProseMirrorNode {
  return DocumentSchema.parse(input);
}

export function collectNodeTypes(document: ProseMirrorNode): string[] {
  const types = new Set<string>();

  walk(document, (node) => {
    types.add(node.type);
  });

  return [...types].sort();
}

export function collectMarkTypes(document: ProseMirrorNode): string[] {
  const types = new Set<string>();

  walk(document, (node) => {
    for (const mark of node.marks ?? []) {
      types.add(mark.type);
    }
  });

  return [...types].sort();
}

function walk(
  node: ProseMirrorNode,
  visit: (node: ProseMirrorNode) => void,
): void {
  visit(node);

  for (const child of node.content ?? []) {
    walk(child, visit);
  }
}
