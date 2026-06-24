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
  previewText?: string | undefined;
  seoTitle?: string | undefined;
  seoDescription?: string | undefined;
  socialImage?: string | undefined;
  canonicalUrl?: string | undefined;
  campaign?: string | undefined;
  utm?: string | undefined;
  video?: string | undefined;
  audio?: string | undefined;
  transcript?: string | undefined;
  thumbnail?: string | undefined;
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
  warnings: string[];
}

export interface PreparedPost {
  mode: PublishMode;
  scheduleAt?: string | undefined;
  post: ParsedPost;
}
