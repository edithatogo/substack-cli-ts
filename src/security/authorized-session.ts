export type PublicationRole = "owner" | "admin" | "author" | "editor";

export interface AuthorizedPublicationSession {
  readonly publicationId: number;
  readonly publicationOrigin: string;
  readonly role: PublicationRole;
}

export function authorizePublicationSession(input: {
  publicationId: number;
  configuredPublicationId: number;
  publicationOrigin: string;
  role?: string;
}): AuthorizedPublicationSession {
  if (!Number.isInteger(input.publicationId) || input.publicationId !== input.configuredPublicationId) {
    throw new Error("Authenticated session is not authorized for the configured publication.");
  }
  if (!isPublicationRole(input.role)) {
    throw new Error("Authenticated session has no permitted publication role.");
  }
  const origin = new URL(input.publicationOrigin);
  if (origin.protocol !== "https:") {
    throw new Error("Publication authorization requires an HTTPS origin.");
  }
  return { publicationId: input.publicationId, publicationOrigin: origin.origin, role: input.role };
}

function isPublicationRole(value: string | undefined): value is PublicationRole {
  return value === "owner" || value === "admin" || value === "author" || value === "editor";
}
