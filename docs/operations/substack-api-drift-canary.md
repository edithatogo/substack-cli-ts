# Substack API drift canary

The scheduled canary detects unexpected changes in live Substack HTML and authenticated JSON responses before those changes reach normal publishing workflows. It performs `GET` requests only and must use a dedicated tester account and non-production publication on a `*.substack.com` host.

## Repository configuration

Create these GitHub Actions repository variables:

- `SUBSTACK_CANARY_URL`: dedicated publication URL, for example `https://canary-publication.substack.com`.
- `SUBSTACK_CANARY_CONTRACT_JSON`: target-specific structural contract. Start with observed, non-secret fields and selectors, then review every change rather than automatically accepting a new baseline.

Example contract:

```json
{
  "html": {
    "requiredMarkers": ["class=\"publication-content\""],
    "forbiddenMarkers": ["cf-error-code"]
  },
  "json": [
    {
      "path": "/api/v1/publication",
      "requiredPaths": [
        { "path": "id", "type": "number" },
        { "path": "name", "type": "string" }
      ]
    }
  ]
}
```

Create `SUBSTACK_TEST_COOKIE` as a GitHub Actions secret containing the tester account's cookie header. Rotate it immediately if it appears outside GitHub's encrypted secret store. The canary never writes this value to its receipt and sends it only to same-origin JSON endpoints on `substack.com`.

Configure at least one alert destination as an Actions secret:

- `SLACK_WEBHOOK_URL`: Slack incoming webhook under `hooks.slack.com`.
- `DISCORD_WEBHOOK_URL`: Discord webhook under `discord.com`.
- `PAGERDUTY_ROUTING_KEY`: PagerDuty Events API v2 integration routing key.

## Operation

The workflow runs every six hours and supports manual dispatch. Each run verifies the deterministic probe tests, fetches the public HTML without credentials, fetches configured JSON paths with the tester cookie, and uploads a redacted 30-day receipt. A failed run attempts every configured alert destination.

Treat a failure as one of four states:

1. `401` or `403`: rotate the tester cookie and rerun manually.
2. HTML marker failure: inspect the live page and update code or the reviewed contract only after confirming intentional upstream drift.
3. JSON path/type failure: capture a redacted fixture, update the adapter and regression tests, then update the contract.
4. Alert failure: repair the provider secret or integration; GitHub's failed workflow remains the fallback signal.

Never point the canary at a production publication, add mutating endpoints, log response bodies, or automatically rewrite the expected contract from live responses.
