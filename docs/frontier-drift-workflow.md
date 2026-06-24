# Frontier Drift Workflow

Use this workflow before upgrading any frontier coverage state, especially native media, live video, recommendations, Boost, analytics, subscriber admin, payments, team settings, or other dashboard-only surfaces.

## Official Doc Refresh

1. Review every `official-doc` evidence URL listed in the coverage matrix.
2. Record a redacted snapshot entry:

```json
[
  {
    "ref": "https://support.substack.com/hc/en-us/articles/21093671091220-Guide-to-video-posts-on-Substack",
    "checkedAt": "2026-06-17T00:00:00.000Z",
    "status": "ok",
    "note": "No user-facing workflow change."
  }
]
```

3. Run:

```bash
npm run build
npm run frontier:drift
DRIFT_SNAPSHOT_FILE=path/to/snapshots.json npm run frontier:drift
```

The report blocks when an official doc is missing a snapshot, stale beyond the default 90-day window, changed, or unavailable.

## Endpoint Capture Diagnostics

Endpoint captures remain capture-first until the following are true:

- The capture is from an owner-approved test publication.
- Cookies, tokens, user IDs, private emails, draft IDs, and account-private values are redacted.
- The endpoint contract is represented by a fixture or test.
- A manual/admin rollback path is documented.
- The coverage matrix decision record is updated before the status changes.

Unavailable endpoints should be recorded as diagnostics, not silently removed from the roadmap.

## Capture Kit Requirements

Every endpoint capture kit should produce the same reviewable bundle:

- redacted network trace or HAR
- endpoint inventory with method, path template, request shape, response shape, and status codes
- fixture-minimization output with private values replaced by stable placeholders
- redaction report showing which secret and identifier classes were removed
- endpoint diff report against the previous fixture, when one exists
- manual runbook and rollback note for the dashboard workflow
- implemented contract-test reference, or a tracked issue when a test cannot be added in the same change

Do not promote a capture to automation if any redaction report is incomplete, if the workflow requires private payment/tax/subscriber data, or if the only viable path depends on CAPTCHA solving or access-control bypass.

## Stale Evidence Rules

- `ok`: evidence was reviewed and still matches the matrix.
- `changed`: the official doc or endpoint behavior changed and needs review.
- `unavailable`: the evidence source could not be reached or no longer exists.
- Missing snapshot: the URL exists in the matrix but was not reviewed in the current refresh.

Do not mark a surface implemented because docs mention a feature. The CLI needs a verified safe path, tests or fixtures, fallback/manual paths, and a decision-record update when automation remains unsafe.
