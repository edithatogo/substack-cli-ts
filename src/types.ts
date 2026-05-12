export type PublishMode = "draft" | "publish" | "schedule";

export interface PostMetadata {
  title?: string | undefined;
  subtitle?: string | undefined;
  slug?: string | undefined;
  tags: string[];
  audience?: "everyone" | "free" | "paid" | "founding" | undefined;
  section?: string | undefined;
  sectionId?: number | undefined;
  comments?: "enabled" | "disabled" | "paid" | "free" | undefined;
  scheduleAt?: string | undefined;
  shouldSendEmail?: boolean | undefined;
}

export interface ProseMirrorMark {
  type: string;
  attrs?: Record<string, unknown> | undefined;
}

export interface ProseMirrorNode {
  type: string;
  attrs?: Record<string, unknown> | undefined;
  content?: ProseMirrorNode[] | undefined;
  text?: string | undefined;
  marks?: ProseMirrorMark[] | undefined;
}

export interface MediaAsset {
  kind: "local" | "remote" | "data";
  source: string;
  resolvedSource?: string | undefined;
  alt?: string | undefined;
  title?: string | undefined;
  caption?: string | undefined;
}

export interface MediaManifest {
  assets: MediaAsset[];
  localCount: number;
  remoteCount: number;
  dataCount: number;
}

export interface ParsedPost {
  filePath: string;
  metadata: PostMetadata;
  markdown: string;
  html: string;
  document: ProseMirrorNode;
  media: MediaManifest;
}

export interface PreparedPost {
  mode: PublishMode;
  scheduleAt?: string | undefined;
  post: ParsedPost;
}
