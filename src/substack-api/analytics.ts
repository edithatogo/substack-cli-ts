import type { ApiAuthMaterial } from "./auth.js";
import { apiHeaders, classifyFailure, type FetchLike, requestJson } from "./client.js";
import { isRecord } from "./parse-utils.js";

export type AnalyticsReadStatus =
  | "ok"
  | "unauthenticated"
  | "forbidden"
  | "not-found"
  | "schema-drift"
  | "network-error";

export interface PostAnalytics {
  postId: number;
  title: string;
  views: number;
  readRate: number | null;
  emailOpens: number | null;
  emailClicks: number | null;
  referrers: ReferrerEntry[];
}

export interface ReferrerEntry {
  source: string;
  views: number;
}

export interface PostAnalyticsResult {
  status: AnalyticsReadStatus;
  analytics?: PostAnalytics | undefined;
  message: string;
}

export interface SubscriberGrowth {
  period: string;
  totalSubscribers: number;
  netChange: number;
  freeSubscribers: number;
  paidSubscribers: number;
  churned: number;
}

export interface SubscriberGrowthResult {
  status: AnalyticsReadStatus;
  growth?: SubscriberGrowth | undefined;
  message: string;
}

export interface EmailPerformance {
  postId: number;
  title: string;
  sentAt: string | null;
  recipients: number;
  delivered: number;
  opens: number;
  openRate: number;
  clicks: number;
  clickRate: number;
  unsubscribes: number;
}

export interface EmailPerformanceResult {
  status: AnalyticsReadStatus;
  emails?: EmailPerformance[] | undefined;
  message: string;
}

export interface RevenueAnalytics {
  period: string;
  newPaidSubscribers: number;
  churnedPaidSubscribers: number;
  mrr: number | null;
  totalRevenue: number | null;
}

export interface RevenueAnalyticsResult {
  status: AnalyticsReadStatus;
  revenue?: RevenueAnalytics | undefined;
  message: string;
}

export interface AnalyticsSnapshot {
  capturedAt: string;
  postAnalytics?: PostAnalytics | undefined;
  subscriberGrowth?: SubscriberGrowth | undefined;
  emailPerformance?: EmailPerformance[] | undefined;
  revenue?: RevenueAnalytics | undefined;
}

export interface AnalyticsInventoryResult {
  status: AnalyticsReadStatus;
  endpoints: string[];
  postAnalytics: PostAnalyticsResult | null;
  subscriberGrowth: SubscriberGrowthResult | null;
  emailPerformance: EmailPerformanceResult | null;
  revenue: RevenueAnalyticsResult | null;
  message: string;
}

export async function fetchPostAnalytics(
  publicationUrl: string,
  postId: number,
  material: ApiAuthMaterial,
  fetchFn: FetchLike,
): Promise<PostAnalyticsResult> {
  const headers = apiHeaders(material);
  const endpoints = [
    `/api/v1/post/${postId}/analytics`,
    `/api/v1/posts/${postId}/analytics`,
    `/api/v1/analytics/post/${postId}`,
    `/api/v1/publication/analytics/posts/${postId}`,
  ];

  for (const path of endpoints) {
    const url = new URL(path, publicationUrl).toString();
    const response = await requestJson(fetchFn, url, headers);
    if (response.status === 200) {
      const body = response.body as Record<string, unknown> | undefined;
      if (body) {
        return {
          status: "ok",
          analytics: mapPostAnalytics(postId, body),
          message: `Post analytics retrieved from ${path}.`,
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
    message: "No post analytics endpoint found. Substack analytics may be dashboard-only.",
  };
}

export async function fetchSubscriberGrowth(
  publicationUrl: string,
  material: ApiAuthMaterial,
  fetchFn: FetchLike,
  options: { period?: string | undefined } = {},
): Promise<SubscriberGrowthResult> {
  const headers = apiHeaders(material);
  const endpoints = [
    "/api/v1/publication/analytics/subscribers",
    "/api/v1/analytics/subscribers",
    "/api/v1/publication/subscribers/growth",
  ];

  for (const path of endpoints) {
    const url = new URL(path, publicationUrl);
    if (options.period) {
      url.searchParams.set("period", options.period);
    }
    const requestUrl = url.toString();
    const response = await requestJson(fetchFn, requestUrl, headers);
    if (response.status === 200) {
      const body = response.body as Record<string, unknown> | undefined;
      if (body) {
        return {
          status: "ok",
          growth: mapSubscriberGrowth(body),
          message: `Subscriber growth retrieved from ${path}.`,
        };
      }
    }
    if (response.status !== 404) {
      const failure = classifyFailure(response.status, requestUrl);
      return { status: failure.status, message: failure.message };
    }
  }

  return {
    status: "not-found",
    message: "No subscriber growth endpoint found. This data may be dashboard-only.",
  };
}

export async function fetchEmailPerformance(
  publicationUrl: string,
  material: ApiAuthMaterial,
  fetchFn: FetchLike,
  limit = 10,
): Promise<EmailPerformanceResult> {
  const headers = apiHeaders(material);
  const endpoints = [
    "/api/v1/publication/analytics/emails",
    "/api/v1/analytics/emails",
    "/api/v1/publication/emails/performance",
  ];

  for (const path of endpoints) {
    const url = new URL(path, publicationUrl).toString();
    const response = await requestJson(fetchFn, url, headers);
    if (response.status === 200) {
      const body = response.body;
      const emails = parseEmailPerformance(body, limit);
      if (emails) {
        return {
          status: "ok",
          emails,
          message: `Email performance retrieved from ${path}.`,
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
    message: "No email performance endpoint found. This data may be dashboard-only.",
  };
}

export async function fetchRevenueAnalytics(
  publicationUrl: string,
  material: ApiAuthMaterial,
  fetchFn: FetchLike,
): Promise<RevenueAnalyticsResult> {
  const headers = apiHeaders(material);
  const endpoints = [
    "/api/v1/publication/analytics/revenue",
    "/api/v1/analytics/revenue",
    "/api/v1/publication/revenue",
  ];

  for (const path of endpoints) {
    const url = new URL(path, publicationUrl).toString();
    const response = await requestJson(fetchFn, url, headers);
    if (response.status === 200) {
      const body = response.body as Record<string, unknown> | undefined;
      if (body) {
        return {
          status: "ok",
          revenue: mapRevenueAnalytics(body),
          message: `Revenue analytics retrieved from ${path}.`,
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
    message: "No revenue analytics endpoint found. This data may be dashboard-only.",
  };
}

export async function fetchAnalyticsInventory(
  publicationUrl: string,
  material: ApiAuthMaterial,
  fetchFn: FetchLike,
  postId?: number,
): Promise<AnalyticsInventoryResult> {
  const endpoints: string[] = [];
  let postAnalytics: PostAnalyticsResult | null = null;
  let subscriberGrowth: SubscriberGrowthResult | null = null;
  let emailPerformance: EmailPerformanceResult | null = null;
  let revenue: RevenueAnalyticsResult | null = null;

  if (postId) {
    postAnalytics = await fetchPostAnalytics(publicationUrl, postId, material, fetchFn);
    endpoints.push(`/api/v1/post/${postId}/analytics`);
  }

  subscriberGrowth = await fetchSubscriberGrowth(publicationUrl, material, fetchFn);
  endpoints.push("/api/v1/publication/analytics/subscribers");

  emailPerformance = await fetchEmailPerformance(publicationUrl, material, fetchFn);
  endpoints.push("/api/v1/publication/analytics/emails");

  revenue = await fetchRevenueAnalytics(publicationUrl, material, fetchFn);
  endpoints.push("/api/v1/publication/analytics/revenue");

  const allNotFound =
    (postAnalytics?.status === "not-found" || !postAnalytics) &&
    subscriberGrowth.status === "not-found" &&
    emailPerformance.status === "not-found" &&
    revenue.status === "not-found";

  return {
    status: allNotFound ? "not-found" : "ok",
    endpoints,
    postAnalytics,
    subscriberGrowth,
    emailPerformance,
    revenue,
    message: allNotFound
      ? "No analytics endpoints discovered. Substack analytics are dashboard-only."
      : "Analytics inventory completed with partial results.",
  };
}

function mapPostAnalytics(postId: number, body: Record<string, unknown>): PostAnalytics {
  const title =
    typeof body.title === "string"
      ? body.title
      : typeof body.post_title === "string"
        ? body.post_title
        : `Post ${postId}`;
  const views =
    typeof body.views === "number"
      ? body.views
      : typeof body.view_count === "number"
        ? body.view_count
        : typeof body.pageviews === "number"
          ? body.pageviews
          : 0;
  const readRate =
    typeof body.read_rate === "number"
      ? body.read_rate
      : typeof body.readRate === "number"
        ? body.readRate
        : null;
  const emailOpens =
    typeof body.email_opens === "number"
      ? body.email_opens
      : typeof body.opens === "number"
        ? body.opens
        : null;
  const emailClicks =
    typeof body.email_clicks === "number"
      ? body.email_clicks
      : typeof body.clicks === "number"
        ? body.clicks
        : null;

  const referrers: ReferrerEntry[] = [];
  const rawReferrers = body.referrers ?? body.referrer_list;
  if (Array.isArray(rawReferrers)) {
    for (const item of rawReferrers) {
      if (!isRecord(item)) continue;
      const record = item;
      const source =
        typeof record.source === "string"
          ? record.source
          : typeof record.name === "string"
            ? record.name
            : typeof record.referrer === "string"
              ? record.referrer
              : "unknown";
      const refViews =
        typeof record.views === "number"
          ? record.views
          : typeof record.count === "number"
            ? record.count
            : 0;
      referrers.push({ source, views: refViews });
    }
  }

  return { postId, title, views, readRate, emailOpens, emailClicks, referrers };
}

function mapSubscriberGrowth(body: Record<string, unknown>): SubscriberGrowth {
  const period =
    typeof body.period === "string"
      ? body.period
      : typeof body.date_range === "string"
        ? body.date_range
        : "unknown";
  const totalSubscribers =
    typeof body.total_subscribers === "number"
      ? body.total_subscribers
      : typeof body.subscriber_count === "number"
        ? body.subscriber_count
        : typeof body.total === "number"
          ? body.total
          : 0;
  const netChange =
    typeof body.net_change === "number"
      ? body.net_change
      : typeof body.netChange === "number"
        ? body.netChange
        : typeof body.change === "number"
          ? body.change
          : 0;
  const freeSubscribers =
    typeof body.free_subscribers === "number"
      ? body.free_subscribers
      : typeof body.free === "number"
        ? body.free
        : 0;
  const paidSubscribers =
    typeof body.paid_subscribers === "number"
      ? body.paid_subscribers
      : typeof body.paid === "number"
        ? body.paid
        : 0;
  const churned =
    typeof body.churned === "number"
      ? body.churned
      : typeof body.unsubscribes === "number"
        ? body.unsubscribes
        : 0;

  return { period, totalSubscribers, netChange, freeSubscribers, paidSubscribers, churned };
}

function parseEmailPerformance(body: unknown, limit: number): EmailPerformance[] | null {
  const items = Array.isArray(body)
    ? body
    : body && typeof body === "object" && Array.isArray((body as Record<string, unknown>).emails)
      ? ((body as Record<string, unknown>).emails as unknown[])
      : null;

  if (!items) return null;

  const results: EmailPerformance[] = [];
  for (const item of items.slice(0, limit)) {
    if (!isRecord(item)) continue;
    const record = item;
    const postId =
      typeof record.post_id === "number"
        ? record.post_id
        : typeof record.postId === "number"
          ? record.postId
          : 0;
    const title =
      typeof record.title === "string"
        ? record.title
        : typeof record.subject === "string"
          ? record.subject
          : `Post ${postId}`;
    const sentAt =
      typeof record.sent_at === "string"
        ? record.sent_at
        : typeof record.sentAt === "string"
          ? record.sentAt
          : typeof record.date === "string"
            ? record.date
            : null;
    const recipients =
      typeof record.recipients === "number"
        ? record.recipients
        : typeof record.total_recipients === "number"
          ? record.total_recipients
          : 0;
    const delivered = typeof record.delivered === "number" ? record.delivered : recipients;
    const opens =
      typeof record.opens === "number"
        ? record.opens
        : typeof record.open_count === "number"
          ? record.open_count
          : 0;
    const openRate =
      typeof record.open_rate === "number"
        ? record.open_rate
        : typeof record.openRate === "number"
          ? record.openRate
          : delivered > 0
            ? opens / delivered
            : 0;
    const clicks =
      typeof record.clicks === "number"
        ? record.clicks
        : typeof record.click_count === "number"
          ? record.click_count
          : 0;
    const clickRate =
      typeof record.click_rate === "number"
        ? record.click_rate
        : typeof record.clickRate === "number"
          ? record.clickRate
          : delivered > 0
            ? clicks / delivered
            : 0;
    const unsubscribes =
      typeof record.unsubscribes === "number"
        ? record.unsubscribes
        : typeof record.unsubscribe_count === "number"
          ? record.unsubscribe_count
          : 0;

    results.push({
      postId,
      title,
      sentAt,
      recipients,
      delivered,
      opens,
      openRate,
      clicks,
      clickRate,
      unsubscribes,
    });
  }

  return results.length > 0 ? results : null;
}

function mapRevenueAnalytics(body: Record<string, unknown>): RevenueAnalytics {
  const period =
    typeof body.period === "string"
      ? body.period
      : typeof body.date_range === "string"
        ? body.date_range
        : "unknown";
  const newPaidSubscribers =
    typeof body.new_paid_subscribers === "number"
      ? body.new_paid_subscribers
      : typeof body.new_paid === "number"
        ? body.new_paid
        : 0;
  const churnedPaidSubscribers =
    typeof body.churned_paid_subscribers === "number"
      ? body.churned_paid_subscribers
      : typeof body.churned_paid === "number"
        ? body.churned_paid
        : 0;
  const mrr =
    typeof body.mrr === "number"
      ? body.mrr
      : typeof body.monthly_recurring_revenue === "number"
        ? body.monthly_recurring_revenue
        : null;
  const totalRevenue =
    typeof body.total_revenue === "number"
      ? body.total_revenue
      : typeof body.revenue === "number"
        ? body.revenue
        : null;

  return { period, newPaidSubscribers, churnedPaidSubscribers, mrr, totalRevenue };
}
