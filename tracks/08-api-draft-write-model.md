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
- Added `api draft compare <expected-file> <actual-file>` to diff normalized capture fixtures locally.
- Added `api draft fixture <file> --out <file>` to write a normalized draft capture baseline.
- `--live` is intentionally blocked until the draft endpoint contract is confirmed from a captured user-owned draft save.

## Remaining Work

- Confirm the exact create/update/fetch draft endpoints and request bodies from a live draft save (`D006`), using `api draft review` against a captured artifact.
- Use `api draft contract` to infer likely endpoint shapes from a saved draft capture before touching any live write path.
- Use `api draft contract-matrix` to merge multiple user-owned captures into one candidate set and compare the stable shapes.
- Capture a stable local baseline with `api draft fixture` and compare it with `api draft compare` once a user-owned draft trace is available.
- Add duplicate draft lookup by title/slug against remote draft inventory after draft read endpoints are known.
- Add explicit live write execution behind a separate confirmation flag once endpoint compatibility is proven.
