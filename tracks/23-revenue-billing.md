# Track 23: Revenue & Billing

## Handoff

- **Assigned agent:** Cline
- **Assigned on:** 2026-06-04
- **Scope:** Reconcile the central Probe-only / Partial status against this track's status, then verify/report remaining billing management, refund, promotion, and PII-redaction gaps.

## Status

**Partial — see remaining gaps below**

## Goal

Enable programmatic revenue and billing management — subscription tiers, payouts, and financial reporting.

## Scope

- ✅ Read subscription tiers and pricing (monthly, yearly, founding)
- ✅ Read payout history and schedule
- ❌ Configure subscription plan options — dashboard-only, no endpoints discovered
- ✅ Tax form status checking
- ✅ Refund management (probe-based, endpoints undiscovered — returns `not-found` gracefully)
- ✅ Boosted post promotion management (probe-based, endpoints undiscovered — returns `not-found` gracefully)
- ✅ PII redaction helpers (`redactBillingPii`, `redactBillingPiiInObject`)
- ❌ Tier configuration (create/update subscription plans) — no endpoints discovered
- ❌ Coupon/discount management — no endpoints discovered
- ❌ Actual Stripe-based refund execution — requires browser DevTools capture

## Need

- Identify revenue/billing API endpoints under `/api/v1/revenue` or similar
- Check for payout and subscription management endpoints
- Map the Substack dashboard billing/payments section to endpoints
- Determine sensitivity level for financial data handling
- Research whether refund and boosted post operations are API-accessible or browser-only
- Verify what financial data appears in endpoint responses (PII, amounts, processor info)
- Determine if Stripe-connected data is exposed through Substack's API or requires Stripe direct access

## Acceptance Criteria

- ✅ `substack-cli billing tiers` lists subscription tiers with prices
- ✅ `substack-cli billing payouts` shows payout history and next scheduled payout
- ✅ `substack-cli billing taxes` shows tax form status
- ✅ `substack-cli billing refund <subscriber-id>` initiates a refund (requires `--yes` AND `--confirm refund` typed confirmation) — probe-based, returns `not-found` gracefully when endpoints are dashboard-only
- ✅ `substack-cli billing promote` lists boosted post promotions — probe-based, returns `not-found` gracefully when endpoints are dashboard-only
- ✅ All read operations work without confirmation
- ✅ Write operations (refund) require `--yes` AND additional `--confirm <operation>` flag
- ❌ No financial data logged in traces, MCP output, or local stores — not verified; needs audit pass
- ✅ PII redaction helpers exported and wired into billing read/probe command output by default. `--include-pii` is available on billing read/probe commands for explicit opt-in.

## Changes Made (2026-06-04)

### Implementation

1. **`src/substack-api/billing.ts`**:
   - Added `BillingWriteStatus` type (`"ok" | ... | "confirmation-required"`)
   - Added `PromotionEntry` and `PromotionListResult` interfaces
   - Added `BillingWriteResult` interface for refund write operations
   - Added `redactBillingPii()` — redacts personal information from billing output unless `includePii` is true
   - Added `redactBillingPiiInObject()` — redacts specified PII fields from an object
   - Added `fetchBillingPromotions()` — probes `/api/v1/publication/promotions`, `/api/v1/promotions`, `/api/v1/revenue/promotions` with graceful `not-found` fallback
   - Added `initiateRefund()` — probes `/api/v1/publication/subscribers/{id}/refund`, `/api/v1/subscribers/{id}/refund`, `/api/v1/publication/refunds` with `POST` and graceful `not-found` fallback
   - Added `parsePromotions()` — parses promotion entries from array, `promotions`, or `data` response shapes

2. **`src/cli.ts`**:
   - Added import of `fetchBillingPromotions` and `initiateRefund`
   - Added `api billing refund <subscriber-id>` command — requires `--yes` AND `--confirm refund`
   - Added `api billing promote` command — lists boosted post promotions (probe-based)

3. **`src/substack-api/billing.test.ts`**:
   - Added tests for `fetchBillingPromotions` (success + not-found)
   - Added tests for `initiateRefund` (success, amount_cents parsing, 422 error, not-found, 401)
   - Added tests for `redactBillingPii` (redaction, passthrough, null/undefined)
   - Added tests for `redactBillingPiiInObject` (redaction, passthrough, short strings, no matching fields)

### Commands Run

- None — shell execution not available in this environment
- Verified by code review of all modified files

### Remaining Gaps

1. **Tier configuration** (create/update subscription plans) — no endpoints discovered. Requires browser DevTools network capture from the Substack dashboard billing section.
2. **Coupon/discount management** — no endpoints discovered.
3. **Actual Stripe-based refund execution** — `initiateRefund` probes likely endpoints but Substack's refund flow may be browser-only or require Stripe direct API access.
4. **Financial data audit** — CLI billing outputs redact common PII fields by default, but live trace/MCP behavior still needs a dedicated audit pass against real endpoint responses.
5. **Subscription plan option configuration** — the `--option <options>` tier setup requires endpoint discovery first.

## Dependencies

- Track 06 (API Auth) — cookie extraction and session validation
- Track 07 (API Read Model) — shared HTTP client, endpoint patterns, redaction utilities
