import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { sendAlerts } from "./notify-canary-failure.mjs";

describe("canary failure notifications", () => {
  it("delivers provider-specific payloads without exposing webhook values", async () => {
    const requests = [];
    const fetchFn = async (url, options) => {
      requests.push({ url: String(url), body: JSON.parse(options.body) });
      return new Response(null, { status: 202 });
    };
    const result = await sendAlerts({
      fetchFn,
      env: {
        SLACK_WEBHOOK_URL: "https://hooks.slack.com/services/test/secret/value",
        DISCORD_WEBHOOK_URL: "https://discord.com/api/webhooks/test/secret",
        PAGERDUTY_ROUTING_KEY: "routing-secret",
        CANARY_RUN_URL: "https://github.com/example/repo/actions/runs/1",
        CANARY_RUN_ID: "1-1",
      },
      failedChecks: ["json:/api/v1/publication"],
    });
    assert.equal(result.delivered, 3);
    assert.equal(requests[0].body.text.includes("json:/api/v1/publication"), true);
    assert.equal(requests[1].body.content.includes("actions/runs/1"), true);
    assert.equal(requests[2].body.event_action, "trigger");
    assert.doesNotMatch(JSON.stringify(requests.map(({ body }) => body)), /test\/secret\/value/);
  });

  it("fails closed when no alert destination or an unofficial host is configured", async () => {
    await assert.rejects(() => sendAlerts({ env: {} }), /No canary alert destination/);
    await assert.rejects(
      () => sendAlerts({ env: { SLACK_WEBHOOK_URL: "https://attacker.example/hook" } }),
      /official HTTPS host/,
    );
  });
});
