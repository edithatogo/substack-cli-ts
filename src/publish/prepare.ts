import { parseMarkdownFile } from "../parser/markdown.js";
import type { PreparedPost, PublishMode } from "../types.js";

export interface PreparePostOptions {
  mode?: PublishMode;
  scheduleAt?: string;
}

export async function preparePost(
  filePath: string,
  options: PreparePostOptions = {},
): Promise<PreparedPost> {
  const post = await parseMarkdownFile(filePath);
  const mode = options.mode ?? "draft";
  const scheduleAt = options.scheduleAt ?? post.metadata.scheduleAt;

  if (mode === "schedule" && !scheduleAt) {
    throw new Error("Scheduling requires --at or scheduleAt front matter.");
  }

  if (mode === "schedule" && scheduleAt && Number.isNaN(Date.parse(scheduleAt))) {
    throw new Error(`Invalid schedule timestamp: ${scheduleAt}`);
  }

  return {
    mode,
    scheduleAt,
    post,
  };
}
