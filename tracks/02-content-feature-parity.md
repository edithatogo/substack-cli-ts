# Track 02: Content Feature Parity

## Goal

Make Markdown drafts render in Substack with predictable formatting and clear fallbacks for unsupported features.

## Completed State

- Basic title and body insertion is validated through the local editor.
- HTML insertion works for common article content with rich formatting.
- Lists, blockquotes, code blocks, inline code, horizontal rules, images with captions, tables, and embed shortcodes are mapped.
- Content verification reports missing title/body/link/table issues before publication.

## Completed Tasks

1. Added Markdown coverage for lists, blockquotes, code blocks, inline code, and horizontal rules.
2. Implemented image handling with local file resolution, alt text, captions, and failure diagnostics.
3. Added table support through Tiptap table extensions and documented unsupported fallback behavior.
4. Added embed syntax for URLs, YouTube, podcasts, and generic embeds.
5. Added content verification for expected visible text, title/body presence, links, and table warnings.

## Acceptance Criteria

- Example files cover common newsletter formatting patterns.
- Unsupported features fail early with actionable messages.
- Draft verification catches missing title, missing body, broken links, and obvious formatting loss.
