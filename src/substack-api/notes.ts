import type { ApiAuthMaterial } from "./auth.js";
import { apiHeaders, type FetchLike, requestDelete, requestWrite } from "./client.js";
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

export async function listNotes(material: ApiAuthMaterial, limit = 10): Promise<NoteSummary[]> {
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

export async function getNote(material: ApiAuthMaterial, id: number): Promise<NoteDetail> {
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
  const result = await profile.newNote().paragraph().text(body).publish();
  return {
    id: result.id,
    publishedAt: result.date,
  };
}

export async function deleteNote(
  material: ApiAuthMaterial,
  id: number,
  fetchImpl: FetchLike,
): Promise<{ status: number }> {
  const url = `${material.publicationUrl}/api/v1/notes/${id}`;
  const headers = apiHeaders(material);
  const result = await requestDelete(fetchImpl, url, headers);
  return { status: result.status };
}

export async function likeNote(material: ApiAuthMaterial, id: number): Promise<void> {
  const client = createSubstackClient(material);
  const note = await client.noteForId(id);
  await note.like();
}

export async function reshareNote(
  material: ApiAuthMaterial,
  id: number,
  fetchImpl: FetchLike,
): Promise<{ status: number }> {
  const url = `${material.publicationUrl}/api/v1/notes/${id}/reshare`;
  const headers = apiHeaders(material);
  const result = await requestWrite(fetchImpl, url, "POST", headers, {});
  return { status: result.status };
}

export async function replyToNote(
  material: ApiAuthMaterial,
  id: number,
  body: string,
  fetchImpl: FetchLike,
): Promise<{ status: number }> {
  const url = `${material.publicationUrl}/api/v1/notes/${id}/comments`;
  const headers = apiHeaders(material);
  const result = await requestWrite(fetchImpl, url, "POST", headers, { body });
  return { status: result.status };
}
