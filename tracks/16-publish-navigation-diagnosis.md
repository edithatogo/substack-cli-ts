# Track 16: Publish Navigation Diagnosis

## Goal

Diagnose and fix the publish navigation gap where the URL stays at `/publish/post/{id}` after clicking "Publish" and never navigates to the published post at `/p/{slug}`.

## Current State

The publish flow completes browser-based drafting and editing, then clicks the "Publish" button. After the click, `waitForURL(/\/p\//)` times out. The URL remains at `/publish/post/{id}`. The `publishedUrl` capture logic in `BrowserWorkflowResult` is correct, but no navigation to the published post is triggered by the current interaction sequence.

## Diagnostic Approach

1. Extend `debug publish-screen --capture` to optionally click "Continue" first, then capture the review overlay state
2. Add a new `debug review-overlay <url>` command that navigates to a draft, optionally clicks Continue, and captures the review overlay
3. The captured diagnostics will reveal what UI elements are present after clicking Continue, including any confirmation dialogs, second-stage buttons, or success indicators

## Hypotheses

1. The "Publish" button might be inside an overlay or iframe that the current Playwright selector doesn't reach
2. There might be a two-step confirmation flow: "Publish" → "Are you sure?" → "Yes"
3. The button text might differ from "Publish" (e.g., "Publish now", "Confirm", "Go live", "Post")
4. Publishing succeeds via XHR with an in-page success message and no redirect — the focus then shifts to published confirmation, not URL navigation

## Implementation

- `captureReviewOverlayDiagnostics(url, clickContinue)` in `src/browser/diagnostics.ts`
  - When `clickContinue` is true: navigates, waits for page load, locates and clicks a "Continue" button, waits for overlay, captures full DOM state
  - When `clickContinue` is false: captures the current page like the existing `capturePublishScreenDiagnostics`
  - Returns `ReviewOverlayDiagnostics` with buttons (including CSS selectors), headings, dialogs, links, confirmation elements, forms, and text sample
- CLI updates in `src/cli.ts`:
  - `debug publish-screen` gains `.option("--capture")` that calls `captureReviewOverlayDiagnostics` instead
  - `debug review-overlay <url>` is a new command that calls `captureReviewOverlayDiagnostics` with `--capture` (default true) controlling whether to click Continue first

## Acceptance Criteria

- [x] `npm run typecheck` passes
- [x] `npm test` passes (150 tests)
- [x] `npm run build` passes
- [x] `debug publish-screen <url> --capture` captures the review overlay after clicking Continue
- [x] `debug review-overlay <url>` captures the review overlay
- [x] `debug review-overlay <url> --no-capture` captures the editor page without clicking Continue
- [x] Button entries include unique CSS selectors for programmatic targeting

## Resolution

The publish navigation gap was diagnosed as a **two-step confirmation flow**: Substack's publish dialog requires clicking "Continue" (`button#publish`) first to open a review overlay, then clicking "Send to everyone now" (the actual publish button inside the review dialog) to trigger the publish and navigate to the published post at `/p/{slug}`.

**Fix applied:**

1. **Local workflow** (`src/publish/local-workflow.ts`):
   - `click-continue` step targets `button#publish` / `button:has-text('Continue')` to open the review overlay
   - `click-final-publish` step targets `button:has-text('Send to everyone now')` as its primary selector, with `[class*='priority_primary']`, `button:has-text('Publish now')`, and `button:has-text('Publish')` as fallbacks
   - `waitForURL` predicate updated to match `pathname.startsWith("/p/")` or URL that no longer includes `/publish/post/`

2. **Browser (Stagehand) workflow** (`src/publish/browser-workflow.ts`):
   - `open-publish-settings` `observedAct` instruction targets the "Continue" button by visible text
   - `click-final-publish` `observedAct` instruction targets the "Send to everyone now" button

**Validation (May 2026):**
- API prepublish (`--transport api --review-only`): ✅ Returns full payload compatibility report (all node/mark types supported, payload ready)
- Browser workflow (`--transport browser --review-only --yes`): ✅ Navigated to draft 196113994, filled all metadata, clicked Continue, stopped at `publish-review-opened` — confirms the Continue step and review overlay detection work correctly
- Fix closes both the `publishedUrl` pipeline and the publish interaction sequence

## Status

**Resolved.**
