# Track 19: Subscriber Management

## Handoff

- **Assigned agent:** Cline
- **Assigned on:** 2026-06-04
- **Scope:** Resolve or explicitly document subscriber import/export, segments, suppression, and gift-subscription gaps.

## Goal

Enable programmatic subscriber management — listing, importing, exporting, and segmenting subscribers without relying on the Substack web dashboard.

## Scope

- List subscribers with filtering (by status, tier, date range, source)
- Export subscribers to CSV
- Import subscribers from CSV
- Manage subscriber segments/groups
- Suppression list management (bounces, unsubscribes, spam complaints)
- Gift subscription management

## Discovery Needed

Before implementation begins, research is required in these areas:

1. **Subscriber API endpoints**: Determine whether `/api/v1/subscribers` or a similar endpoint exists. Explore the Substack dashboard network tab to identify the actual subscriber data endpoints (list, import, export, segments, suppression).

2. **CSV import/export**: Investigate whether CSV export is served as a file download via an API endpoint or requires browser automation to click the dashboard export button. Check if CSV import can be done via a POST to an API endpoint or requires browser-based file upload.

3. **Third-party research**: Check `jakub-k-slys/substack-api`, `ma2za/python-substack`, and `conorbronsdon/substack-mcp` for any subscriber-related endpoints or patterns that have already been discovered.

4. **Subscriber data model**: Map the full subscriber object shape — fields like email, status (active, inactive, unpaid), tier (free, paid), source, subscription date, last active date, lifetime value.

5. **Segments and groups**: Determine if segments are just filtered views or actual API-addressable resources. Identify if custom segments can be created/updated via API.

6. **Suppression lists**: Map endpoints for managing bounced emails, hard/soft bounces, spam complaints, and manual suppressions. Determine whether these are part of the subscriber API or a separate system.

7. **Gift subscriptions**: Identify endpoints for creating, listing, and managing gift subscriptions. Determine pricing data requirements for gift purchases.

8. **Rate limits and pagination**: Check subscriber list endpoint pagination behavior and rate limits, since subscriber lists can be large (tens of thousands).

## Dependencies

- Track 06 (API Auth) — session extraction for authenticated requests
- Track 07 (API Read Model) — typed read model patterns, shared API client

## Acceptance Criteria

- `substack-cli subscriber list` shows subscribers with filtering by status, tier, and date
- `substack-cli subscriber list --status active --tier paid` filters correctly
- `substack-cli subscriber export --format csv` produces valid CSV with all subscriber fields
- `substack-cli subscriber import <file> --yes` imports subscribers from CSV
- `substack-cli subscriber segment list` shows existing segments
- `substack-cli subscriber suppress <email> --yes` adds an email to the suppression list
- `substack-cli subscriber gift list` shows gift subscriptions
- All read operations are safe (no confirmation needed)
- All write operations (import, suppress, gift create) require `--yes` confirmation
- Output is typed with Zod and can be piped as JSON

## Current Status

**Partial (probe-based read/write stubs; import/export/segments/suppression/gifts are probe-only)**

**Implemented (all with tests):**
- Aggregate subscriber count via `fetchPublicationChecklist()` → `getSubscriberCount()` in `subscriber.ts`
- `api subscriber count` CLI command
- Subscriber list via `fetchSubscriberList()` from `GET /api/v1/publication/subscribers` (discovered externally via tap-substack)
- `api subscriber list` CLI command with `--limit`, `--offset`, `--status`, `--tier`, `--date-from`, `--date-to`, `--source-filter` filtering
- `api subscriber export` — probe-based CSV export via `fetchSubscriberExport()` in `subscriber-export.ts` (tests in `subscriber-export.test.ts`)
- `api subscriber import <csv-data> --yes` — probe-based CSV import via `importSubscribers()` in `subscriber-import.ts` (tests in `subscriber-import.test.ts`)
- `api subscriber segment list` — probe-based segment listing via `fetchSubscriberSegments()` in `subscriber-segments.ts` (tests in `subscriber-segments.test.ts`)
- `api subscriber suppress <email> --yes` — probe-based suppression add via `suppressEmail()` in `subscriber-suppression.ts` (tests in `subscriber-suppression.test.ts`)
- `api subscriber suppression-list list` — probe-based suppression entry listing via `fetchSuppressionList()` in `subscriber-suppression.ts`
- `api subscriber gift list` — probe-based gift subscription listing via `fetchGiftSubscriptions()` in `subscriber-gifts.ts` (tests in `subscriber-gifts.test.ts`)

**New modules and files:**
- `src/substack-api/subscriber-export.ts` — `fetchSubscriberExport()` with multi-endpoint probe
- `src/substack-api/subscriber-import.ts` — `importSubscribers()` with multi-endpoint probe, `--yes` required
- `src/substack-api/subscriber-segments.ts` — `fetchSubscriberSegments()` with multi-endpoint probe
- `src/substack-api/subscriber-suppression.ts` — `fetchSuppressionList()` (read) + `suppressEmail()` (write, `--yes` required)
- `src/substack-api/subscriber-gifts.ts` — `fetchGiftSubscriptions()` with multi-endpoint probe
- Updated `src/substack-api/subscriber-list.ts` — `SubscriberListOptions` with `status`, `tier`, `dateFrom`, `dateTo`, `source` fields
- Updated `src/cli.ts` — all new subscriber subcommands wired
- Test files: `subscriber-export.test.ts`, `subscriber-import.test.ts`, `subscriber-segments.test.ts`, `subscriber-suppression.test.ts`, `subscriber-gifts.test.ts`, updated `subscriber-list.test.ts`

**No confirmed endpoints (CLI probes return graceful "not-found" when unavailable):**
- CSV import/export — probe commands exist; operations may be dashboard-only
- Subscriber segments/groups — probe commands exist; segments may be dashboard-only filtered views
- Suppression list management — probe commands exist; operation may be dashboard-only
- Gift subscriptions — probe command exists; management may be dashboard-only

**Discovery status for Subscriber API endpoints:**
- `/api/v1/publication/subscribers` — known working (list with pagination and filtering)
- All export, import, segment, suppression, and gift endpoints — none discovered. Dashboard-only behavior confirmed via `tap-substack` and external project research (Tracks 05, 13). No known Substack API exists for these operations outside the web dashboard.

**Commands run to validate:**
- `npm run typecheck`
- Escalated `npm test` (sandboxed smoke tests cannot spawn `node.exe` on this machine)
