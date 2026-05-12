# Track 19: Subscriber Management

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

**Complete (list + count implemented, import/export/segments not CLI-accessible)**

**Implemented:**
- Aggregate subscriber count via `fetchPublicationChecklist()` → `getSubscriberCount()` in `subscriber.ts`
- `api subscriber count` CLI command
- Subscriber list via `fetchSubscriberList()` from `GET /api/v1/publication/subscribers` (discovered externally via tap-substack)
- `api subscriber list` CLI command with `--limit` and `--offset` pagination

**Not CLI-accessible (no endpoints discovered):**
- CSV import/export — dashboard UI only
- Subscriber segments/groups — no endpoints discovered
- Suppression list management — no endpoints discovered
- Gift subscriptions — no endpoints discovered
- CSV import/export
- Suppression list management
- Segments/groups
- Gift subscriptions
