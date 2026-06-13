import { z } from "zod";
import type { ApiAuthMaterial } from "./auth.js";
import {
  type ApiReadStatus,
  type FetchLike,
  apiHeaders,
  classifyFailure,
  requestJson,
} from "./client.js";

export interface PublicationSummary {
  id: number;
  name: string;
  subdomain: string;
  customDomain?: string | null | undefined;
  role?: string | undefined;
  isPrimary?: boolean | undefined;
}

export interface UserSummary {
  id: number;
  name: string;
  handle: string;
  publications: PublicationSummary[];
}

export interface ConfiguredPublicationSummary {
  id?: number | undefined;
  name: string;
  subdomain: string;
  customDomain?: string | null | undefined;
  heroText?: string | null | undefined;
  authorId?: number | undefined;
  paymentsState?: string | null | undefined;
}

export interface SectionSummary {
  id: number;
  publicationId: number;
  name: string;
  slug: string;
  description?: string | null | undefined;
  isPodcast?: boolean | undefined;
}

export interface PostSummary {
  id: number;
  publicationId?: number | undefined;
  title: string;
  slug?: string | undefined;
  postDate?: string | null | undefined;
  type?: string | undefined;
  audience?: string | null | undefined;
  canonicalUrl?: string | null | undefined;
  sectionId?: number | null | undefined;
}

export interface DraftSummary {
  id: number;
  publicationId: number;
  draftTitle: string | null;
  title: string | null;
  draftUpdatedAt: string | null;
  type: string;
  audience: string | null;
  sectionId: number | null;
  sectionName: string | null;
  sectionSlug: string | null;
  isPublished: boolean;
  slug: string | null;
  scheduledAt: string | null;
  writeCommentPermissions: string | null;
}

export interface ApiReadInventory {
  status: ApiReadStatus;
  endpoints: string[];
  user?: UserSummary | undefined;
  configuredPublication?: ConfiguredPublicationSummary | undefined;
  sections?: SectionSummary[] | undefined;
  posts?: PostSummary[] | undefined;
  drafts?: DraftSummary[] | undefined;
  draftHasMore?: boolean | undefined;
  message: string;
}

export interface ReadInventoryOptions {
  postLimit?: number | undefined;
  draftLimit?: number | undefined;
}

const PublicProfileSchema = z.object({
  id: z.number(),
  name: z.string(),
  handle: z.string(),
  publicationUsers: z
    .array(
      z.object({
        role: z.string().optional(),
        public: z.boolean().optional(),
        is_primary: z.boolean().optional(),
        publication: z.object({
          id: z.number(),
          name: z.string(),
          subdomain: z.string(),
          custom_domain: z.string().nullable().optional(),
        }),
      }),
    )
    .default([]),
});

const PublicationSchema = z.object({
  id: z.number().optional(),
  name: z.string(),
  subdomain: z.string(),
  custom_domain: z.string().nullable().optional(),
  hero_text: z.string().nullable().optional(),
  author_id: z.number().optional(),
  payments_state: z.string().nullable().optional(),
});

const SectionSchema = z.object({
  id: z.number(),
  publication_id: z.number(),
  name: z.string(),
  description: z.string().nullable().optional(),
  slug: z.string(),
  is_podcast: z.boolean().optional(),
});

const PostSchema = z.object({
  id: z.number(),
  publication_id: z.number().optional(),
  title: z.string(),
  slug: z.string().optional(),
  post_date: z.string().nullable().optional(),
  type: z.string().optional(),
  audience: z.string().nullable().optional(),
  canonical_url: z.string().nullable().optional(),
  section_id: z.number().nullable().optional(),
});

const DraftPostSchema = z.object({
  id: z.number(),
  publication_id: z.number(),
  type: z.string(),
  post_date: z.string().nullable().optional(),
  email_sent_at: z.string().nullable().optional(),
  is_published: z.boolean(),
  title: z.string().nullable().optional(),
  draft_title: z.string().nullable().optional(),
  draft_updated_at: z.string().nullable().optional(),
  audience: z.string().nullable().optional(),
  slug: z.string().nullable().optional(),
  scheduled_at: z.string().nullable().optional(),
  scheduledAt: z.string().nullable().optional(),
  draft_scheduled_at: z.string().nullable().optional(),
  should_send_email: z.boolean().nullable().optional(),
  write_comment_permissions: z.string().nullable().optional(),
  section_id: z.number().nullable().optional(),
  section_name: z.string().nullable().optional(),
  section_slug: z.string().nullable().optional(),
});

const DraftListResponseSchema = z.object({
  posts: z.array(DraftPostSchema),
  hasMore: z.boolean(),
  nextCursor: z.number().nullable().optional(),
});

const HandleOptionsSchema = z.object({
  potentialHandles: z.array(
    z.object({
      handle: z.string(),
      type: z.string(),
    }),
  ),
});

export async function readApiInventory(
  material: ApiAuthMaterial,
  fetchImpl: FetchLike = fetch,
  options: ReadInventoryOptions = {},
): Promise<ApiReadInventory> {
  const headers = apiHeaders(material);
  const endpoints: string[] = [];
  const handleOptionsEndpoint = "https://substack.com/api/v1/handle/options";
  endpoints.push(handleOptionsEndpoint);

  const handleOptionsResponse = await requestJson(fetchImpl, handleOptionsEndpoint, headers);
  if (handleOptionsResponse.status !== 200) {
    return failureInventory(handleOptionsResponse.status, endpoints);
  }

  const handleOptions = HandleOptionsSchema.safeParse(handleOptionsResponse.body);
  if (!handleOptions.success) {
    return {
      status: "schema-drift",
      endpoints,
      message: "The handle options response did not match the expected shape.",
    };
  }

  const handle =
    handleOptions.data.potentialHandles.find((candidate) => candidate.type === "existing")
      ?.handle ?? handleOptions.data.potentialHandles[0]?.handle;

  if (!handle) {
    return {
      status: "schema-drift",
      endpoints,
      message: "The authenticated session returned no usable handle.",
    };
  }

  const profileEndpoint = `https://substack.com/api/v1/user/${encodeURIComponent(handle)}/public_profile`;
  endpoints.push(profileEndpoint);
  const profileResponse = await requestJson(fetchImpl, profileEndpoint, headers);
  if (profileResponse.status !== 200) {
    return failureInventory(profileResponse.status, endpoints);
  }

  const profile = PublicProfileSchema.safeParse(profileResponse.body);
  if (!profile.success) {
    return {
      status: "schema-drift",
      endpoints,
      message: "The public profile response did not match the expected shape.",
    };
  }

  const publicationEndpoint = new URL("/api/v1/publication", material.publicationUrl).toString();
  endpoints.push(publicationEndpoint);
  const publicationResponse = await requestJson(fetchImpl, publicationEndpoint, headers);
  if (publicationResponse.status !== 200) {
    return failureInventory(publicationResponse.status, endpoints);
  }

  const publication = PublicationSchema.safeParse(publicationResponse.body);
  if (!publication.success) {
    return {
      status: "schema-drift",
      endpoints,
      message: "The configured publication response did not match the expected shape.",
    };
  }

  const draftsResult = await fetchDrafts(
    material,
    fetchImpl,
    headers,
    endpoints,
    options.draftLimit ?? 10,
  );

  return {
    status: "ok",
    endpoints,
    user: {
      id: profile.data.id,
      name: profile.data.name,
      handle: profile.data.handle,
      publications: profile.data.publicationUsers.map((publicationUser) => ({
        id: publicationUser.publication.id,
        name: publicationUser.publication.name,
        subdomain: publicationUser.publication.subdomain,
        customDomain: publicationUser.publication.custom_domain,
        role: publicationUser.role,
        isPrimary: publicationUser.is_primary,
      })),
    },
    configuredPublication: {
      id: publication.data.id,
      name: publication.data.name,
      subdomain: publication.data.subdomain,
      customDomain: publication.data.custom_domain,
      heroText: publication.data.hero_text,
      authorId: publication.data.author_id,
      paymentsState: publication.data.payments_state,
    },
    sections: await readSections(material, fetchImpl, headers, endpoints),
    posts: await readPosts(material, fetchImpl, headers, endpoints, options.postLimit ?? 10),
    drafts: draftsResult.items,
    draftHasMore: draftsResult.hasMore,
    message: "Read-only API inventory completed.",
  };
}

async function fetchDrafts(
  material: ApiAuthMaterial,
  fetchImpl: FetchLike,
  headers: Record<string, string>,
  endpoints: string[],
  limit: number,
): Promise<{ items: DraftSummary[]; hasMore: boolean }> {
  const result = await readDrafts(material, fetchImpl, headers, endpoints, limit);
  if (!result) {
    return { items: [], hasMore: false };
  }
  return result;
}

async function readSections(
  material: ApiAuthMaterial,
  fetchImpl: FetchLike,
  headers: Record<string, string>,
  endpoints: string[],
): Promise<SectionSummary[]> {
  const endpoint = new URL("/api/v1/publication/sections", material.publicationUrl).toString();
  endpoints.push(endpoint);
  const response = await requestJson(fetchImpl, endpoint, headers);
  if (response.status !== 200) {
    return [];
  }

  const parsed = z.array(SectionSchema).safeParse(response.body);
  if (!parsed.success) {
    return [];
  }

  return parsed.data.map((section) => ({
    id: section.id,
    publicationId: section.publication_id,
    name: section.name,
    slug: section.slug,
    description: section.description,
    isPodcast: section.is_podcast,
  }));
}

async function readPosts(
  material: ApiAuthMaterial,
  fetchImpl: FetchLike,
  headers: Record<string, string>,
  endpoints: string[],
  limit: number,
): Promise<PostSummary[]> {
  const endpoint = new URL("/api/v1/posts", material.publicationUrl).toString();
  endpoints.push(endpoint);
  const response = await requestJson(fetchImpl, endpoint, headers);
  if (response.status !== 200) {
    return [];
  }

  const parsed = z.array(PostSchema).safeParse(response.body);
  if (!parsed.success) {
    return [];
  }

  return parsed.data.slice(0, limit).map((post) => ({
    id: post.id,
    publicationId: post.publication_id,
    title: post.title,
    slug: post.slug,
    postDate: post.post_date,
    type: post.type,
    audience: post.audience,
    canonicalUrl: post.canonical_url,
    sectionId: post.section_id,
  }));
}

async function readDrafts(
  material: ApiAuthMaterial,
  fetchImpl: FetchLike,
  headers: Record<string, string>,
  endpoints: string[],
  limit: number,
): Promise<{ items: DraftSummary[]; hasMore: boolean } | undefined> {
  const endpoint = new URL("/api/v1/drafts", material.publicationUrl).toString();
  endpoints.push(endpoint);
  const response = await requestJson(fetchImpl, endpoint, headers);
  if (response.status !== 200) {
    return undefined;
  }

  const parsed = DraftListResponseSchema.safeParse(response.body);
  if (!parsed.success) {
    return undefined;
  }

  return {
    items: parsed.data.posts.slice(0, limit).map((draft) => ({
      id: draft.id,
      publicationId: draft.publication_id,
      draftTitle: draft.draft_title ?? null,
      title: draft.title ?? null,
      draftUpdatedAt: draft.draft_updated_at ?? null,
      type: draft.type,
      audience: draft.audience ?? null,
      sectionId: draft.section_id ?? null,
      sectionName: draft.section_name ?? null,
      sectionSlug: draft.section_slug ?? null,
      isPublished: draft.is_published,
      slug: draft.slug ?? null,
      scheduledAt: draft.scheduled_at ?? draft.scheduledAt ?? draft.draft_scheduled_at ?? null,
      writeCommentPermissions: draft.write_comment_permissions ?? null,
    })),
    hasMore: parsed.data.hasMore,
  };
}

function failureInventory(status: number, endpoints: string[]): ApiReadInventory {
  const failure = classifyFailure(status, endpoints[endpoints.length - 1] ?? "unknown");

  return {
    status: failure.status,
    endpoints,
    message: failure.message,
  };
}
