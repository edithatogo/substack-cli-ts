import type { ApiAuthMaterial } from "./auth.js";
import {
  apiHeaders,
  classifyFailure,
  type FetchLike,
  requestJson,
  requestWrite,
} from "./client.js";
import { isRecord } from "./parse-utils.js";

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

export interface EmailTemplateUpdate {
  headerHtml?: string | undefined;
  footerHtml?: string | undefined;
  logoUrl?: string | undefined;
  primaryColor?: string | undefined;
  backgroundColor?: string | undefined;
  textColor?: string | undefined;
  fontFamily?: string | undefined;
}

export interface UpdateEmailTemplateResult {
  status: "ok" | "failed";
  message: string;
  updated?: EmailTemplateUpdate | undefined;
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
  limit = 20,
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

export async function updateEmailTemplate(
  publicationUrl: string,
  material: ApiAuthMaterial,
  fetchFn: FetchLike,
  updates: EmailTemplateUpdate,
  options: { dryRun?: boolean | undefined; confirm?: boolean | undefined } = {},
): Promise<UpdateEmailTemplateResult> {
  const shouldPreview = options.dryRun === true || options.confirm !== true;
  if (shouldPreview) {
    return {
      status: "ok",
      message: "Preview of email template changes (no write performed)",
      updated: updates,
    };
  }

  const headers = apiHeaders(material);
  const endpoints = [
    "/api/v1/publication/email_template",
    "/api/v1/publication/settings/email",
    "/api/v1/email_template",
  ];

  const body = mapEmailTemplateUpdateToBody(updates);

  for (const path of endpoints) {
    const url = new URL(path, publicationUrl).toString();
    const response = await requestWrite(fetchFn, url, "POST", headers, body);
    if (response.status === 200) {
      return {
        status: "ok",
        message: `Email template updated via ${path}.`,
        updated: updates,
      };
    }
    if (response.status === 404) {
      continue;
    }
    return {
      status: "failed",
      message: `Update failed with HTTP ${response.status} on ${path}.`,
    };
  }

  return {
    status: "failed",
    message:
      "No writable email template endpoint found. Email template editing may be dashboard-only.",
  };
}

function mapEmailTemplateUpdateToBody(updates: EmailTemplateUpdate): Record<string, unknown> {
  const body: Record<string, unknown> = {};
  if (updates.headerHtml !== undefined) {
    body.header_html = updates.headerHtml;
    body.header = updates.headerHtml;
  }
  if (updates.footerHtml !== undefined) {
    body.footer_html = updates.footerHtml;
    body.footer = updates.footerHtml;
  }
  if (updates.logoUrl !== undefined) {
    body.logo_url = updates.logoUrl;
    body.logoUrl = updates.logoUrl;
  }
  if (updates.primaryColor !== undefined) {
    body.primary_color = updates.primaryColor;
    body.primaryColor = updates.primaryColor;
    body.color = updates.primaryColor;
  }
  if (updates.backgroundColor !== undefined) {
    body.background_color = updates.backgroundColor;
    body.backgroundColor = updates.backgroundColor;
  }
  if (updates.textColor !== undefined) {
    body.text_color = updates.textColor;
    body.textColor = updates.textColor;
  }
  if (updates.fontFamily !== undefined) {
    body.font_family = updates.fontFamily;
    body.fontFamily = updates.fontFamily;
  }
  return body;
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
    if (!isRecord(item)) continue;
    const record = item;
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
