# Track 01: Editor Schema Mapping

## Goal

Map the Substack editor document model well enough to generate reliable draft content from Markdown without relying on brittle direct API calls.

## Current State

- Implemented Markdown plus front matter parsing.
- Implemented Tiptap/ProseMirror JSON generation for common prose.
- Added basic custom placeholders for paywall and subscribe widgets.
- Added fixture validation and compare commands.

## Next Tasks

1. Capture fixtures from manually authored Substack drafts for each supported block type.
2. Add schema fixtures for headings, lists, blockquotes, code blocks, links, inline marks, and horizontal rules.
3. Add Substack-specific fixtures for paywall dividers, subscribe widgets, embeds, image captions, buttons, and callouts.
4. Add a schema drift test that compares generated JSON against captured fixtures.
5. Document unsupported nodes and fallback behavior in `README.md`.

## Acceptance Criteria

- `npm test` validates captured fixtures without network access.
- `substack-cli inspect <file>` reports unsupported Markdown features before browser automation starts.
- Fixture updates are explicit and reviewed, not silently regenerated during normal tests.
