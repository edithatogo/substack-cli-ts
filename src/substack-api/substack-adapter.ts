import { SubstackClient } from "substack-api";
import type { ApiAuthMaterial } from "./auth.js";

export function createSubstackClient(material: ApiAuthMaterial): SubstackClient {
  const token = extractSessionToken(material);
  return new SubstackClient({
    token,
    publicationUrl: material.publicationUrl,
  });
}

export function extractSessionToken(material: ApiAuthMaterial): string {
  const parts = material.cookieHeader.split(";").map((p) => p.trim());
  for (const part of parts) {
    const eq = part.indexOf("=");
    if (eq === -1) continue;
    const name = part.slice(0, eq);
    if (name === "substack.sid" || name === "connect.sid") {
      return part.slice(eq + 1);
    }
  }
  throw new Error(
    "No session cookie (substack.sid or connect.sid) found in API auth material.",
  );
}
