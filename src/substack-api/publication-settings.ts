import { z } from "zod";
import type { ApiAuthMaterial } from "./auth.js";
import { type FetchLike, apiHeaders, requestWrite, uploadImage } from "./client.js";
import { fetchPublication } from "./publication.js";

const NavigationLinkSchema = z.object({
  label: z.string(),
  url: z.string(),
});

export const PublicationSettingsUpdateSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
  hero_text: z.string().optional(),
  logo_url: z.string().optional(),
  favicon_url: z.string().optional(),
  colors: z
    .object({
      primary: z.string().optional(),
      secondary: z.string().optional(),
      background: z.string().optional(),
      text: z.string().optional(),
    })
    .optional(),
  font_family_heading: z.string().optional(),
  font_family_body: z.string().optional(),
  seo_title: z.string().optional(),
  seo_description: z.string().optional(),
  og_image_url: z.string().optional(),
  navigation_links: z.array(NavigationLinkSchema).optional(),
  email_header_color: z.string().optional(),
  email_footer_color: z.string().optional(),
});

export interface PublicationColors {
  primary?: string | undefined;
  secondary?: string | undefined;
  background?: string | undefined;
  text?: string | undefined;
}

export interface NavigationLink {
  label: string;
  url: string;
}

export interface PublicationSettingsUpdate {
  name?: string | undefined;
  description?: string | undefined;
  hero_text?: string | undefined;
  logo_url?: string | undefined;
  favicon_url?: string | undefined;
  colors?: PublicationColors | undefined;
  font_family_heading?: string | undefined;
  font_family_body?: string | undefined;
  seo_title?: string | undefined;
  seo_description?: string | undefined;
  og_image_url?: string | undefined;
  navigation_links?: NavigationLink[] | undefined;
  email_header_color?: string | undefined;
  email_footer_color?: string | undefined;
}

export interface UpdatePublicationSettingsResult {
  status: "ok" | "failed";
  message: string;
  updated?: Partial<PublicationSettingsUpdate> | undefined;
}

export interface UploadLogoResult {
  status: "ok" | "failed";
  message: string;
  logoUrl?: string | undefined;
}

export interface UploadFaviconResult {
  status: "ok" | "failed";
  message: string;
  faviconUrl?: string | undefined;
}

export async function fetchPublicationSettings(
  publicationUrl: string,
  material: ApiAuthMaterial,
  fetchFn: FetchLike,
): Promise<unknown> {
  return fetchPublication(publicationUrl, material, fetchFn);
}

export function computeSettingsDiff(
  current: Record<string, unknown>,
  next: Record<string, unknown>,
): Record<string, unknown> {
  const diff: Record<string, unknown> = {};

  for (const key of Object.keys(next)) {
    const currentValue = current[key];
    const nextValue = next[key];

    if (JSON.stringify(currentValue) !== JSON.stringify(nextValue)) {
      diff[key] = nextValue;
    }
  }

  return diff;
}

export async function updatePublicationSettings(
  publicationUrl: string,
  material: ApiAuthMaterial,
  fetchFn: FetchLike,
  updates: PublicationSettingsUpdate,
  options: { confirm?: boolean | undefined; dryRun?: boolean | undefined } = {},
): Promise<UpdatePublicationSettingsResult> {
  const current = (await fetchPublication(publicationUrl, material, fetchFn)) as unknown as Record<
    string,
    unknown
  >;

  const merged: Record<string, unknown> = { ...current };
  for (const [key, value] of Object.entries(updates)) {
    if (value !== undefined) {
      merged[key] = value;
    }
  }

  const previewDiff = computeSettingsDiff(current, merged);

  const shouldPreview = options.dryRun === true || options.confirm === false;
  if (shouldPreview) {
    return {
      status: "ok",
      message: "Preview of changes (no write performed)",
      updated: previewDiff as Partial<PublicationSettingsUpdate>,
    };
  }

  const headers = apiHeaders(material);
  const endpoint = new URL("/api/v1/publication/update", publicationUrl).toString();

  const response = await requestWrite(fetchFn, endpoint, "POST", headers, merged);

  if (response.status < 200 || response.status >= 300) {
    return {
      status: "failed",
      message: `Update failed with HTTP ${response.status}`,
    };
  }

  return {
    status: "ok",
    message: "Publication settings updated successfully",
    updated: previewDiff as Partial<PublicationSettingsUpdate>,
  };
}

export async function uploadPublicationLogo(
  publicationUrl: string,
  material: ApiAuthMaterial,
  fetchFn: FetchLike,
  imagePath: string,
  options: { yes?: boolean } = {},
): Promise<UploadLogoResult> {
  if (!options.yes) {
    return {
      status: "failed",
      message: "Logo upload requires confirmation. Pass { yes: true } to proceed.",
    };
  }

  const headers = apiHeaders(material);
  const uploadUrl = new URL("/api/v1/image", publicationUrl).toString();

  const uploadResult = await uploadImage(fetchFn, uploadUrl, imagePath, headers);

  if (uploadResult.status !== "ok" || !uploadResult.url) {
    return {
      status: "failed",
      message: uploadResult.error ?? "Logo upload failed.",
    };
  }

  const updateResult = await updatePublicationSettings(
    publicationUrl,
    material,
    fetchFn,
    { logo_url: uploadResult.url },
    { confirm: true },
  );

  if (updateResult.status !== "ok") {
    return {
      status: "failed",
      message: `Logo uploaded but failed to update settings: ${updateResult.message}`,
      logoUrl: uploadResult.url,
    };
  }

  return {
    status: "ok",
    message: "Logo uploaded and settings updated.",
    logoUrl: uploadResult.url,
  };
}

export async function uploadPublicationFavicon(
  publicationUrl: string,
  material: ApiAuthMaterial,
  fetchFn: FetchLike,
  imagePath: string,
  options: { yes?: boolean } = {},
): Promise<UploadFaviconResult> {
  if (!options.yes) {
    return {
      status: "failed",
      message: "Favicon upload requires confirmation. Pass { yes: true } to proceed.",
    };
  }

  const headers = apiHeaders(material);
  const uploadUrl = new URL("/api/v1/image", publicationUrl).toString();

  const uploadResult = await uploadImage(fetchFn, uploadUrl, imagePath, headers);

  if (uploadResult.status !== "ok" || !uploadResult.url) {
    return {
      status: "failed",
      message: uploadResult.error ?? "Favicon upload failed.",
    };
  }

  const updateResult = await updatePublicationSettings(
    publicationUrl,
    material,
    fetchFn,
    { favicon_url: uploadResult.url },
    { confirm: true },
  );

  if (updateResult.status !== "ok") {
    return {
      status: "failed",
      message: `Favicon uploaded but failed to update settings: ${updateResult.message}`,
      faviconUrl: uploadResult.url,
    };
  }

  return {
    status: "ok",
    message: "Favicon uploaded and settings updated.",
    faviconUrl: uploadResult.url,
  };
}
