import { z } from "zod";
import type { ApiAuthMaterial } from "./auth.js";
import { apiHeaders, requestJson, type FetchLike } from "./client.js";

const ColorsSchema = z
  .object({
    primary: z.string().optional(),
    secondary: z.string().optional(),
    background: z.string().optional(),
    text: z.string().optional(),
  })
  .nullable()
  .optional();

const RichPublicationSchema = z.object({
  id: z.number().optional(),
  name: z.string(),
  subdomain: z.string(),
  custom_domain: z.string().nullable().optional(),
  hero_text: z.string().nullable().optional(),
  author_id: z.number().optional(),
  payments_state: z.string().nullable().optional(),
  logo_url: z.string().nullable().optional(),
  favicon_url: z.string().nullable().optional(),
  colors: ColorsSchema,
  font_family_heading: z.string().nullable().optional(),
  font_family_body: z.string().nullable().optional(),
  custom_domain_enabled: z.boolean().optional(),
});

export interface PublicationColors {
  primary?: string | undefined;
  secondary?: string | undefined;
  background?: string | undefined;
  text?: string | undefined;
}

export interface PublicationDetails {
  id?: number | undefined;
  name: string;
  subdomain: string;
  customDomain?: string | null | undefined;
  heroText?: string | null | undefined;
  authorId?: number | undefined;
  paymentsState?: string | null | undefined;
  logoUrl?: string | null | undefined;
  faviconUrl?: string | null | undefined;
  colors?: PublicationColors | null | undefined;
  fontFamilyHeading?: string | null | undefined;
  fontFamilyBody?: string | null | undefined;
  customDomainEnabled?: boolean | undefined;
}

export interface PublicationChecklist {
  subscriberCount: number | null;
  [key: string]: unknown;
}

export async function fetchPublication(
  publicationUrl: string,
  material: ApiAuthMaterial,
  fetchFn: FetchLike,
): Promise<PublicationDetails> {
  const headers = apiHeaders(material);
  const endpoint = new URL("/api/v1/publication", publicationUrl).toString();
  const response = await requestJson(fetchFn, endpoint, headers);

  if (response.status !== 200) {
    throw new Error(`Failed to fetch publication: HTTP ${response.status}`);
  }

  const parsed = RichPublicationSchema.safeParse(response.body);
  if (!parsed.success) {
    throw new Error(`Publication response schema drift: ${parsed.error.message}`);
  }

  return mapPublication(parsed.data);
}

export async function fetchPublicationChecklist(
  publicationUrl: string,
  material: ApiAuthMaterial,
  fetchFn: FetchLike,
): Promise<PublicationChecklist> {
  const headers = apiHeaders(material);
  const endpoint = new URL("/api/v1/publication_launch_checklist", publicationUrl).toString();
  const response = await requestJson(fetchFn, endpoint, headers);

  if (response.status !== 200) {
    throw new Error(`Failed to fetch publication checklist: HTTP ${response.status}`);
  }

  const body = response.body as Record<string, unknown>;
  const subscriberCount = typeof body?.subscriber_count === "number" ? body.subscriber_count : null;

  return { subscriberCount, ...body };
}

function mapPublication(data: z.infer<typeof RichPublicationSchema>): PublicationDetails {
  return {
    id: data.id,
    name: data.name,
    subdomain: data.subdomain,
    customDomain: data.custom_domain,
    heroText: data.hero_text,
    authorId: data.author_id,
    paymentsState: data.payments_state,
    logoUrl: data.logo_url,
    faviconUrl: data.favicon_url,
    colors: data.colors,
    fontFamilyHeading: data.font_family_heading,
    fontFamilyBody: data.font_family_body,
    customDomainEnabled: data.custom_domain_enabled,
  };
}
