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
