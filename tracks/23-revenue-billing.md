# Track 23: Revenue & Billing

## Status

**Planned (no discovered endpoints)**

## Goal

Enable programmatic revenue and billing management — subscription tiers, payouts, and financial reporting.

## Scope

- Read subscription tiers and pricing (monthly, yearly, founding)
- Read payout history and schedule
- Configure subscription plan options
- Tax form status checking
- Refund management
- Boosted post promotion management

## Need

- Identify revenue/billing API endpoints under `/api/v1/revenue` or similar
- Check for payout and subscription management endpoints
- Map the Substack dashboard billing/payments section to endpoints
- Determine sensitivity level for financial data handling
- Research whether refund and boosted post operations are API-accessible or browser-only
- Verify what financial data appears in endpoint responses (PII, amounts, processor info)
- Determine if Stripe-connected data is exposed through Substack's API or requires Stripe direct access

## Acceptance Criteria

- `substack-cli billing tiers` lists subscription tiers with prices
- `substack-cli billing payouts` shows payout history and next scheduled payout
- `substack-cli billing taxes` shows tax form status
- `substack-cli billing refund <subscriber-id>` initiates a refund (requires `--yes` AND typed confirmation)
- `substack-cli billing promote <post-id>` manages boosted post promotion
- All read operations work without confirmation
- Write operations (refund, tier changes) require `--yes` AND additional `--confirm <operation>` flag
- No financial data logged in traces, MCP output, or local stores
- PII (subscriber names, emails) redacted in all command output unless `--include-pii` is passed

## Dependencies

- Track 06 (API Auth) — cookie extraction and session validation
- Track 07 (API Read Model) — shared HTTP client, endpoint patterns, redaction utilities
