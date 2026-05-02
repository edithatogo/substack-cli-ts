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

- `--transport browser` preserves current behavior. ✅
- `--transport api` fails cleanly if the API adapter is unavailable. ✅
- `--transport auto` documents and reports which transport was used. ✅

## Completed

1. ✅ `--transport browser|api|auto` on all three commands (draft, publish, schedule).
2. ✅ `draft --transport api` full flow: resolves auth, validates session, plans creates/updates, executes writes, handles conflicts.
3. ✅ `publish --transport api` full flow: requires existing draft mapping, validates session, publishes via `POST /api/v1/drafts/{id}/publish`.
4. ✅ `schedule --transport api` full flow: requires existing draft, passes `draft_scheduled_at`, schedules via `POST /api/v1/drafts/{id}/schedule`.
5. ✅ `--transport auto` defaults to browser with informative fallback message in `TransportResolution.fallbackReason`.
6. ✅ `--transport api` fails cleanly with a clear error when no draft mapping exists or API session is invalid.
7. ✅ `resolveTransport()` returns consistent `TransportResolution` with `requested`, `selected`, and optional `fallbackReason`.
8. ✅ `BrowserWorkflowResult` includes `transport` block with requested, selected, and fallback info.
9. ✅ Transport tests cover all three preferences and fallback message.

## Remaining Work

- None. Transport selection is fully implemented for all commands.
