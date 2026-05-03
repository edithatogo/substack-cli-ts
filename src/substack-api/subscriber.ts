import type { ApiAuthMaterial } from "./auth.js";
import { fetchPublicationChecklist } from "./publication.js";

export async function getSubscriberCount(
  publicationUrl: string,
  material: ApiAuthMaterial,
  fetchFn: typeof fetch,
): Promise<number> {
  const checklist = await fetchPublicationChecklist(publicationUrl, material, fetchFn);
  return checklist.subscriberCount ?? 0;
}
