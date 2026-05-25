# Track 07: API Read Model

## Goal

Map the read-side Substack entities needed for export, diagnostics, and safe write operations.

## Scope

- Current user and profile.
- Publications and publication switching.
- Sections, authors, tags, drafts, published posts, and redirects.
- Optional read-side exports such as recommendations, comments, subscriptions, and basic analytics where accessible.

## Dependencies

- Track 06 API Auth and Session Extraction.

## Blocks

- Track 08 API Draft Write Model, because write calls need stable user, publication, and section IDs.
- Track 11 API Prepublish, Publish, and Schedule.

## Acceptance Criteria

- Read probes are typed with Zod or equivalent runtime validation.
- CLI can emit JSON for user, publication, section, draft, and post inventories.
- Failures distinguish unauthenticated, unauthorized, not found, and schema drift cases.

## Current Progress

- Added `substack-cli api inventory --source auto|env|local-profile`.
- Added typed read model for authenticated handle/profile, publication list, configured publication, sections, and recent posts.
- Added shared API response classification for unauthenticated, forbidden, not found, schema drift, and network failures.

## Remaining Work

- None for the local Conductor scope. Draft inventory, bounded pagination metadata, and domain/redirect-adjacent diagnostics are covered by later read-model and domain tracks; unsupported dashboard-only surfaces are tracked in Track 31.
