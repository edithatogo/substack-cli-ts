# Track 26: Cross-posting & Integrations

## Status

**Complete**

## Goal

Enable cross-posting to other platforms and integration management — WordPress import, RSS feeds, and external service connections.

## Scope

- Cross-post published articles to other platforms
- WordPress import support
- Custom RSS import
- Zapier/IFTTT integration status
- Discord/Slack integration settings
- External API token management

## Need

- Identify any cross-posting API endpoints (likely publication settings or separate integration endpoints)
- Research WordPress import process (Substack dashboard feature — may be UI-only)
- Map the Substack integrations dashboard to endpoints
- Check if webhook/API token endpoints exist for external application access
- Determine if cross-posting is synchronous API or async/browser-based
- Check if Zapier/IFTTT/Discord/Slack integrations expose any API surface or are purely OAuth config flows
- Research whether RSS import is one-time or continuous

## Acceptance Criteria

- `substack-cli integrations list` shows configured integrations and their status
- `substack-cli integrations crosspost <post-id> --platform <platform>` returns a structured blocked response until destination consent, idempotency, and safe endpoint captures exist
- `substack-cli integrations import wordpress <file>` returns a structured blocked response until safe endpoint captures exist
- `substack-cli integrations import rss <url>` returns a structured blocked response until safe endpoint captures exist
- `substack-cli integrations tokens list` shows external API tokens (redacted)
- Import and cross-post operations require `--yes` confirmation
- No tokens or secrets logged in traces, MCP output, or local stores
- Token values fully redacted in all command output

## Dependencies

- Track 06 (API Auth) — cookie extraction and session validation
