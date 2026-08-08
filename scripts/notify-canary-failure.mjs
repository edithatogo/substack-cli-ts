import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

function webhookUrl(raw, expectedHost, label) {
  if (!raw) return null;
  const url = new URL(raw);
  if (url.protocol !== "https:" || !expectedHost(url.hostname.toLowerCase()))
    throw new Error(`${label} webhook must use its official HTTPS host.`);
  return url;
}

async function post(fetchFn, url, body, label) {
  const response = await fetchFn(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
    redirect: "error",
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error(`${label} notification returned HTTP ${response.status}.`);
}

export async function sendAlerts({ fetchFn = fetch, env = process.env, failedChecks = [] }) {
  const runUrl = env.CANARY_RUN_URL ?? "GitHub Actions run URL unavailable";
  const runId = env.CANARY_RUN_ID ?? "unknown";
  const summary = `Substack API drift canary failed (${runId}). Failed checks: ${failedChecks.join(", ") || "preflight"}. ${runUrl}`;
  const deliveries = [];
  const slack = webhookUrl(env.SLACK_WEBHOOK_URL, (host) => host === "hooks.slack.com", "Slack");
  if (slack) deliveries.push(post(fetchFn, slack, { text: summary }, "Slack"));
  const discord = webhookUrl(
    env.DISCORD_WEBHOOK_URL,
    (host) => host === "discord.com" || host === "discordapp.com",
    "Discord",
  );
  if (discord) deliveries.push(post(fetchFn, discord, { content: summary }, "Discord"));
  if (env.PAGERDUTY_ROUTING_KEY) {
    deliveries.push(
      post(
        fetchFn,
        new URL("https://events.pagerduty.com/v2/enqueue"),
        {
          routing_key: env.PAGERDUTY_ROUTING_KEY,
          event_action: "trigger",
          dedup_key: "substack-publisher-api-drift",
          payload: { summary, source: "github-actions", severity: "error" },
        },
        "PagerDuty",
      ),
    );
  }
  if (deliveries.length === 0)
    throw new Error("No canary alert destination is configured; set a Slack, Discord, or PagerDuty secret.");
  await Promise.all(deliveries);
  return { delivered: deliveries.length };
}

async function main() {
  let failedChecks = [];
  try {
    const receipt = JSON.parse(await readFile(resolve("reports/canary/live-api-drift.json"), "utf8"));
    failedChecks = (receipt.checks ?? [])
      .filter((check) => check.status === "failed")
      .map((check) => check.name);
  } catch {
    failedChecks = ["configuration-or-test-bootstrap"];
  }
  const result = await sendAlerts({ failedChecks });
  console.log(`Delivered ${result.delivered} canary alert(s).`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : "Canary notification failed.");
    process.exitCode = 1;
  });
}
