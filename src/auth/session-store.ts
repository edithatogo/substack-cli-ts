import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { z } from "zod";
import { sessionFilePath } from "../config/paths.js";

const SessionSchema = z.object({
  browserbaseSessionId: z.string().min(1),
  publicationUrl: z.string().url(),
  createdAt: z.string(),
  updatedAt: z.string(),
  lastVerifiedAt: z.string().optional(),
  browserbaseSessionUrl: z.string().url().optional(),
  browserbaseDebugUrl: z.string().url().optional(),
});

export type StoredSession = z.infer<typeof SessionSchema>;

export async function loadSession(): Promise<StoredSession | null> {
  try {
    const raw = await readFile(sessionFilePath(), "utf8");
    return SessionSchema.parse(JSON.parse(raw));
  } catch (error) {
    if (isMissingFile(error)) {
      return null;
    }

    throw error;
  }
}

export async function saveSession(session: StoredSession): Promise<void> {
  const parsed = SessionSchema.parse(session);
  await mkdir(dirname(sessionFilePath()), { recursive: true });
  await writeFile(
    sessionFilePath(),
    `${JSON.stringify(parsed, null, 2)}\n`,
    "utf8",
  );
}

export async function clearSession(): Promise<void> {
  await rm(sessionFilePath(), { force: true });
}

export function createStoredSession(input: {
  browserbaseSessionId: string;
  publicationUrl: string;
  browserbaseSessionUrl?: string | undefined;
  browserbaseDebugUrl?: string | undefined;
}): StoredSession {
  const now = new Date().toISOString();

  return {
    browserbaseSessionId: input.browserbaseSessionId,
    publicationUrl: input.publicationUrl,
    createdAt: now,
    updatedAt: now,
    browserbaseSessionUrl: input.browserbaseSessionUrl,
    browserbaseDebugUrl: input.browserbaseDebugUrl,
  };
}

function isMissingFile(error: unknown): boolean {
  return error instanceof Error && "code" in error && error.code === "ENOENT";
}
