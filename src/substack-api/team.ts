import type { ApiAuthMaterial } from "./auth.js";
import {
  apiHeaders,
  classifyFailure,
  type FetchLike,
  requestJson,
  requestWrite,
} from "./client.js";

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

export interface TeamActivityEntry {
  id: string;
  actor: string | null;
  action: string;
  createdAt: string | null;
}

export interface TeamActivityResult {
  status: TeamReadStatus;
  activities?: TeamActivityEntry[] | undefined;
  message: string;
}

export interface TeamWriteResult {
  status: TeamReadStatus;
  message: string;
}

export async function fetchTeamMembers(
  publicationUrl: string,
  material: ApiAuthMaterial,
  fetchFn: FetchLike,
  options: { includeEmails?: boolean | undefined } = {},
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
          : Number.NaN;
    const role = typeof record.role === "string" ? record.role : "";
    const name =
      typeof record.name === "string"
        ? record.name
        : typeof (record as Record<string, unknown>).display_name === "string"
          ? ((record as Record<string, unknown>).display_name as string)
          : "";
    const rawEmail = typeof record.email === "string" ? record.email : undefined;
    const email =
      rawEmail === undefined
        ? undefined
        : options.includeEmails === true
          ? rawEmail
          : redactEmail(rawEmail);

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

export function redactEmail(email: string): string {
  const [local = "", domain = ""] = email.split("@", 2);
  if (!domain) return redactLoose(email);
  return `${redactLoose(local)}@${domain}`;
}

export async function fetchTeamActivity(
  publicationUrl: string,
  material: ApiAuthMaterial,
  fetchFn: FetchLike,
): Promise<TeamActivityResult> {
  const headers = apiHeaders(material);
  const endpoints = [
    "/api/v1/publication/team/activity",
    "/api/v1/publication/users/activity",
    "/api/v1/team/activity",
  ];

  for (const path of endpoints) {
    const url = new URL(path, publicationUrl).toString();
    const response = await requestJson(fetchFn, url, headers);
    if (response.status === 200) {
      const activities = parseTeamActivity(response.body);
      if (activities) {
        return {
          status: "ok",
          activities,
          message: `Found ${activities.length} team activity entries.`,
        };
      }
    }
    if (response.status !== 404) {
      const failure = classifyFailure(response.status, url);
      return { status: failure.status, message: failure.message };
    }
  }

  return {
    status: "not-found",
    message: "No team activity endpoint found. Team activity may be dashboard-only.",
  };
}

export async function inviteTeamMember(
  publicationUrl: string,
  email: string,
  role: string,
  material: ApiAuthMaterial,
  fetchFn: FetchLike,
): Promise<TeamWriteResult> {
  if (!isValidTeamRole(role)) {
    return { status: "schema-drift", message: `Invalid role: ${role}.` };
  }
  return writeTeamProbe(
    publicationUrl,
    material,
    fetchFn,
    ["/api/v1/publication/users/invite", "/api/v1/publication/team/invite", "/api/v1/team/invite"],
    { email, role },
    "Team invite sent.",
  );
}

export async function removeTeamMember(
  publicationUrl: string,
  userId: number,
  material: ApiAuthMaterial,
  fetchFn: FetchLike,
): Promise<TeamWriteResult> {
  return writeTeamProbe(
    publicationUrl,
    material,
    fetchFn,
    [
      `/api/v1/publication/users/${userId}/remove`,
      `/api/v1/publication/team/${userId}/remove`,
      `/api/v1/team/${userId}/remove`,
    ],
    { user_id: userId },
    "Team member removed.",
  );
}

export async function changeTeamMemberRole(
  publicationUrl: string,
  userId: number,
  role: string,
  material: ApiAuthMaterial,
  fetchFn: FetchLike,
): Promise<TeamWriteResult> {
  if (!isValidTeamRole(role)) {
    return { status: "schema-drift", message: `Invalid role: ${role}.` };
  }
  return writeTeamProbe(
    publicationUrl,
    material,
    fetchFn,
    [
      `/api/v1/publication/users/${userId}/role`,
      `/api/v1/publication/team/${userId}/role`,
      `/api/v1/team/${userId}/role`,
    ],
    { user_id: userId, role },
    "Team member role updated.",
  );
}

export function isValidTeamRole(role: string): boolean {
  return ["admin", "editor", "contributor", "reader"].includes(role);
}

async function writeTeamProbe(
  publicationUrl: string,
  material: ApiAuthMaterial,
  fetchFn: FetchLike,
  paths: string[],
  body: Record<string, unknown>,
  okMessage: string,
): Promise<TeamWriteResult> {
  const headers = apiHeaders(material);
  for (const path of paths) {
    const url = new URL(path, publicationUrl).toString();
    const response = await requestWrite(fetchFn, url, "POST", headers, body);
    if (response.status === 200 || response.status === 201 || response.status === 204) {
      return { status: "ok", message: okMessage };
    }
    if (response.status !== 404) {
      const failure = classifyFailure(response.status, url);
      return { status: failure.status, message: failure.message };
    }
  }
  return {
    status: "not-found",
    message: "No writable team endpoint found. Team management may be dashboard-only.",
  };
}

function parseTeamActivity(body: unknown): TeamActivityEntry[] | null {
  const items = Array.isArray(body)
    ? body
    : body &&
        typeof body === "object" &&
        Array.isArray((body as Record<string, unknown>).activities)
      ? ((body as Record<string, unknown>).activities as unknown[])
      : body && typeof body === "object" && Array.isArray((body as Record<string, unknown>).data)
        ? ((body as Record<string, unknown>).data as unknown[])
        : null;
  if (!items) return null;
  return items.map((item, index) => {
    const record = item as Record<string, unknown>;
    const id =
      typeof record.id === "string"
        ? record.id
        : typeof record.id === "number"
          ? String(record.id)
          : String(index);
    return {
      id,
      actor: typeof record.actor === "string" ? record.actor : null,
      action: typeof record.action === "string" ? record.action : "unknown",
      createdAt:
        typeof record.created_at === "string"
          ? record.created_at
          : typeof record.createdAt === "string"
            ? record.createdAt
            : null,
    };
  });
}

function redactLoose(value: string): string {
  if (value.length <= 2) return "**";
  return `${value.slice(0, 1)}...${value.slice(-1)}`;
}
