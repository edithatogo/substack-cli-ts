import { access } from "node:fs/promises";
import { extname, resolve, dirname } from "node:path";
import type { ProseMirrorNode } from "../types.js";
import type { FetchLike } from "./client.js";
import { uploadImage } from "./client.js";

export interface MediaUploadOptions {
  uploadEndpoint?: string | undefined;
  responseUrlField?: string | undefined;
}

export interface DraftMediaAssetItem {
  kind: string;
  source: string;
}

export interface DraftMediaAssetResult {
  asset: DraftMediaAssetItem;
  result: { status: string; url?: string; error?: string };
}

export interface DraftMediaReport {
  uploaded: number;
  failed: number;
  skipped: number;
  assets: DraftMediaAssetResult[];
}

export interface UploadDraftMediaResult {
  report: DraftMediaReport;
  document: ProseMirrorNode;
}

const SUPPORTED_EXTENSIONS = new Set([
  ".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg",
]);

export async function uploadDraftMedia(
  sourceFile: string,
  document: ProseMirrorNode,
  publicationUrl: string,
  headers: Record<string, string>,
  fetchImpl: FetchLike,
  options?: MediaUploadOptions,
): Promise<UploadDraftMediaResult> {
  const uploadEndpoint = options?.uploadEndpoint ?? "/api/v1/image";
  const responseUrlField = options?.responseUrlField;
  const uploadUrl = new URL(uploadEndpoint, publicationUrl).toString();
  const baseDir = dirname(sourceFile);
  const report: DraftMediaReport = { uploaded: 0, failed: 0, skipped: 0, assets: [] };
  const updatedDocument = deepCloneDocument(document);

  let hasLocal = false;

  for (const node of iterateImages(updatedDocument)) {
    const src = typeof node.attrs?.src === "string" ? node.attrs.src : "";
    if (!src) {
      continue;
    }

    if (isRemoteUrl(src)) {
      continue;
    }

    if (src.startsWith("data:")) {
      continue;
    }

    const ext = extname(src).toLowerCase();
    if (!SUPPORTED_EXTENSIONS.has(ext)) {
      report.failed++;
      report.assets.push({
        asset: { kind: "local", source: src },
        result: { status: "failed", error: `Unsupported image format${ext ? `: ${ext}` : ""}.` },
      });
      continue;
    }

    const resolvedPath = resolve(baseDir, src);

    try {
      await access(resolvedPath);
    } catch {
      report.failed++;
      report.assets.push({
        asset: { kind: "local", source: src },
        result: { status: "failed", error: `File not found: ${src}` },
      });
      continue;
    }

    hasLocal = true;
    const uploadResult = await uploadImage(fetchImpl, uploadUrl, resolvedPath, headers, responseUrlField);

    if (uploadResult.status === "ok" && uploadResult.url) {
      node.attrs = { ...node.attrs, src: uploadResult.url };
      report.uploaded++;
      report.assets.push({
        asset: { kind: "local", source: src },
        result: { status: "ok", url: uploadResult.url },
      });
    } else {
      report.failed++;
      report.assets.push({
        asset: { kind: "local", source: src },
        result: { status: "failed", error: uploadResult.error ?? "Upload failed." },
      });
    }
  }

  if (!hasLocal) {
    return { report, document };
  }

  return { report, document: updatedDocument };
}

function isRemoteUrl(source: string): boolean {
  try {
    const parsed = new URL(source);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function* iterateImages(node: ProseMirrorNode): Generator<ProseMirrorNode> {
  if (node.type === "image") {
    yield node;
  }
  for (const child of node.content ?? []) {
    yield* iterateImages(child);
  }
}

function deepCloneDocument(node: ProseMirrorNode): ProseMirrorNode {
  return {
    ...node,
    content: node.content?.map((child) => deepCloneDocument(child)),
  };
}
