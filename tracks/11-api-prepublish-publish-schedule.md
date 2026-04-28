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
