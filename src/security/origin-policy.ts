export interface OriginPolicyOptions {
  publicationOrigin: string;
  platformOrigin?: string;
}

export class TrustedOriginPolicy {
  private readonly trustedOrigins: ReadonlySet<string>;

  constructor(options: OriginPolicyOptions) {
    this.trustedOrigins = new Set([
      normalizeTrustedOrigin(options.publicationOrigin),
      normalizeTrustedOrigin(options.platformOrigin ?? "https://substack.com"),
    ]);
  }

  isTrusted(value: string | URL): boolean {
    try {
      const url = typeof value === "string" ? new URL(value) : value;
      return url.protocol === "https:" && this.trustedOrigins.has(url.origin);
    } catch {
      return false;
    }
  }

  assertTrusted(value: string | URL): URL {
    const url = typeof value === "string" ? new URL(value) : value;
    if (!this.isTrusted(url)) {
      throw new Error(`Untrusted HTTPS origin: ${url.origin}`);
    }
    return url;
  }

  assertRedirect(from: string | URL, to: string | URL): URL {
    this.assertTrusted(from);
    return this.assertTrusted(to);
  }
}

function normalizeTrustedOrigin(value: string): string {
  const url = new URL(value);
  if (url.protocol !== "https:" || url.username || url.password || url.pathname !== "/" || url.search || url.hash) {
    throw new Error(`Trusted origins must be HTTPS origins: ${value}`);
  }
  return url.origin;
}
