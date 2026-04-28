# Track 12: Transport Selection and Fallback

## Goal

Allow the CLI to choose the best available transport for each operation.

## Scope

- Add `--transport browser|api|auto`.
- Keep browser draft creation as the safe fallback.
- Route read/export commands to the API transport when available.
- Provide consistent result objects and errors across transports.

## Dependencies

- Existing browser workflow.
- Track 08 API Draft Write Model for API draft operations.
- Track 11 API Prepublish, Publish, and Schedule for API publish operations.

## Blocks

- Everyday production workflow selection.

## Acceptance Criteria

- `--transport browser` preserves current behavior.
- `--transport api` fails cleanly if the API adapter is unavailable.
- `--transport auto` documents and reports which transport was used.

## Current Progress

- Added `--transport browser|api|auto` to draft, publish, and schedule commands.
- Browser workflow now reports the requested transport and whether auto fell back to browser.
- Explicit API transport is rejected with a clear error until a live API write adapter exists.
