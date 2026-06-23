import { z } from "zod";
import type { ApiAuthMaterial } from "./auth.js";
import {
  type FetchLike,
  apiHeaders,
  classifyFailure,
  requestJson,
  requestWrite,
} from "./client.js";

export type DomainReadStatus =
  | "ok"
  | "unauthenticated"
  | "forbidden"
  | "not-found"
  | "schema-drift"
  | "network-error";

export type DomainWriteStatus =
  | "ok"
  | "unauthenticated"
  | "forbidden"
  | "not-found"
  | "schema-drift"
  | "network-error";

export interface DomainStatusResult {
  status: DomainReadStatus;
  domain?: DomainStatus | undefined;
  message: string;
}

export interface DomainStatus {
  customDomain: string | null;
  customDomainOptional: boolean;
  subdomain: string;
  publicationUrl: string;
  sslStatus: "not_provisioned" | "provisioning" | "active" | "expired" | "failed" | "unknown";
  verified: boolean;
  dnsInstructions: DnsInstruction[];
}

export interface DnsInstruction {
  type: "CNAME" | "TXT" | "A";
  name: string;
  target: string;
  ttl: string;
}

export interface DomainWriteResult {
  status: DomainWriteStatus;
  message: string;
}

const PublicationDomainSchema = z.object({
  custom_domain: z.string().nullable().optional(),
  custom_domain_optional: z.boolean().optional(),
  subdomain: z.string(),
});

export async function fetchDomainStatus(
  publicationUrl: string,
  material: ApiAuthMaterial,
  fetchFn: FetchLike,
): Promise<DomainStatusResult> {
  const headers = apiHeaders(material);
  const endpoint = new URL("/api/v1/publication", publicationUrl).toString();

  const response = await requestJson(fetchFn, endpoint, headers);

  if (response.status !== 200) {
    const failure = classifyFailure(response.status, endpoint);
    return {
      status: failure.status,
      message: failure.message,
    };
  }

  const parsed = PublicationDomainSchema.safeParse(response.body);
  if (!parsed.success) {
    return {
      status: "schema-drift",
      message: "The publication response did not match the expected shape for domain fields.",
    };
  }

  const data = parsed.data;
  const customDomain = data.custom_domain ?? null;
  const subdomain = data.subdomain;

  const rawBody = response.body as Record<string, unknown> | undefined;
  const sslRaw =
    typeof rawBody?.custom_domain_ssl_status === "string"
      ? rawBody.custom_domain_ssl_status
      : "unknown";

  const sslStatus = mapSslStatus(sslRaw);
  const verified = customDomain !== null;

  const dnsInstructions = generateDnsInstructions(subdomain, customDomain);

  return {
    status: "ok",
    domain: {
      customDomain,
      customDomainOptional: data.custom_domain_optional ?? false,
      subdomain,
      publicationUrl,
      sslStatus,
      verified,
      dnsInstructions,
    },
    message: "Domain status retrieved successfully.",
  };
}

function mapSslStatus(raw: string): DomainStatus["sslStatus"] {
  switch (raw) {
    case "not_provisioned":
    case "provisioning":
    case "active":
    case "expired":
    case "failed":
      return raw;
    default:
      return "unknown";
  }
}

function generateDnsInstructions(subdomain: string, customDomain: string | null): DnsInstruction[] {
  if (!customDomain) {
    return [];
  }

  const canonicalTarget = `${subdomain}.substack.com`;
  const parts = customDomain.split(".");
  const isApex = parts.length === 2;

  if (isApex) {
    return [
      {
        type: "CNAME",
        name: "@",
        target: canonicalTarget,
        ttl: "3600",
      },
    ];
  }

  const dnsName = parts[0] ?? customDomain;

  return [
    {
      type: "CNAME",
      name: dnsName,
      target: canonicalTarget,
      ttl: "3600",
    },
  ];
}

/**
 * Validate that a domain string is a reasonable custom domain format.
 * Accepts apex domains (example.com) and subdomains (newsletter.example.com).
 * Rejects empty strings, protocol-prefixed URLs, paths, or wildcard domains.
 */
export function validateDomainFormat(domain: string): { valid: boolean; reason?: string } {
  if (!domain || domain.trim().length === 0) {
    return { valid: false, reason: "Domain must not be empty." };
  }

  if (domain.startsWith("http://") || domain.startsWith("https://")) {
    return {
      valid: false,
      reason: "Domain must not include a protocol prefix (http:// or https://).",
    };
  }

  if (domain.includes("/")) {
    return { valid: false, reason: "Domain must not include a path." };
  }

  if (domain.startsWith("*.") || domain.startsWith("*")) {
    return { valid: false, reason: "Wildcard domains are not supported." };
  }

  if (domain.startsWith(".") || domain.endsWith(".")) {
    return { valid: false, reason: "Domain must not start or end with a dot." };
  }

  const parts = domain.split(".");
  if (parts.length < 2) {
    return { valid: false, reason: "Domain must include at least a TLD (e.g., example.com)." };
  }

  const tld = parts[parts.length - 1];
  if (!tld || tld.length < 2) {
    return { valid: false, reason: "TLD must be at least 2 characters." };
  }

  // Basic character check: allow letters, digits, hyphens, dots
  if (!/^[a-zA-Z0-9.-]+$/.test(domain)) {
    return { valid: false, reason: "Domain contains invalid characters." };
  }

  // No consecutive dots
  if (domain.includes("..")) {
    return { valid: false, reason: "Domain must not contain consecutive dots." };
  }

  return { valid: true };
}

/**
 * Parse a domain string to determine if it is an apex domain or a subdomain.
 */
export function classifyDomainType(domain: string): "apex" | "subdomain" | "invalid" {
  const validation = validateDomainFormat(domain);
  if (!validation.valid) {
    return "invalid";
  }

  const parts = domain.split(".");
  if (parts.length === 2) {
    return "apex";
  }

  return "subdomain";
}

/**
 * Attempt to set a custom domain via the Substack API.
 * The domain set endpoint has not been confirmed to exist. This probes
 * likely paths and reports back what was found.
 */
export async function trySetDomain(
  publicationUrl: string,
  material: ApiAuthMaterial,
  fetchFn: FetchLike,
  domain: string,
): Promise<DomainWriteResult> {
  const validation = validateDomainFormat(domain);
  if (!validation.valid) {
    return { status: "schema-drift", message: `Invalid domain: ${validation.reason}` };
  }

  const headers = apiHeaders(material);
  const knownEndpoints = [
    "/api/v1/publication/custom_domain",
    "/api/v1/publication/domain",
    "/api/v1/publication/update",
  ];

  for (const endpointPath of knownEndpoints) {
    const endpoint = new URL(endpointPath, publicationUrl).toString();
    let body: Record<string, unknown>;

    if (endpointPath === "/api/v1/publication/update") {
      body = { custom_domain: domain };
    } else {
      body = { domain };
    }

    const response = await requestWrite(fetchFn, endpoint, "POST", headers, body);

    if (response.status < 300) {
      return { status: "ok", message: "Custom domain set successfully." };
    }

    if (response.status === 401 || response.status === 403) {
      return {
        status: classifyDomainWriteStatus(response.status),
        message: classifyDomainWriteMessage(response.status, endpointPath),
      };
    }
  }

  return {
    status: "not-found",
    message:
      "No confirmed endpoint found for setting a custom domain. The Substack dashboard UI may use a different API path. Use the browser to set up custom domains via Settings → Brand → Custom Domain.",
  };
}

/**
 * Attempt to remove a custom domain via the Substack API.
 * The domain remove endpoint has not been confirmed to exist. This probes
 * likely paths and reports back what was found.
 */
export async function tryRemoveDomain(
  publicationUrl: string,
  material: ApiAuthMaterial,
  fetchFn: FetchLike,
): Promise<DomainWriteResult> {
  const headers = apiHeaders(material);
  const knownEndpoints = ["/api/v1/publication/custom_domain", "/api/v1/publication/domain"];

  for (const endpointPath of knownEndpoints) {
    const endpoint = new URL(endpointPath, publicationUrl).toString();
    const response = await requestWrite(fetchFn, endpoint, "POST", headers, {
      custom_domain: null,
    });

    if (response.status < 300) {
      return {
        status: "ok",
        message: "Custom domain removed. Publication reverted to Substack subdomain.",
      };
    }

    if (response.status === 401 || response.status === 403) {
      return {
        status: classifyDomainWriteStatus(response.status),
        message: classifyDomainWriteMessage(response.status, endpointPath),
      };
    }
  }

  return {
    status: "not-found",
    message:
      "No confirmed endpoint found for removing a custom domain. Use the Substack dashboard at Settings → Brand → Custom Domain to disconnect.",
  };
}

function classifyDomainWriteStatus(status: number): DomainWriteStatus {
  if (status === 401) return "unauthenticated";
  if (status === 403) return "forbidden";
  if (status === 404) return "not-found";
  return "schema-drift";
}

function classifyDomainWriteMessage(status: number, endpoint: string): string {
  if (status === 401) {
    return `Substack rejected the session as unauthenticated at ${endpoint}.`;
  }
  if (status === 403) {
    return `Substack rejected the session with a forbidden response at ${endpoint}.`;
  }
  return `Unexpected response status ${status} from ${endpoint}.`;
}
