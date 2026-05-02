# Track 01: Editor Schema Mapping

## Goal

Map the Substack editor document model well enough to generate reliable draft content from Markdown without relying on brittle direct API calls.

## Current State

- Implemented Markdown plus front matter parsing.
- Implemented Tiptap/ProseMirror JSON generation for common prose.
- Added basic custom placeholders for paywall and subscribe widgets.
- Added fixture validation and compare commands.

## Completed

1. ✅ Fixtures captured from all 6 example files (`basic.md`, `embeds.md`, `formatting.md`, `images.md`, `media.md`, `tables.md`) into `fixtures/prosemirror/`.
2. ✅ Schema fixtures covering headings, lists, blockquotes, code blocks, links, inline marks, horizontal rules, embeds, images with captions, tables, paywall dividers, and subscribe widgets.
3. ✅ Schema drift test (`src/schema/fixtures.test.ts`) validates all fixtures against current parser output and reports re-capture instructions on mismatch.
4. ✅ `inspect` command reports `compatibility` block showing supported node types, mark types, and any unsupported issues.
5. ✅ Unsupported nodes and fallback behavior documented in `README.md` under "Markdown Feature Support."

## Acceptance Criteria

- `npm test` validates captured fixtures without network access — **verified** (all 124 tests pass, including fixture drift tests).
- `substack-cli inspect <file>` reports unsupported Markdown features before browser automation starts — **verified** (compatibility block in output).
- Fixture updates are explicit and reviewed, not silently regenerated during normal tests — **verified** (drift test fails with re-capture instructions; no auto-regeneration).

## Remaining Opportunities

- Capture additional fixtures from manually authored Substack drafts to validate against Substack's native ProseMirror schema.
- Add fixture for buttons and callouts when Substack-specific custom node types are implemented.
- Add task list (GFM `- [ ]`) support if needed.
