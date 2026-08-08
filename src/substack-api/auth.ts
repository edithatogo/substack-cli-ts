import type { Cookie } from "playwright-core";
import { z } from "zod";
import { createLocalBrowserSession } from "../browser/local-browser.js";
import { type EffectiveConfig, requirePublicationUrl } from "../config/store.js";
import { redact } from "../util/redact.js";
import {
  authorizePublicationSession,
  type AuthorizedPublicationSession,
} from "../security/authorized-session.js";
import {
  type ApiReadStatus,
  apiHeaders,
  classifyFailure,
  type FetchLike,
  requestJson,
} from "./client.js";

export type ApiAuthSource = "env" | "local-profile";

export interface ApiCookieSummary {
  name: string;
  domain: string;
  path: string;
  expires: number;
  secure: boolean;
  httpOnly: boolean;
  sameSite: Cookie["sameSite"];
  value: string | null;
}

export interface ApiAuthMaterial {
  source: ApiAuthSource;
  publicationUrl: string;
  cookieHeader: string;
  cookies: ApiCookieSummary[];
  hasLikelySessionCookie: boolean;
}

export interface ApiAuthStatus {
  source: ApiAuthSource;
  publicationHost: string;
  cookieCount: number;
  hasLikelySessionCookie: boolean;
  cookies: ApiCookieSummary[];
}

export type ApiAuthValidationStatus = ApiReadStatus;

export interface ApiAuthValidation {
  status: ApiAuthValidationStatus;
  handle?: string | undefined;
  userId?: number | undefined;
  name?: string | undefined;
  publication?:
    | {
        id: number;
        name: string;
        subdomain: string;
        role?: string | undefined;
      }
    | undefined;
  authorizedSession?: AuthorizedPublicationSession | undefined;
  checkedEndpoints: string[];
  message: string;
}

const LIKELY_SESSION_COOKIE_NAMES = new Set(["connect.sid", "substack.sid", "substack_session"]);

const HandleOptionsSchema = z.object({
  potentialHandles: z.array(
    z.object({
      id: z.string(),
      handle: z.string(),
      type: z.string(),
    }),
  ),
});

const PublicProfileSchema = z.object({
  id: z.number(),
  name: z.string(),
  handle: z.string(),
  publicationUsers: z
    .array(
      z.object({
        role: z.string().optional(),
        publication: z.object({
          id: z.number(),
          name: z.string(),
          subdomain: z.string(),
        }),
      }),
    )
    .optional(),
});

export async function resolveApiAuthMaterial(
  config: EffectiveConfig,
  source: "auto" | ApiAuthSource = "auto",
): Promise<ApiAuthMaterial> {
  if ((source === "auto" || source === "env") && config.substackCookie) {
    return materialFromCookieHeader(config.substackCookie, requirePublicationUrl(config), "env");
  }

  if (source === "env") {
    throw new Error("SUBSTACK_COOKIE is not configured.");
  }

  return extractApiAuthFromLocalProfile(config);
}

export async function extractApiAuthFromLocalProfile(
  config: EffectiveConfig,
): Promise<ApiAuthMaterial> {
  const publicationUrl = requirePublicationUrl(config);
  const session = await createLocalBrowserSession();

  try {
    try {
      await session.page.goto(publicationUrl, {
        waitUntil: "domcontentloaded",
        timeout: 60000,
      });
    } catch {
      // The persistent profile can still expose stored cookies even if a
      // transient navigation failure occurs.
    }

    const cookies = await session.context.cookies(["https://substack.com", publicationUrl]);

    return materialFromCookies(cookies, publicationUrl, "local-profile");
  } finally {
    await session.close();
  }
}

export function summarizeApiAuthMaterial(material: ApiAuthMaterial): ApiAuthStatus {
  return {
    source: material.source,
    publicationHost: new URL(material.publicationUrl).host,
    cookieCount: material.cookies.length,
    hasLikelySessionCookie: material.hasLikelySessionCookie,
    cookies: material.cookies,
  };
}

export async function validateApiAuthMaterial(
  material: ApiAuthMaterial,
  fetchImpl: FetchLike = fetch,
): Promise<ApiAuthValidation> {
  const handleOptionsEndpoint = "https://substack.com/api/v1/handle/options";
  const checkedEndpoints = [handleOptionsEndpoint];
  const headers = apiHeaders(material);

  const handleResponse = await requestJson(fetchImpl, handleOptionsEndpoint, headers);
  if (handleResponse.status !== 200) {
    return validationFailure(handleResponse.status, checkedEndpoints);
  }

  const handleOptions = HandleOptionsSchema.safeParse(handleResponse.body);
  if (!handleOptions.success) {
    return {
      status: "schema-drift",
      checkedEndpoints,
      message: "The handle options response did not match the expected shape.",
    };
  }

  const handle =
    handleOptions.data.potentialHandles.find((candidate) => candidate.type === "existing")
      ?.handle ?? handleOptions.data.potentialHandles[0]?.handle;

  if (!handle) {
    return {
      status: "schema-drift",
      checkedEndpoints,
      message: "The authenticated session returned no usable Substack handle.",
    };
  }

  const profileEndpoint = `https://substack.com/api/v1/user/${encodeURIComponent(handle)}/public_profile`;
  checkedEndpoints.push(profileEndpoint);

  const profileResponse = await requestJson(fetchImpl, profileEndpoint, headers);
  if (profileResponse.status !== 200) {
    return validationFailure(profileResponse.status, checkedEndpoints);
  }

  const profile = PublicProfileSchema.safeParse(profileResponse.body);
  if (!profile.success) {
    return {
      status: "schema-drift",
      checkedEndpoints,
      handle,
      message: "The public profile response did not match the expected shape.",
    };
  }

  const publicationSubdomain = new URL(material.publicationUrl).host.split(".")[0];
  const publicationUser = profile.data.publicationUsers?.find(
    (candidate) => candidate.publication.subdomain === publicationSubdomain,
  );

  const authorizedSession = publicationUser
    ? authorizePublicationSession({
        publicationId: publicationUser.publication.id,
        configuredPublicationId: publicationUser.publication.id,
        publicationOrigin: material.publicationUrl,
        ...(publicationUser.role ? { role: publicationUser.role } : {}),
      })
    : undefined;

  return {
    status: "ok",
    checkedEndpoints,
    handle: profile.data.handle,
    userId: profile.data.id,
    name: profile.data.name,
    publication: publicationUser
      ? {
          id: publicationUser.publication.id,
          name: publicationUser.publication.name,
          subdomain: publicationUser.publication.subdomain,
          role: publicationUser.role,
        }
      : undefined,
    authorizedSession,
    message: publicationUser
      ? "Authenticated session validated against the configured publication."
      : "Authenticated session is valid, but the configured publication was not found in the profile publication list.",
  };
}

export function materialFromCookieHeader(
  cookieHeader: string,
  publicationUrl: string,
  source: ApiAuthSource,
): ApiAuthMaterial {
  const cookies = cookieHeader
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part): Cookie => {
      const separator = part.indexOf("=");
      const name = separator === -1 ? part : part.slice(0, separator);
      const value = separator === -1 ? "" : part.slice(separator + 1);

      return {
        name,
        value,
        domain: ".substack.com",
        path: "/",
        expires: -1,
        httpOnly: false,
        secure: true,
        sameSite: "Lax",
      };
    });

  return materialFromCookies(cookies, publicationUrl, source);
}

export function materialFromCookies(
  cookies: Cookie[],
  publicationUrl: string,
  source: ApiAuthSource,
): ApiAuthMaterial {
  const usableCookies = dedupeCookies(cookies).filter((cookie) =>
    isRelevantCookie(cookie, publicationUrl),
  );
  const cookieHeader = usableCookies.map((cookie) => `${cookie.name}=${cookie.value}`).join("; ");
  const summaries = usableCookies.map(summarizeCookie);

  return {
    source,
    publicationUrl,
    cookieHeader,
    cookies: summaries,
    hasLikelySessionCookie: summaries.some((cookie) =>
      LIKELY_SESSION_COOKIE_NAMES.has(cookie.name),
    ),
  };
}

function dedupeCookies(cookies: Cookie[]): Cookie[] {
  const seen = new Map<string, Cookie>();

  for (const cookie of cookies) {
    seen.set(`${cookie.domain}\t${cookie.path}\t${cookie.name}`, cookie);
  }

  return [...seen.values()].sort((a, b) => a.name.localeCompare(b.name));
}

function isRelevantCookie(cookie: Cookie, publicationUrl: string): boolean {
  const publicationHost = new URL(publicationUrl).host;
  const domain = cookie.domain.startsWith(".") ? cookie.domain.slice(1) : cookie.domain;

  return (
    domain === "substack.com" ||
    domain.endsWith(".substack.com") ||
    publicationHost === domain ||
    publicationHost.endsWith(`.${domain}`)
  );
}

function summarizeCookie(cookie: Cookie): ApiCookieSummary {
  return {
    name: cookie.name,
    domain: cookie.domain,
    path: cookie.path,
    expires: cookie.expires,
    secure: cookie.secure,
    httpOnly: cookie.httpOnly,
    sameSite: cookie.sameSite,
    value: redact(cookie.value),
  };
}

function validationFailure(status: number, checkedEndpoints: string[]): ApiAuthValidation {
  const failure = classifyFailure(
    status,
    checkedEndpoints[checkedEndpoints.length - 1] ?? "unknown",
  );
  return {
    status: failure.status,
    checkedEndpoints,
    message: failure.message,
  };
}
