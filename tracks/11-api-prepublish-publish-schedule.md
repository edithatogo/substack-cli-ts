# Track 11: API Prepublish, Publish, and Schedule

## Goal

Add final publishing operations only after draft writes and payload validation are reliable.

## Scope

- Prepublish validation.
- Publish confirmation.
- Schedule if a stable endpoint and timezone behavior are identified.
- Capture final URL and status.
- Guard destructive or public actions behind explicit confirmation.

## Dependencies

- Track 06 API Auth and Session Extraction.
- Track 07 API Read Model.
- Track 08 API Draft Write Model.
- Track 09 API Content Payload Compatibility.

## Blocks

- Full API transport readiness in Track 12.

## Acceptance Criteria

- Publish and schedule require `--yes` or an interactive confirmation.
- Prepublish can run without publishing.
- Controlled test posts return a final status and URL.

## Current Progress

- Added `prepublish <file>` to validate the final publish or schedule payload without opening the browser.
- Prepublish reports payload compatibility, resolved title, and the final payload shape for browser execution.
- `publish` and `schedule` now run the same prepublish validation before opening the browser.
- `publish --review-only` stops at the final confirmation screen without clicking Publish.
- Review and publish checkpoints now report the current page URL and explicit final URL/state for controlled publication mapping.
- Workflow artifacts now carry an optional `publishedUrl` slot for the eventual live post URL.
- `--trace-out` can write a local JSON workflow artifact for review-only publish traces (**browser transport only** — API transport gap noted below).
- `trace review <file>` summarizes a saved workflow artifact without exposing browser session URLs.
- `trace compare <expected-file> <actual-file>` compares saved workflow artifacts locally.
- `trace fixture <file> --out <file>` writes a normalized local fixture for review artifacts.
- Publish and schedule still use the browser workflow and remain confirmation-gated.
- Trace commands all implemented and tested: `trace review` (3 tests), `trace compare`, `trace fixture`.

## Code Gaps Resolved (May 2026 parallel work)

The following three code gaps were fixed:

1. ✅ **`--trace-out` wired for API transport**: All three API paths (`draft`, `publish`, `schedule`) now call `maybeWriteTrace` after successful operations.

2. ✅ **`--review-only` for API transport**: Both API publish/schedule paths check `options.reviewOnly` and return the prepublish report without executing.

3. ✅ **`publishedUrl` propagation (API transport)**: API publish/schedule now map `PublishWriteResult.postUrl` to `publishedUrl`.

## Live Session Validation (May 2026)

✅ **Prepublish validated**: `--review-only --transport api` returns full prepublish report (mode, scheduleAt, payload, compatibility).

✅ **Trace commands validated**: `trace review`, `trace fixture`, `trace compare` all work correctly against real trace files.

✅ **Schedule prepublish**: `schedule --review-only --transport api` correctly reports `"mode": "schedule"` and `"scheduleAt": "2026-05-15T12:00:00Z"`.

## Bugs Found and Fixed During Live Validation

1. ✅ **`--dry-run` ignored in API publish/schedule path**: `options.dryRun` was parsed but never checked — the handler fell through to executing the publish/schedule. Fixed: now short-circuits like `--review-only`.

2. ✅ **`--trace-out` + `--review-only` gap**: Review-only path returned before `maybeWriteTrace`, so no trace file was written even with `--trace-out`. Fixed: `maybeWriteTrace` called before early return.

3. ✅ **Trace status hardcoded**: `status: "published"` / `status: "scheduled"` was always passed even on failure. Fixed: now uses `publishResult.status === "failed" ? "failed" : "published"` (dynamic).

## publishedUrl Capture Implemented (May 2026)

✅ **`publishedUrl` capture added to both workflow paths:**

- **`local-workflow.ts`**: After clicking publish, uses `page.waitForURL(/\/p\//, { timeout: 30000 })` to detect navigation to the published post URL. `currentUrl` and `finalUrl` now correctly differentiate pre/post-publish. Schedule path uses shorter timeout (`10000ms`) since scheduled posts typically don't navigate.

- **`browser-workflow.ts`**: Uses polling (`session.page.url()` every 500ms for up to 30s) since Stagehand v3 has its own Page class. Polls for URL change from draft editor to published post. Also added `click-final-schedule` step with confirmation text detection.

- **`local-workflow.ts --review-only` guard**: Added (was missing — publish would proceed even with `--review-only`).

## Known Issue (Resolved)

- ~~**Publish click doesn't reliably trigger navigation**~~: **Resolved.** Substack's publish flow requires a two-step sequence: first click **"Continue"** (`button#publish`) to open the review overlay, then click **"Send to everyone now"** to trigger the actual publish and navigate to `/p/{slug}`. Both `local-workflow.ts` and `browser-workflow.ts` now implement this two-step flow. The `click-final-publish` step targets `button:has-text('Send to everyone now')` as its primary selector. The `waitForURL` / polling logic in both workflows correctly captures the published post URL after the second click. The `--review-only` validation confirmed that clicking Continue opens the review overlay successfully.

## Remaining Work

None.
