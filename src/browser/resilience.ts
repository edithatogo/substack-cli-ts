export type UpstreamChallengeKind = "cloudflare" | "forbidden";

export interface UpstreamChallenge {
  kind: UpstreamChallengeKind;
  status: number;
  message: string;
  action: string;
}

export interface ChallengeResponseEvidence {
  status: number;
  bodyText: string;
  headers?: { get(name: string): string | null | undefined } | undefined;
}

const CLOUDFLARE_MARKERS = [
  "cf-chl-",
  "cf-ray",
  "/cdn-cgi/challenge-platform/",
  "attention required! | cloudflare",
  "just a moment...",
  "challenge-platform",
] as const;

export function detectUpstreamChallenge(
  evidence: ChallengeResponseEvidence,
): UpstreamChallenge | undefined {
  const body = evidence.bodyText.toLowerCase();
  const server = evidence.headers?.get("server")?.toLowerCase() ?? "";
  const isCloudflare =
    server.includes("cloudflare") || CLOUDFLARE_MARKERS.some((marker) => body.includes(marker));

  if (isCloudflare) {
    return {
      kind: "cloudflare",
      status: evidence.status,
      message: "Substack returned a Cloudflare or browser-verification challenge.",
      action:
        "Run `substack-publisher auth refresh-state` in a trusted local environment, complete the visible challenge, then retry.",
    };
  }

  if (evidence.status === 403) {
    return {
      kind: "forbidden",
      status: evidence.status,
      message: "Substack returned HTTP 403 and may require a refreshed browser session.",
      action:
        "Run `substack-publisher auth refresh-state` in a trusted local environment, then retry.",
    };
  }

  return undefined;
}
