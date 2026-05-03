import type { ApiAuthMaterial } from "./auth.js";
import { createSubstackClient } from "./substack-adapter.js";

export interface NoteSummary {
  id: string;
  body: string;
  author: string;
  publishedAt: string;
  likesCount: number;
}

export interface NoteDetail {
  id: string;
  body: string;
  author: {
    id: number;
    name: string;
    handle: string;
    avatarUrl: string;
  };
  publishedAt: string;
  likesCount: number;
}

export async function listNotes(
  material: ApiAuthMaterial,
  limit: number = 10,
): Promise<NoteSummary[]> {
  const client = createSubstackClient(material);
  const profile = await client.ownProfile();
  const notes: NoteSummary[] = [];

  for await (const note of profile.notes({ limit })) {
    notes.push({
      id: note.id,
      body: note.body,
      author: note.author.name,
      publishedAt: note.publishedAt.toISOString(),
      likesCount: note.likesCount,
    });
  }

  return notes;
}

export async function getNote(
  material: ApiAuthMaterial,
  id: number,
): Promise<NoteDetail> {
  const client = createSubstackClient(material);
  const note = await client.noteForId(id);
  return {
    id: note.id,
    body: note.body,
    author: note.author,
    publishedAt: note.publishedAt.toISOString(),
    likesCount: note.likesCount,
  };
}

export async function createNote(
  material: ApiAuthMaterial,
  body: string,
): Promise<{ id: number; publishedAt: string }> {
  const client = createSubstackClient(material);
  const profile = await client.ownProfile();
  const result = await profile
    .newNote()
    .paragraph()
    .text(body)
    .publish();
  return {
    id: result.id,
    publishedAt: result.date,
  };
}
