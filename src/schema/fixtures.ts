import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { collectMarkTypes, collectNodeTypes, validateProseMirrorDocument } from "../parser/schema.js";
import { preparePost } from "../publish/prepare.js";
import type { PreparedPost, ProseMirrorNode } from "../types.js";

export interface SchemaSummary {
  valid: boolean;
  nodeTypes: string[];
  markTypes: string[];
}

export interface CapturedFixture {
  generatedAt: string;
  sourceFile: string;
  mode: PreparedPost["mode"];
  scheduleAt?: string | undefined;
  metadata: PreparedPost["post"]["metadata"];
  html: string;
  document: ProseMirrorNode;
  summary: SchemaSummary;
}

export async function validateSchemaFile(filePath: string): Promise<SchemaSummary> {
  const raw = await readFile(filePath, "utf8");
  const json = JSON.parse(raw) as unknown;
  const document = extractDocument(json);

  return summarizeDocument(document);
}

export async function captureFixture(markdownFile: string, outputFile: string): Promise<CapturedFixture> {
  const prepared = await preparePost(markdownFile, { mode: "draft" });
  const fixture: CapturedFixture = {
    generatedAt: new Date().toISOString(),
    sourceFile: markdownFile,
    mode: prepared.mode,
    scheduleAt: prepared.scheduleAt,
    metadata: prepared.post.metadata,
    html: prepared.post.html,
    document: prepared.post.document,
    summary: summarizeDocument(prepared.post.document),
  };

  await mkdir(dirname(outputFile), { recursive: true });
  await writeFile(outputFile, `${JSON.stringify(fixture, null, 2)}\n`, "utf8");
  return fixture;
}

export async function compareFixture(markdownFile: string, fixtureFile: string): Promise<{
  equal: boolean;
  expectedSummary: SchemaSummary;
  actualSummary: SchemaSummary;
}> {
  const [prepared, rawFixture] = await Promise.all([
    preparePost(markdownFile, { mode: "draft" }),
    readFile(fixtureFile, "utf8"),
  ]);
  const fixture = JSON.parse(rawFixture) as unknown;
  const expected = extractDocument(fixture);
  const actual = prepared.post.document;

  return {
    equal: stableStringify(expected) === stableStringify(actual),
    expectedSummary: summarizeDocument(expected),
    actualSummary: summarizeDocument(actual),
  };
}

function extractDocument(input: unknown): ProseMirrorNode {
  if (isRecord(input) && "document" in input) {
    return validateProseMirrorDocument(input.document);
  }

  if (isRecord(input) && "body" in input) {
    return validateProseMirrorDocument(input.body);
  }

  return validateProseMirrorDocument(input);
}

function summarizeDocument(document: ProseMirrorNode): SchemaSummary {
  return {
    valid: true,
    nodeTypes: collectNodeTypes(document),
    markTypes: collectMarkTypes(document),
  };
}

function stableStringify(input: unknown): string {
  return JSON.stringify(sortValue(input));
}

function sortValue(input: unknown): unknown {
  if (Array.isArray(input)) {
    return input.map(sortValue);
  }

  if (isRecord(input)) {
    return Object.fromEntries(
      Object.entries(input)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, value]) => [key, sortValue(value)]),
    );
  }

  return input;
}

function isRecord(input: unknown): input is Record<string, unknown> {
  return typeof input === "object" && input !== null && !Array.isArray(input);
}
