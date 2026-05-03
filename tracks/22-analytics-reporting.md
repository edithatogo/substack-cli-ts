# Track 22: Analytics & Reporting

## Status

**Planned (no discovered endpoints)**

## Goal

Enable programmatic access to Substack analytics — post performance, subscriber growth, email metrics, and revenue reporting.

## Scope

- Post-level analytics (views, read rate, email opens, clicks, referrers)
- Subscriber growth reporting (net change, sources, churn rate)
- Email performance (delivery rate, open rate, click rate, unsubscribes)
- Revenue reporting (new paid subscribers, MRR, churn)
- Export analytics to CSV/JSON
- Scheduled analytics snapshots

## Need

- Identify analytics API endpoints (likely dashboard-internal under `/api/v1/analytics/` or similar)
- Check if analytics data is available through the existing read model or requires separate endpoint discovery
- Map the Substack dashboard analytics pages to endpoints
- Determine if email analytics are accessible through the same or different endpoints
- Research how other projects (substack-mcp, python-substack) access analytics data
- Verify rate limits or caching on analytics endpoints
- Determine if analytics data requires additional permissions or scopes

## Acceptance Criteria

- `substack-cli analytics post <id>` shows views, read rate, email opens, clicks, referrers
- `substack-cli analytics subscribers` shows net change, sources, churn over configurable period
- `substack-cli analytics email` shows delivery rate, open rate, click rate, unsubscribes
- `substack-cli analytics revenue` shows new paid subscribers, MRR, churn
- All report outputs support `--format json|csv|table`
- `substack-cli analytics snapshot --interval daily|weekly|monthly` appends to a local snapshot store
- Analytics commands are read-only by default with no destructive capabilities
- No analytics data cached or stored beyond user-requested snapshots

## Dependencies

- Track 06 (API Auth) — cookie extraction and session validation
- Track 07 (API Read Model) — shared HTTP client, endpoint patterns, redaction utilities
