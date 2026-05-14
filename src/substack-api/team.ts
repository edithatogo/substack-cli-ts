import type { ApiAuthMaterial } from "./auth.js";
import { apiHeaders, classifyFailure, type FetchLike, requestJson } from "./client.js";

export interface TeamMember {
  id: number;
  name: string;
  email?: string | undefined;
  role: string;
}

export type TeamReadStatus =
  | "ok"
  | "unauthenticated"
  | "forbidden"
  | "not-found"
  | "schema-drift"
  | "network-error";

export interface TeamResult {
  status: TeamReadStatus;
  members?: TeamMember[] | undefined;
  message: string;
}

export async function fetchTeamMembers(
  publicationUrl: string,
  material: ApiAuthMaterial,
  fetchFn: FetchLike,
): Promise<TeamResult> {
  const headers = apiHeaders(material);
  const endpoint = new URL("/api/v1/publication/users", publicationUrl).toString();
  const response = await requestJson(fetchFn, endpoint, headers);

  if (response.status !== 200) {
    const failure = classifyFailure(response.status, endpoint);
    return {
      status: failure.status,
      message: failure.message,
    };
  }

  const body = response.body;
  if (!Array.isArray(body)) {
    return {
      status: "schema-drift",
      message: "Team members response was not an array.",
    };
  }

  const members: TeamMember[] = [];
  for (const item of body) {
    const record = item as Record<string, unknown>;
    const id =
      typeof record.id === "number"
        ? record.id
        : typeof record.id === "string"
          ? Number(record.id)
          : NaN;
    const role = typeof record.role === "string" ? record.role : "";
    const name =
      typeof record.name === "string"
        ? record.name
        : typeof (record as Record<string, unknown>).display_name === "string"
          ? ((record as Record<string, unknown>).display_name as string)
          : "";
    const email = typeof record.email === "string" ? record.email : undefined;

    if (!Number.isNaN(id) && name) {
      members.push({ id, name, email, role });
    }
  }

  return {
    status: "ok",
    members,
    message: `Found ${members.length} team members.`,
  };
}
