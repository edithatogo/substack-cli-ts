# Track 41: Creator OS Upgrade

## Goal

Move the CLI beyond single-post Markdown publishing into campaign planning, native media/live planning, growth snapshots, community triage, and agent-safe Creator OS operations.

## Scope

- Add campaign plan, validate, execute-readiness, and run-log report commands.
- Add planning-only native video, audio, and live video workflows.
- Add analytics snapshots, local trend summaries, and campaign growth reports.
- Add recommendations, Boost, comments triage, and campaign Notes validation surfaces.
- Extend MCP with read-only creator planning and review tools.
- Extend front matter and run-log schemas for creator campaign metadata.

## Acceptance Criteria

- [x] `campaign plan`, `campaign validate`, `campaign execute`, and `campaign report` are wired.
- [x] `media video plan`, `media audio plan`, and `live plan` default to planning-only output.
- [x] `analytics snapshot`, `analytics trend`, and `growth report` support local growth workflows.
- [x] `recommendations inspect`, `boost inspect`, `comments triage`, and `notes campaign` are available.
- [x] MCP exposes read-only campaign planning, validation, analytics trend, and campaign report tools.
- [x] Creator OS front matter and run-log actions are parsed and tested.
- [x] Docs and smoke tests cover the public command surface.

## Implementation Notes

- New planner modules live under `src/creator/`.
- Campaign plans produce `campaign.json` artifacts with post, publish, notes, channels, assets, UTM, issues, and next-command fields.
- Live Substack mutations remain on existing publish, schedule, note, and API commands with explicit confirmation gates.
- Native video/live endpoints remain capture-first until safe dashboard contracts are verified.
- MCP creator tools are read-only and do not expose new Substack write operations.

## Validation

- [x] `npm run typecheck`
- [x] `npm run ci`
- [x] `npm test`
- [x] `npm run knip` (existing `ignoreBinaries` configuration hint remains)
