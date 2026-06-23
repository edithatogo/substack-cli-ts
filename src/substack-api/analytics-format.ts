import type {
  EmailPerformanceResult,
  PostAnalyticsResult,
  RevenueAnalyticsResult,
  SubscriberGrowthResult,
} from "./analytics.js";

export type OutputFormat = "json" | "csv" | "table";

export interface FormatOptions {
  format: OutputFormat;
}

function escapeCsv(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function formatPostAnalytics(result: PostAnalyticsResult, options: FormatOptions): string {
  if (result.status !== "ok" || !result.analytics) {
    return JSON.stringify(result, null, 2);
  }

  const a = result.analytics;

  switch (options.format) {
    case "json":
      return JSON.stringify(result, null, 2);
    case "csv": {
      const header = "postId,title,views,readRate,emailOpens,emailClicks,referrerCount";
      const row = `${a.postId},"${escapeCsv(a.title)}",${a.views},${a.readRate ?? ""},${a.emailOpens ?? ""},${a.emailClicks ?? ""},${a.referrers.length}`;
      const refHeader = "referrerSource,referrerViews";
      const refRows = a.referrers.map((r) => `${escapeCsv(r.source)},${r.views}`);
      return [header, row, "", refHeader, ...refRows].join("\n");
    }
    case "table": {
      const lines: string[] = [];
      lines.push("Post Analytics");
      lines.push("─".repeat(60));
      lines.push(`  Post ID:        ${a.postId}`);
      lines.push(`  Title:          ${a.title}`);
      lines.push(`  Views:          ${a.views}`);
      lines.push(
        `  Read Rate:      ${a.readRate != null ? `${(a.readRate * 100).toFixed(1)}%` : "N/A"}`,
      );
      lines.push(`  Email Opens:    ${a.emailOpens ?? "N/A"}`);
      lines.push(`  Email Clicks:   ${a.emailClicks ?? "N/A"}`);
      lines.push(`  Referrers:      ${a.referrers.length} sources`);
      if (a.referrers.length > 0) {
        lines.push("");
        lines.push("  Referrer Breakdown:");
        for (const ref of a.referrers) {
          lines.push(`    ${ref.source}: ${ref.views} views`);
        }
      }
      return lines.join("\n");
    }
  }
}

export function formatSubscriberGrowth(
  result: SubscriberGrowthResult,
  options: FormatOptions,
): string {
  if (result.status !== "ok" || !result.growth) {
    return JSON.stringify(result, null, 2);
  }

  const g = result.growth;

  switch (options.format) {
    case "json":
      return JSON.stringify(result, null, 2);
    case "csv": {
      const header = "period,totalSubscribers,netChange,freeSubscribers,paidSubscribers,churned";
      const row = `${escapeCsv(g.period)},${g.totalSubscribers},${g.netChange},${g.freeSubscribers},${g.paidSubscribers},${g.churned}`;
      return [header, row].join("\n");
    }
    case "table": {
      const lines: string[] = [];
      lines.push("Subscriber Growth");
      lines.push("─".repeat(60));
      lines.push(`  Period:             ${g.period}`);
      lines.push(`  Total Subscribers:  ${g.totalSubscribers}`);
      lines.push(`  Net Change:         ${g.netChange}`);
      lines.push(`  Free Subscribers:   ${g.freeSubscribers}`);
      lines.push(`  Paid Subscribers:   ${g.paidSubscribers}`);
      lines.push(`  Churned:            ${g.churned}`);
      return lines.join("\n");
    }
  }
}

export function formatEmailPerformance(
  result: EmailPerformanceResult,
  options: FormatOptions,
): string {
  if (result.status !== "ok" || !result.emails) {
    return JSON.stringify(result, null, 2);
  }

  switch (options.format) {
    case "json":
      return JSON.stringify(result, null, 2);
    case "csv": {
      const header =
        "postId,title,sentAt,recipients,delivered,opens,openRate,clicks,clickRate,unsubscribes";
      const rows = result.emails.map(
        (e) =>
          `${e.postId},"${escapeCsv(e.title)}",${e.sentAt ?? ""},${e.recipients},${e.delivered},${e.opens},${e.openRate.toFixed(4)},${e.clicks},${e.clickRate.toFixed(4)},${e.unsubscribes}`,
      );
      return [header, ...rows].join("\n");
    }
    case "table": {
      const lines: string[] = [];
      lines.push("Email Performance");
      lines.push("─".repeat(80));
      if (result.emails.length === 0) {
        lines.push("  No email performance data available.");
        return lines.join("\n");
      }
      for (const e of result.emails) {
        lines.push(`  Post:           ${e.title} (ID: ${e.postId})`);
        lines.push(`  Sent At:        ${e.sentAt ?? "N/A"}`);
        lines.push(`  Recipients:     ${e.recipients}`);
        lines.push(`  Delivered:      ${e.delivered}`);
        lines.push(`  Opens:          ${e.opens} (${(e.openRate * 100).toFixed(1)}%)`);
        lines.push(`  Clicks:         ${e.clicks} (${(e.clickRate * 100).toFixed(1)}%)`);
        lines.push(`  Unsubscribes:   ${e.unsubscribes}`);
        lines.push(`  ${"·".repeat(40)}`);
      }
      return lines.join("\n");
    }
  }
}

export function formatRevenueAnalytics(
  result: RevenueAnalyticsResult,
  options: FormatOptions,
): string {
  if (result.status !== "ok" || !result.revenue) {
    return JSON.stringify(result, null, 2);
  }

  const r = result.revenue;

  switch (options.format) {
    case "json":
      return JSON.stringify(result, null, 2);
    case "csv": {
      const header = "period,newPaidSubscribers,churnedPaidSubscribers,mrr,totalRevenue";
      const row = `${escapeCsv(r.period)},${r.newPaidSubscribers},${r.churnedPaidSubscribers},${r.mrr ?? ""},${r.totalRevenue ?? ""}`;
      return [header, row].join("\n");
    }
    case "table": {
      const lines: string[] = [];
      lines.push("Revenue Analytics");
      lines.push("─".repeat(60));
      lines.push(`  Period:                 ${r.period}`);
      lines.push(`  New Paid Subscribers:   ${r.newPaidSubscribers}`);
      lines.push(`  Churned Paid:           ${r.churnedPaidSubscribers}`);
      lines.push(`  MRR:                    ${r.mrr != null ? `${r.mrr.toFixed(2)}` : "N/A"}`);
      lines.push(
        `  Total Revenue:          ${r.totalRevenue != null ? `${r.totalRevenue.toFixed(2)}` : "N/A"}`,
      );
      return lines.join("\n");
    }
  }
}
