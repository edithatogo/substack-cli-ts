import { z } from "zod";
import type { ApiAuthMaterial } from "./auth.js";
import { type FetchLike, apiHeaders, classifyFailure, requestJson } from "./client.js";

export type DomainReadStatus =
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
