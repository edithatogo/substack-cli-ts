# Track 06: API Auth and Session Extraction

## Goal

Create a safe authentication layer for internal API probes without committing or logging raw credentials, cookies, or session payloads.

## Scope

- Extract usable cookies from the existing local Chrome profile.
- Accept an explicit cookie string from ignored local environment variables.
- Validate the session by fetching the current user and configured publication.
- Redact credentials and cookies in logs, traces, errors, and test fixtures.

## Dependencies

- Existing local browser profile from Track 04.
- Existing config and redaction utilities.

## Blocks

- Track 07 API Read Model.
- Track 08 API Draft Write Model.
- Track 10 API Media Upload.
- Track 11 API Prepublish, Publish, and Schedule.

## Acceptance Criteria

- `substack-cli api auth status` reports local or environment cookie context without exposing secrets.
- Missing, expired, or mismatched sessions fail with actionable recovery steps.
- Unit tests cover redaction and session validation failure modes.

## Current Progress

- Added `SUBSTACK_COOKIE` as an ignored environment option.
- Added local browser profile cookie extraction through Playwright persistent context.
- Added `substack-cli api auth status --source auto|env|local-profile`.
- Added redacted cookie summaries and session-cookie detection tests.
- Added read-only validation through `/api/v1/handle/options` and `/api/v1/user/{handle}/public_profile`.

## Remaining Work

- None for the local Conductor scope. Later tracks added shared API response classification, redacted failures, and a local typed read model while preserving `substack-api` where it is useful.
