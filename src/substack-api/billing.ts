import type { ApiAuthMaterial } from "./auth.js";
import { type FetchLike, apiHeaders, classifyFailure, requestJson } from "./client.js";
import { fetchPublication } from "./publication.js";

export type BillingReadStatus =
  | "ok"
  | "unauthenticated"
  | "forbidden"
  | "not-found"
  | "schema-drift"
  | "network-error";

export interface SubscriptionTier {
  id: string;
  name: string;
  priceMonthly: number | null;
  priceYearly: number | null;
  currency: string;
  description: string | null;
  isActive: boolean;
}

export interface SubscriptionTiersResult {
  status: BillingReadStatus;
  tiers?: SubscriptionTier[] | undefined;
  message: string;
}

export interface PayoutEntry {
  id: string;
  amount: number | null;
  currency: string;
  status: string;
  period: string | null;
  paidAt: string | null;
  estimatedArrival: string | null;
}

export interface PayoutHistoryResult {
  status: BillingReadStatus;
  payouts?: PayoutEntry[] | undefined;
  nextPayout: string | null;
  message: string;
}

export interface TaxFormStatus {
  formType: string;
  taxYear: number | null;
  status: string;
  filedAt: string | null;
}

export interface TaxFormsResult {
  status: BillingReadStatus;
  forms?: TaxFormStatus[] | undefined;
  message: string;
}

export interface BillingSummaryResult {
  status: BillingReadStatus;
  paymentsState: string | null;
  tiers: SubscriptionTiersResult | null;
  payouts: PayoutHistoryResult | null;
  taxes: TaxFormsResult | null;
  message: string;
}

export async function fetchSubscriptionTiers(
  publicationUrl: string,
  material: ApiAuthMaterial,
  fetchFn: FetchLike,
): Promise<SubscriptionTiersResult> {
  const headers = apiHeaders(material);
  const endpoints = [
    "/api/v1/publication/tiers",
    "/api/v1/tiers",
    "/api/v1/publication/subscription_tiers",
  ];

  for (const path of endpoints) {
    const url = new URL(path, publicationUrl).toString();
    const response = await requestJson(fetchFn, url, headers);
    if (response.status === 200) {
      const body = response.body;
      const tiers = parseTiers(body);
      if (tiers) {
        return {
          status: "ok",
          tiers,
          message: `Subscription tiers retrieved from ${path}.`,
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
    message: "No subscription tiers endpoint found. Tier management may be dashboard-only.",
  };
}

export async function fetchPayoutHistory(
  publicationUrl: string,
  material: ApiAuthMaterial,
  fetchFn: FetchLike,
): Promise<PayoutHistoryResult> {
  const headers = apiHeaders(material);
  const endpoints = [
    "/api/v1/publication/payouts",
    "/api/v1/payouts",
    "/api/v1/publication/revenue/payouts",
  ];

  for (const path of endpoints) {
    const url = new URL(path, publicationUrl).toString();
    const response = await requestJson(fetchFn, url, headers);
    if (response.status === 200) {
      const body = response.body;
      const result = parsePayouts(body);
      if (result) {
        return {
          status: "ok",
          payouts: result.payouts,
          nextPayout: result.nextPayout,
          message: `Payout history retrieved from ${path}.`,
        };
      }
    }
    if (response.status !== 404) {
      const failure = classifyFailure(response.status, url);
      return { status: failure.status, nextPayout: null, message: failure.message };
    }
  }

  return {
    status: "not-found",
    nextPayout: null,
    message: "No payout history endpoint found. Payout data may be dashboard-only.",
  };
}

export async function fetchTaxFormStatus(
  publicationUrl: string,
  material: ApiAuthMaterial,
  fetchFn: FetchLike,
): Promise<TaxFormsResult> {
  const headers = apiHeaders(material);
  const endpoints = [
    "/api/v1/publication/tax_forms",
    "/api/v1/tax_forms",
    "/api/v1/publication/taxes",
  ];

  for (const path of endpoints) {
    const url = new URL(path, publicationUrl).toString();
    const response = await requestJson(fetchFn, url, headers);
    if (response.status === 200) {
      const body = response.body;
      const forms = parseTaxForms(body);
      if (forms) {
        return {
          status: "ok",
          forms,
          message: `Tax form status retrieved from ${path}.`,
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
    message: "No tax form endpoint found. Tax data may be dashboard-only.",
  };
}

export async function fetchBillingSummary(
  publicationUrl: string,
  material: ApiAuthMaterial,
  fetchFn: FetchLike,
): Promise<BillingSummaryResult> {
  let paymentsState: string | null = null;
  try {
    const pub = await fetchPublication(publicationUrl, material, fetchFn);
    paymentsState = pub.paymentsState ?? null;
  } catch {
    paymentsState = null;
  }

  const tiers = await fetchSubscriptionTiers(publicationUrl, material, fetchFn);
  const payouts = await fetchPayoutHistory(publicationUrl, material, fetchFn);
  const taxes = await fetchTaxFormStatus(publicationUrl, material, fetchFn);

  const allNotFound =
    tiers.status === "not-found" && payouts.status === "not-found" && taxes.status === "not-found";

  return {
    status: allNotFound ? "not-found" : "ok",
    paymentsState,
    tiers,
    payouts,
    taxes,
    message: allNotFound
      ? "No billing endpoints discovered. Substack billing is dashboard-only."
      : "Billing summary completed with available data.",
  };
}

function parseTiers(body: unknown): SubscriptionTier[] | null {
  const items = Array.isArray(body)
    ? body
    : body && typeof body === "object" && Array.isArray((body as Record<string, unknown>).tiers)
      ? ((body as Record<string, unknown>).tiers as unknown[])
      : body && typeof body === "object" && Array.isArray((body as Record<string, unknown>).data)
        ? ((body as Record<string, unknown>).data as unknown[])
        : null;

  if (!items) return null;

  const tiers: SubscriptionTier[] = [];
  for (const item of items) {
    const record = item as Record<string, unknown>;
    const id =
      typeof record.id === "string"
        ? record.id
        : typeof record.id === "number"
          ? String(record.id)
          : "";
    const name =
      typeof record.name === "string"
        ? record.name
        : typeof record.title === "string"
          ? record.title
          : "Unknown";
    const priceMonthly =
      typeof record.price_monthly === "number"
        ? record.price_monthly
        : typeof record.monthly_price === "number"
          ? record.monthly_price
          : typeof record.price === "number"
            ? record.price
            : null;
    const priceYearly =
      typeof record.price_yearly === "number"
        ? record.price_yearly
        : typeof record.yearly_price === "number"
          ? record.yearly_price
          : null;
    const currency = typeof record.currency === "string" ? record.currency : "usd";
    const description = typeof record.description === "string" ? record.description : null;
    const isActive =
      typeof record.is_active === "boolean"
        ? record.is_active
        : typeof record.active === "boolean"
          ? record.active
          : true;

    if (id || name !== "Unknown") {
      tiers.push({ id, name, priceMonthly, priceYearly, currency, description, isActive });
    }
  }

  return tiers.length > 0 ? tiers : null;
}

function parsePayouts(body: unknown): { payouts: PayoutEntry[]; nextPayout: string | null } | null {
  const items = Array.isArray(body)
    ? body
    : body && typeof body === "object" && Array.isArray((body as Record<string, unknown>).payouts)
      ? ((body as Record<string, unknown>).payouts as unknown[])
      : body && typeof body === "object" && Array.isArray((body as Record<string, unknown>).data)
        ? ((body as Record<string, unknown>).data as unknown[])
        : null;

  if (!items) return null;

  const payouts: PayoutEntry[] = [];
  for (const item of items) {
    const record = item as Record<string, unknown>;
    const id =
      typeof record.id === "string"
        ? record.id
        : typeof record.id === "number"
          ? String(record.id)
          : "";
    const amount =
      typeof record.amount === "number"
        ? record.amount
        : typeof record.amount_cents === "number"
          ? record.amount_cents / 100
          : null;
    const currency = typeof record.currency === "string" ? record.currency : "usd";
    const status = typeof record.status === "string" ? record.status : "unknown";
    const period =
      typeof record.period === "string"
        ? record.period
        : typeof record.period_start === "string"
          ? record.period_start
          : null;
    const paidAt =
      typeof record.paid_at === "string"
        ? record.paid_at
        : typeof record.paidAt === "string"
          ? record.paidAt
          : typeof record.completed_at === "string"
            ? record.completed_at
            : null;
    const estimatedArrival =
      typeof record.estimated_arrival === "string"
        ? record.estimated_arrival
        : typeof record.estimatedArrival === "string"
          ? record.estimatedArrival
          : null;

    payouts.push({ id, amount, currency, status, period, paidAt, estimatedArrival });
  }

  const nextPayout =
    body && typeof body === "object"
      ? typeof (body as Record<string, unknown>).next_payout === "string"
        ? ((body as Record<string, unknown>).next_payout as string)
        : typeof (body as Record<string, unknown>).nextPayout === "string"
          ? ((body as Record<string, unknown>).nextPayout as string)
          : null
      : null;

  return { payouts, nextPayout };
}

function parseTaxForms(body: unknown): TaxFormStatus[] | null {
  const items = Array.isArray(body)
    ? body
    : body && typeof body === "object" && Array.isArray((body as Record<string, unknown>).forms)
      ? ((body as Record<string, unknown>).forms as unknown[])
      : body && typeof body === "object" && Array.isArray((body as Record<string, unknown>).data)
        ? ((body as Record<string, unknown>).data as unknown[])
        : null;

  if (!items) return null;

  const forms: TaxFormStatus[] = [];
  for (const item of items) {
    const record = item as Record<string, unknown>;
    const formType =
      typeof record.form_type === "string"
        ? record.form_type
        : typeof record.type === "string"
          ? record.type
          : "unknown";
    const taxYear =
      typeof record.tax_year === "number"
        ? record.tax_year
        : typeof record.year === "number"
          ? record.year
          : null;
    const status = typeof record.status === "string" ? record.status : "unknown";
    const filedAt =
      typeof record.filed_at === "string"
        ? record.filed_at
        : typeof record.filedAt === "string"
          ? record.filedAt
          : null;

    forms.push({ formType, taxYear, status, filedAt });
  }

  return forms.length > 0 ? forms : null;
}
