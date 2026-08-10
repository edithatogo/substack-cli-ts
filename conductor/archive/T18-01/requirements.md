# Requirements T18-01

## Must

- Remove exact leading metadata repetitions at the shared preparation boundary.
- Keep Markdown, HTML, and ProseMirror representations synchronized.
- Add deterministic regression and preservation tests.
- Correct examples and document the agent authoring contract.

## Should

- Treat inline formatting as presentation rather than a text mismatch.
- Preserve title fallback when title front matter is absent.

## Could

- Add future diagnostics for near-matching title/deck content.

## Won't

- Remove content based on fuzzy, semantic, or LLM judgment.
