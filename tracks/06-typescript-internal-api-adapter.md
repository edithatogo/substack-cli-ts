# Track 06: TypeScript Internal API Adapter

## Goal

Create a TypeScript implementation inspired by the feature surface of `ma2za/python-substack`, alongside the existing browser/editor workflow. This track is for moving information in and out of Substack through authenticated internal endpoints when they work, while preserving the local browser path as a fallback.

## Rationale

`ma2za/python-substack` currently appears to be the most complete reference for practical Substack read/write automation. It documents email/password or cookie authentication, publication selection, draft creation, Markdown import, images, paywall nodes, embedded publications, sections, tags, prepublish, publish, and MCP tools.

The tradeoff is fragility: this path relies on undocumented Substack endpoints. It should be tested independently and isolated behind an adapter boundary.

## Adapter Shape

- `src/substack-api/client.ts`: authenticated HTTP client with redacted logging and typed errors.
- `src/substack-api/auth.ts`: cookie/session extraction from the local browser profile or an explicit cookie string.
- `src/substack-api/publications.ts`: current user, publications, sections, and publication switching.
- `src/substack-api/posts.ts`: create draft, update draft, fetch draft, prepublish, publish, and list posts.
- `src/substack-api/media.ts`: local and remote image upload helpers.
- `src/substack-api/markdown.ts`: bridge the existing Markdown/Tiptap parser to the internal post payload format.

## Evaluation Tasks

1. Build a read-only probe first: current user, publications, sections, and existing draft list.
2. Add draft creation using a harmless test Markdown file.
3. Add draft update and duplicate detection.
4. Add image upload and captioned image payloads.
5. Add prepublish validation without final publish.
6. Add publish only behind explicit `--yes` and a separate controlled test post.

## Acceptance Criteria

- The adapter works without storing raw credentials in Git-tracked files.
- All direct endpoint calls have typed request/response validation.
- The CLI can choose `--transport browser` or `--transport api`.
- Failure of the API adapter falls back cleanly to browser draft creation.
- Publish remains opt-in and never happens as part of a default command.

## Decision Gate

If the API adapter reliably handles draft create/update, image upload, metadata, and prepublish on the target account, prioritize it for everyday use and keep browser automation for login/session refresh and emergency fallback. If it fails due to authentication or endpoint drift, continue with the browser/editor track.
