# Track 03: Draft, Publish, and Schedule Workflow

## Goal

Support safe draft creation first, then validated publish and schedule flows with explicit user confirmation.

## Current State

- `draft examples/basic.md` successfully opens the local authenticated editor, fills title/body, and verifies editor text.
- `publish` and `schedule` commands exist but the final confirmation screens are not validated.
- Direct editor-state injection is not enabled as the default path.

## Next Tasks

1. Add draft metadata support for subtitle, slug, tags, audience, and section/publication selection.
2. Add an `update-draft` strategy so reruns can update an existing draft instead of creating duplicates.
3. Map the publish review screen and confirmation controls using local diagnostics first.
4. Map the schedule picker, timezone behavior, and validation error states.
5. Add a `--dry-run` and `--yes` confirmation matrix to tests and documentation.

## Acceptance Criteria

- Draft creation remains the default non-destructive command.
- Publish and schedule commands refuse to proceed without explicit confirmation.
- Successful publish/schedule runs return a post URL, status, and non-secret trace summary.
