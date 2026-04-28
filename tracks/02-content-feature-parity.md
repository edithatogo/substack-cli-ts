# Track 02: Content Feature Parity

## Goal

Make Markdown drafts render in Substack with predictable formatting and clear fallbacks for unsupported features.

## Current State

- Basic title and body insertion is validated through the local editor.
- HTML insertion works for a simple article with bold text and a link.
- Tables, images, embeds, and advanced newsletter blocks are not yet mapped.

## Next Tasks

1. Add Markdown coverage for lists, blockquotes, code blocks, inline code, and horizontal rules.
2. Implement image handling, including local file resolution, upload workflow, alt text, captions, and failure diagnostics.
3. Evaluate table support. If Substack cannot preserve tables reliably, add a table-to-image fallback track task.
4. Add embed syntax for URLs, YouTube, podcasts, and Substack-native embeds.
5. Add content verification that compares expected visible text and key links after editor insertion.

## Acceptance Criteria

- Example files cover common newsletter formatting patterns.
- Unsupported features fail early with actionable messages.
- Draft verification catches missing title, missing body, broken links, and obvious formatting loss.
