import { z } from "zod";
import type { ApiAuthMaterial } from "./auth.js";
import { apiHeaders, classifyFailure, type FetchLike, requestJson } from "./client.js";

const HandleResultSchema = z.object({
  potentialHandles: z.array(
    z.object({
      handle: z.string(),
      type: z.string(),
    }),
  ),
});

const PublicProfileResponseSchema = z.object({
  id: z.number(),
  name: z.string(),
  handle: z.string(),
  slug: z.string().optional(),
  bio: z.string().nullable().optional(),
  photo_url: z.string().nullable().optional(),
  subscriberCountNumber: z.number().optional(),
  isFollowing: z.boolean().optional(),
});

const OwnProfileResponseSchema = z.object({
  id: z.number(),
  name: z.string(),
  handle: z.string(),
  bio: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  photo_url: z.string().nullable().optional(),
  stripe_customer_id: z.string().nullable().optional(),
  is_email_confirmed: z.boolean().optional(),
  subscriberCountNumber: z.number().optional(),
});

export interface OwnProfileData {
  id: number;
  name: string;
  handle: string;
  slug: string;
  bio: string | null;
  email: string | null;
  photoUrl: string | null;
  followerCount: number;
  stripeCustomerId: string | null;
  isEmailConfirmed: boolean;
}

export interface PublicProfileData {
  id: number;
  name: string;
  handle: string;
  slug: string;
  bio: string | null;
  photoUrl: string | null;
  followerCount: number;
  isFollowing: boolean;
}

export type ProfileReadStatus =
  | "ok"
  | "unauthenticated"
  | "forbidden"
  | "not-found"
  | "schema-drift"
  | "network-error";

export interface ProfileReadResult<T> {
  status: ProfileReadStatus;
  data?: T | undefined;
  message: string;
}

async function resolveHandle(
  material: ApiAuthMaterial,
  fetchImpl: FetchLike,
): Promise<string | undefined> {
  const headers = apiHeaders(material);
  const response = await requestJson(
    fetchImpl,
    "https://substack.com/api/v1/handle/options",
    headers,
  );
  if (response.status !== 200) return undefined;

  const parsed = HandleResultSchema.safeParse(response.body);
  if (!parsed.success) return undefined;

  return (
    parsed.data.potentialHandles.find((c) => c.type === "existing")?.handle ??
    parsed.data.potentialHandles[0]?.handle
  );
}

export async function readOwnProfile(
  material: ApiAuthMaterial,
  fetchImpl: FetchLike = fetch,
): Promise<ProfileReadResult<OwnProfileData>> {
  const handle = await resolveHandle(material, fetchImpl);
  if (!handle) {
    return {
      status: "unauthenticated",
      message: "Could not resolve authenticated user handle.",
    };
  }

  const headers = apiHeaders(material);

  const userEndpoint = `https://substack.com/api/v1/user/${encodeURIComponent(handle)}`;
  const userResponse = await requestJson(fetchImpl, userEndpoint, headers);
  if (userResponse.status !== 200) {
    return {
      status: classifyFailure(userResponse.status, userEndpoint).status,
      message: `Failed to fetch own profile: HTTP ${userResponse.status}`,
    };
  }

  const ownParsed = OwnProfileResponseSchema.safeParse(userResponse.body);
  if (!ownParsed.success) {
    return {
      status: "schema-drift",
      message: "Own profile response did not match expected shape.",
    };
  }

  const publicEndpoint = `https://substack.com/api/v1/user/${encodeURIComponent(handle)}/public_profile`;
  const publicResponse = await requestJson(fetchImpl, publicEndpoint, headers);
  let followerCount = ownParsed.data.subscriberCountNumber ?? 0;
  if (publicResponse.status === 200) {
    const publicParsed = PublicProfileResponseSchema.safeParse(publicResponse.body);
    if (publicParsed.success && publicParsed.data.subscriberCountNumber) {
      followerCount = publicParsed.data.subscriberCountNumber;
    }
  }

  return {
    status: "ok",
    data: {
      id: ownParsed.data.id,
      name: ownParsed.data.name,
      handle: ownParsed.data.handle,
      slug: ownParsed.data.handle,
      bio: ownParsed.data.bio ?? null,
      email: ownParsed.data.email ?? null,
      photoUrl: ownParsed.data.photo_url ?? null,
      followerCount,
      stripeCustomerId: ownParsed.data.stripe_customer_id ?? null,
      isEmailConfirmed: ownParsed.data.is_email_confirmed ?? false,
    },
    message: "Own profile retrieved.",
  };
}

export async function readPublicProfile(
  material: ApiAuthMaterial,
  handleOrSlug: string,
  fetchImpl: FetchLike = fetch,
): Promise<ProfileReadResult<PublicProfileData>> {
  const headers = apiHeaders(material);
  const endpoint = `https://substack.com/api/v1/user/${encodeURIComponent(handleOrSlug)}/public_profile`;
  const response = await requestJson(fetchImpl, endpoint, headers);
  if (response.status !== 200) {
    return {
      status: classifyFailure(response.status, endpoint).status,
      message: `Failed to fetch public profile: HTTP ${response.status}`,
    };
  }

  const parsed = PublicProfileResponseSchema.safeParse(response.body);
  if (!parsed.success) {
    return {
      status: "schema-drift",
      message: "Public profile response did not match expected shape.",
    };
  }

  return {
    status: "ok",
    data: {
      id: parsed.data.id,
      name: parsed.data.name,
      handle: parsed.data.handle,
      slug: parsed.data.slug ?? parsed.data.handle,
      bio: parsed.data.bio ?? null,
      photoUrl: parsed.data.photo_url ?? null,
      followerCount: parsed.data.subscriberCountNumber ?? 0,
      isFollowing: parsed.data.isFollowing ?? false,
    },
    message: "Public profile retrieved.",
  };
}
