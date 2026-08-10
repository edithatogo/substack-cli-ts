# Track T18-01: Metadata/body de-duplication correctness

## Overview

Prevent front-matter title and subtitle values from appearing again at the start of the article body while preserving legitimate editorial content and heading-derived title fallback.

## Acceptance criteria

- Exact leading title headings and subtitle paragraphs/headings are absent from prepared Markdown, HTML, and ProseMirror content.
- Formatting does not prevent exact rendered subtitle matching.
- Non-matching headings, standfirsts, and later matching text remain untouched.
- Title fallback from a leading heading without front matter remains supported.
- Examples and agent-facing guidance use one canonical metadata/body shape.

## Out of scope

- Fuzzy or semantic deletion of similar content.
- Editing already-created Substack drafts.
- Changing Substack title or subtitle field selectors.
