# Track 08: API Draft Write Model

## Goal

Support internal API draft creation and update without touching final publish controls.

## Scope

- Create draft.
- Fetch draft.
- Update draft.
- Detect duplicate drafts by source file metadata, title, slug, or stored mapping.
- Return draft ID and draft URL.

## Dependencies

- Track 06 API Auth and Session Extraction.
- Track 07 API Read Model.
- Track 09 API Content Payload Compatibility.

## Blocks

- Track 11 API Prepublish, Publish, and Schedule.
- Track 12 Transport Selection and Fallback.

## Acceptance Criteria

- A harmless Markdown file can be created as a draft through `--transport api`.
- Re-running the command updates the intended draft or clearly asks for disambiguation.
- Draft creation never publishes content.

## Current Progress

- Added `substack-cli api draft create <file>` as a no-network draft write plan.
- Reuses the Track 09 payload preflight, so unsupported content fails before any write path.
- Emits the intended draft endpoint, payload, draft URL, and duplicate key without exposing cookies.
- `--live` is intentionally blocked until the draft endpoint contract is confirmed from a captured user-owned draft save.

## Remaining Work

- Confirm the exact create/update/fetch draft endpoints and request bodies from a live draft save.
- Add duplicate draft lookup using stored mappings plus title/slug matching.
- Add explicit live write execution behind a separate confirmation flag once endpoint compatibility is proven.
