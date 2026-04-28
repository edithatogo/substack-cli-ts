import type { Cookie } from "playwright-core";
import { createLocalBrowserSession } from "../browser/local-browser.js";
import {
  requirePublicationUrl,
  type EffectiveConfig,
} from "../config/store.js";
import { redact } from "../util/redact.js";

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

const LIKELY_SESSION_COOKIE_NAMES = new Set([
  "connect.sid",
  "substack.sid",
  "substack_session",
]);

export async function resolveApiAuthMaterial(
  config: EffectiveConfig,
  source: "auto" | ApiAuthSource = "auto",
): Promise<ApiAuthMaterial> {
  if ((source === "auto" || source === "env") && config.substackCookie) {
    return materialFromCookieHeader(
      config.substackCookie,
      requirePublicationUrl(config),
      "env",
    );
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
    await session.page.goto(publicationUrl, {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });

    const cookies = await session.context.cookies([
      "https://substack.com",
      publicationUrl,
    ]);

    return materialFromCookies(cookies, publicationUrl, "local-profile");
  } finally {
    await session.close();
  }
}

export function summarizeApiAuthMaterial(
  material: ApiAuthMaterial,
): ApiAuthStatus {
  return {
    source: material.source,
    publicationHost: new URL(material.publicationUrl).host,
    cookieCount: material.cookies.length,
    hasLikelySessionCookie: material.hasLikelySessionCookie,
    cookies: material.cookies,
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
  const cookieHeader = usableCookies
    .map((cookie) => `${cookie.name}=${cookie.value}`)
    .join("; ");
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
  const domain = cookie.domain.startsWith(".")
    ? cookie.domain.slice(1)
    : cookie.domain;

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
