import { dirname, resolve } from "node:path";
import type { MediaAsset, MediaManifest, ProseMirrorNode } from "../types.js";

export function buildMediaManifest(document: ProseMirrorNode, sourceFile: string): MediaManifest {
  const assets: MediaAsset[] = [];

  walk(document, (node) => {
    if (node.type !== "image") {
      return;
    }

    const source = readString(node.attrs?.src);
    if (!source) {
      return;
    }

    const kind = classifySource(source);
    const asset: MediaAsset = {
      kind,
      source,
      resolvedSource: kind === "local" ? resolve(dirname(sourceFile), source) : source,
      alt: readString(node.attrs?.alt),
      title: readString(node.attrs?.title),
      caption: readString(node.attrs?.caption) ?? readString(node.attrs?.title),
    };

    assets.push(asset);
  });

  return {
    assets,
    localCount: assets.filter((asset) => asset.kind === "local").length,
    remoteCount: assets.filter((asset) => asset.kind === "remote").length,
    dataCount: assets.filter((asset) => asset.kind === "data").length,
  };
}

export function summarizeMediaManifest(manifest: MediaManifest): Array<Record<string, unknown>> {
  return manifest.assets.map((asset) => ({
    kind: asset.kind,
    source:
      asset.kind === "remote"
        ? redactRemoteUrl(asset.source)
        : asset.kind === "local"
          ? asset.source
          : "data-uri",
    alt: asset.alt ?? null,
    title: asset.title ?? null,
    caption: asset.caption ?? null,
    status:
      asset.kind === "local" ? "needs-upload" : asset.kind === "data" ? "inline-data" : "remote-ok",
  }));
}

function walk(node: ProseMirrorNode, visit: (node: ProseMirrorNode) => void): void {
  visit(node);
  node.content?.forEach((child) => walk(child, visit));
}

function readString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function classifySource(source: string): MediaAsset["kind"] {
  if (source.startsWith("data:")) {
    return "data";
  }

  try {
    const url = new URL(source);
    return url.protocol === "http:" || url.protocol === "https:" ? "remote" : "local";
  } catch {
    return "local";
  }
}

function redactRemoteUrl(value: string): string {
  try {
    const url = new URL(value);
    url.search = "";
    url.hash = "";
    return url.toString();
  } catch {
    return value;
  }
}
