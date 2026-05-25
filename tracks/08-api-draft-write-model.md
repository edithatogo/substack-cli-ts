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
- Added local draft mappings under `.substack-cli/draft-mappings.json` for source-file to draft ID tracking.
- Added `api draft mappings` and `api draft link <file> --draft-id <id>` for duplicate/update planning.
- Added `api draft observe` to watch local browser traffic and write a redacted draft-save capture artifact.
- Added `api draft review <file>` to summarize a saved capture artifact for endpoint discovery.
- Added `api draft contract <file>` to infer likely create/update/fetch shapes from a saved capture artifact.
- Added `api draft contract-matrix <files...>` to merge multiple capture artifacts into one inferred contract view.
- Added `api draft contract-matrix --out <file>` to persist a normalized matrix fixture.
- Added `api draft contract-matrix-compare <expected-file> <actual-file>` to compare matrix fixtures locally.
- Added `api draft duplicates <file>` to look up likely duplicates from the read-only inventory and local mappings.
- Added `api draft section <file>` to resolve draft section metadata against the current read-only inventory.
- Added `api draft inspect <file>` to bundle payload validation, section resolution, duplicate lookup, and draft planning.
- Added `api draft compare <expected-file> <actual-file>` to diff normalized capture fixtures locally.
- Added `api draft fixture <file> --out <file>` to write a normalized draft capture baseline.
- **D006 resolved** (2026-04-29): Confirmed draft endpoint contract from live Substack session capture.
- **Confirmed contract:** `POST /api/v1/drafts` (create), `PUT /api/v1/drafts/{id}` (update).
- **Request body keys (create):** audience, draft_body (ProseMirror JSON string), draft_bylines, draft_podcast_duration, draft_podcast_url, draft_section_id, draft_subtitle, draft_title, section_chosen, type.
- **Request body keys (update):** Same as create minus audience/type, plus last_updated_at.
- **Response:** Full draft object with id (numeric), uuid, slug, draft_created_at, draft_updated_at, etc.
- **Fixture saved:** `fixtures/drafts/live-draft-contract.json`.

## Completed Work

- ✅ Confirm draft endpoints from a live draft save (`D006`).
- ✅ Run `api draft contract` to infer endpoint shapes from captured artifact.
- ✅ Save normalized fixture with `api draft fixture`.
- ✅ Add explicit live write execution (`--live` flag) behind a confirmation prompt, using the confirmed POST/PUT contract.
- ✅ Write a typed API adapter for draft create/update/fetch operations.
- ✅ Wire `api draft create <file> --live` to call POST/PUT against the confirmed endpoints.
- ✅ Wire `draft <file>` CLI command to use the API transport when `--transport api` is specified.
- ✅ Update `resolveTransport()` to accept `"api"` without throwing.

## Follow-up Discovery Notes

- Additional draft captures, such as section-specific examples, remain useful for broadening fixtures but are not required for the completed draft write model.
- End-to-end live draft creation was validated in later transport work and summarized in `conductor/tracks.md`.
- API publish and schedule transport wiring moved to Track 11 and Track 12, which are both complete.
