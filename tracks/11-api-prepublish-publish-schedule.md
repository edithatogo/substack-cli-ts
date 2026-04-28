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
- `--trace-out` can write a local JSON workflow artifact for review-only publish traces.
- `trace review <file>` summarizes a saved workflow artifact without exposing browser session URLs.
- `trace compare <expected-file> <actual-file>` compares saved workflow artifacts locally.
- `trace fixture <file> --out <file>` writes a normalized local fixture for review artifacts.
- Publish and schedule still use the browser workflow and remain confirmation-gated.

## Remaining Work

- Map the live publish confirmation screen and final schedule controls in a controlled test publication.
- Capture the returned post URL and final state after a successful live publish or schedule run.
- Fill the optional `publishedUrl` field from a successful live publish or schedule run.
- Add a controlled review-only publish trace that can be used before the final click.
- Use `--trace-out` to persist the review-only publish trace and compare it later.
- Use `trace review` to compare review-only, schedule-review, and publish-click artifacts locally.
- Use `trace compare` to diff saved workflow artifacts and confirm the final action path.
- Use `trace fixture` to normalize a review artifact before storing or comparing it.
