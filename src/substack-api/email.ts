import type { ApiAuthMaterial } from "./auth.js";
import {
  apiHeaders,
  classifyFailure,
  type FetchLike,
  requestJson,
  requestWrite,
} from "./client.js";

export type EmailReadStatus =
  | "ok"
  | "unauthenticated"
  | "forbidden"
  | "not-found"
  | "schema-drift"
  | "network-error";

export interface EmailTemplateSettings {
  headerHtml: string | null;
  footerHtml: string | null;
  logoUrl: string | null;
  primaryColor: string | null;
  backgroundColor: string | null;
  textColor: string | null;
  fontFamily: string | null;
}

export interface EmailTemplateResult {
  status: EmailReadStatus;
  template?: EmailTemplateSettings | undefined;
  message: string;
}

export interface BroadcastEntry {
  id: string;
  subject: string;
  sentAt: string | null;
  scheduledFor: string | null;
  status: string;
  postId: number | null;
  recipients: number | null;
}

export interface BroadcastListResult {
  status: EmailReadStatus;
  broadcasts?: BroadcastEntry[] | undefined;
  message: string;
}

export interface BroadcastCancelResult {
  status: "ok" | "failed";
  broadcastId: string;
  message: string;
}

export interface TestEmailResult {
  status: "ok" | "failed";
  draftId: number;
  message: string;
}

export async function fetchEmailTemplate(
  publicationUrl: string,
  material: ApiAuthMaterial,
  fetchFn: FetchLike,
): Promise<EmailTemplateResult> {
  const headers = apiHeaders(material);
  const endpoints = [
    "/api/v1/publication/email_template",
    "/api/v1/publication/settings/email",
    "/api/v1/email_template",
  ];

  for (const path of endpoints) {
    const url = new URL(path, publicationUrl).toString();
    const response = await requestJson(fetchFn, url, headers);
    if (response.status === 200) {
      const body = response.body as Record<string, unknown> | undefined;
      if (body) {
        return {
          status: "ok",
          template: mapEmailTemplate(body),
          message: `Email template retrieved from ${path}.`,
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
    message: "No email template endpoint found. Email design may be dashboard-only.",
  };
}

export async function fetchBroadcastHistory(
  publicationUrl: string,
  material: ApiAuthMaterial,
  fetchFn: FetchLike,
  limit: number = 20,
): Promise<BroadcastListResult> {
  const headers = apiHeaders(material);
  const endpoints = [
    "/api/v1/publication/broadcasts",
    "/api/v1/broadcasts",
    "/api/v1/publication/emails",
  ];

  for (const path of endpoints) {
    const url = new URL(path, publicationUrl).toString();
    const response = await requestJson(fetchFn, url, headers);
    if (response.status === 200) {
      const body = response.body;
      const broadcasts = parseBroadcasts(body, limit);
      if (broadcasts) {
        return {
          status: "ok",
          broadcasts,
          message: `Broadcast history retrieved from ${path}.`,
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
    message: "No broadcast history endpoint found. Broadcast data may be dashboard-only.",
  };
}

export async function cancelScheduledBroadcast(
  publicationUrl: string,
  broadcastId: string,
  material: ApiAuthMaterial,
  fetchFn: FetchLike,
): Promise<BroadcastCancelResult> {
  const headers = apiHeaders(material);
  const endpoints = [
    `/api/v1/broadcasts/${broadcastId}/cancel`,
    `/api/v1/publication/broadcasts/${broadcastId}/cancel`,
  ];

  for (const path of endpoints) {
    const url = new URL(path, publicationUrl).toString();
    const response = await requestWrite(fetchFn, url, "POST", headers, {});
    if (response.status === 200) {
      return {
        status: "ok",
        broadcastId,
        message: `Broadcast ${broadcastId} cancelled.`,
      };
    }
    if (response.status === 404) {
      continue;
    }
    const failure = classifyFailure(response.status, url);
    return {
      status: "failed",
      broadcastId,
      message: failure.message,
    };
  }

  return {
    status: "failed",
    broadcastId,
    message: "No broadcast cancel endpoint found.",
  };
}

export async function sendTestEmail(
  publicationUrl: string,
  draftId: number,
  material: ApiAuthMaterial,
  fetchFn: FetchLike,
): Promise<TestEmailResult> {
  const headers = apiHeaders(material);
  const endpoints = [
    `/api/v1/drafts/${draftId}/send_test`,
    `/api/v1/drafts/${draftId}/test`,
    `/api/v1/publication/drafts/${draftId}/send_test`,
  ];

  for (const path of endpoints) {
    const url = new URL(path, publicationUrl).toString();
    const response = await requestWrite(fetchFn, url, "POST", headers, {});
    if (response.status === 200) {
      return {
        status: "ok",
        draftId,
        message: `Test email sent for draft ${draftId}.`,
      };
    }
    if (response.status === 404) {
      continue;
    }
    const failure = classifyFailure(response.status, url);
    return {
      status: "failed",
      draftId,
      message: failure.message,
    };
  }

  return {
    status: "failed",
    draftId,
    message: "No test email endpoint found. Test sends may be dashboard-only.",
  };
}

function mapEmailTemplate(body: Record<string, unknown>): EmailTemplateSettings {
  const headerHtml =
    typeof body.header_html === "string"
      ? body.header_html
      : typeof body.header === "string"
        ? body.header
        : null;
  const footerHtml =
    typeof body.footer_html === "string"
      ? body.footer_html
      : typeof body.footer === "string"
        ? body.footer
        : null;
  const logoUrl =
    typeof body.logo_url === "string"
      ? body.logo_url
      : typeof body.logoUrl === "string"
        ? body.logoUrl
        : null;
  const primaryColor =
    typeof body.primary_color === "string"
      ? body.primary_color
      : typeof body.primaryColor === "string"
        ? body.primaryColor
        : typeof body.color === "string"
          ? body.color
          : null;
  const backgroundColor =
    typeof body.background_color === "string"
      ? body.background_color
      : typeof body.backgroundColor === "string"
        ? body.backgroundColor
        : null;
  const textColor =
    typeof body.text_color === "string"
      ? body.text_color
      : typeof body.textColor === "string"
        ? body.textColor
        : null;
  const fontFamily =
    typeof body.font_family === "string"
      ? body.font_family
      : typeof body.fontFamily === "string"
        ? body.fontFamily
        : null;

  return {
    headerHtml,
    footerHtml,
    logoUrl,
    primaryColor,
    backgroundColor,
    textColor,
    fontFamily,
  };
}

function parseBroadcasts(body: unknown, limit: number): BroadcastEntry[] | null {
  const items = Array.isArray(body)
    ? body
    : body &&
        typeof body === "object" &&
        Array.isArray((body as Record<string, unknown>).broadcasts)
      ? ((body as Record<string, unknown>).broadcasts as unknown[])
      : body && typeof body === "object" && Array.isArray((body as Record<string, unknown>).data)
        ? ((body as Record<string, unknown>).data as unknown[])
        : null;

  if (!items) return null;

  const broadcasts: BroadcastEntry[] = [];
  for (const item of items.slice(0, limit)) {
    const record = item as Record<string, unknown>;
    const id =
      typeof record.id === "string"
        ? record.id
        : typeof record.id === "number"
          ? String(record.id)
          : "";
    const subject =
      typeof record.subject === "string"
        ? record.subject
        : typeof record.title === "string"
          ? record.title
          : "";
    const sentAt =
      typeof record.sent_at === "string"
        ? record.sent_at
        : typeof record.sentAt === "string"
          ? record.sentAt
          : typeof record.sent_date === "string"
            ? record.sent_date
            : null;
    const scheduledFor =
      typeof record.scheduled_for === "string"
        ? record.scheduled_for
        : typeof record.scheduledFor === "string"
          ? record.scheduledFor
          : typeof record.scheduled_at === "string"
            ? record.scheduled_at
            : null;
    const status = typeof record.status === "string" ? record.status : "unknown";
    const postId =
      typeof record.post_id === "number"
        ? record.post_id
        : typeof record.postId === "number"
          ? record.postId
          : null;
    const recipients =
      typeof record.recipients === "number"
        ? record.recipients
        : typeof record.recipient_count === "number"
          ? record.recipient_count
          : null;

    broadcasts.push({ id, subject, sentAt, scheduledFor, status, postId, recipients });
  }

  return broadcasts.length > 0 ? broadcasts : null;
}
