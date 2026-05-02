# Track 13: Dependency and Discovery Register

## Goal

Maintain a living register of missed work, open questions, and interdependencies discovered during implementation.

## Dependency Map

```text
06 API Auth
  -> 07 API Read Model
  -> 08 API Draft Write Model
  -> 11 API Prepublish/Publish/Schedule

01 Editor Schema + 02 Content Feature Parity
  -> 09 API Content Payload Compatibility
  -> 08 API Draft Write Model

06 API Auth + 09 Payload Compatibility
  -> 10 API Media Upload

04 Browser Runtime Hardening + Existing Browser Workflow + 08 Draft Write + 11 Publish/Schedule
  -> 12 Transport Selection and Fallback

12 Transport Selection and Fallback
  -> 03 Draft, Publish, and Schedule

14 Quality, CI, and Automation
  -> 15 MCP Integration
```

## Discovery Process

When new work is found:

1. Add it to the Open Discoveries table below.
2. Record the source: GitHub project, Substack UI observation, failing test, browser trace, or user request.
3. Identify dependencies and blocked tracks.
4. Promote it into a numbered track when it becomes implementation-ready.

## Open Discoveries

| ID   | Discovery                                                                                                 | Source                        | Depends On    | Blocks              | Status                                                                                                                                                                      |
| ---- | --------------------------------------------------------------------------------------------------------- | ----------------------------- | ------------- | ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D001 | Determine whether schedule is available through a stable internal endpoint or must remain browser-only.   | Research matrix               | Tracks 07, 08 | Track 11            | **Resolved**: `POST /api/v1/drafts/{id}/schedule` confirmed in `src/substack-api/publish-write.ts`. Already implemented in `schedule` CLI command via `--transport api` with `draft_scheduled_at` body field. Schedule is available through the internal API; browser-only is no longer required. |
| D002 | Decide whether subscriber/analytics export belongs in this CLI or a separate read/export command group.   | User goal: information in/out | Track 07      | Future export track | **Resolved**: Export belongs in this CLI under a new `export` command group. Track 07 (API Read Model) is fully implemented in `src/substack-api/read-model.ts` — inventory, drafts, posts, and sections are available through the same auth mechanism. A separate CLI would duplicate auth and config. Create `substack-cli export` as the future home for subscriber/analytics/backup export commands. |
| D003 | Determine how to safely persist source-file-to-draft mappings without leaking private titles or content.  | Draft update requirement      | Tracks 08, 12 | Track 08            | Resolved: local-only `.substack-cli/draft-mappings.json` store with redacted output                                                                                         |
| D004 | Identify license constraints before porting behavior from any open-source project.                        | GitHub research               | None          | All adapter tracks  | **Resolved**: Project is `"private": true` in `package.json`. No LICENSE file present. All dependencies use permissive licenses (MIT, Apache-2.0, BSD-2-Clause). The `ma2za/python-substack` reference in D006 is for endpoint confirmation only, not ported code. No license constraints found — all adapter work can proceed under permissive terms. |
| D006 | Confirm the exact draft create/update/fetch request bodies and returned IDs for the live Substack editor. | Track 08 implementation       | Track 08      | Track 08, 11, 12    | **Resolved**: Live browser capture at `fixtures/drafts/live-draft-contract.json` (captured 2026-04-29, publication `rareinsights.substack.com`). Confirms `POST /api/v1/drafts` (10 body keys: audience, draft_body, draft_bylines, draft_podcast_duration, draft_podcast_url, draft_section_id, draft_subtitle, draft_title, section_chosen, type) and `PUT /api/v1/drafts/{id}` (9 body keys: same minus audience/type, plus last_updated_at). Response returns `id: 195877779` + 60+ fields. Payload tests in `src/substack-api/payload.test.ts` validate create/update body keys against this fixture. `POST /api/v1/drafts/{id}/prepublish`, `POST /api/v1/drafts/{id}/publish`, `POST /api/v1/drafts/{id}/schedule`, `POST /api/v1/image`, and `GET /api/v1/sections` also confirmed. |
| D005 | Confirm the safest read-only endpoint for validating current user and publication from extracted cookies. | Track 06 implementation       | Track 06      | Track 07            | Resolved: use `/api/v1/handle/options` plus `/api/v1/user/{handle}/public_profile`                                                                                          |
| D007 | Define the initial MCP surface for exposing CLI summaries and validation flows without leaking secrets.   | User request                  | Track 14      | Track 15            | Resolved: `mcp surface` manifest, stdio MCP server, resources, and prompts                                                                                                  |
| D008 | Media upload requires base64 data URLs in JSON body, not multipart FormData.                              | Track 10 live E2E             | Tracks 09, 10 | Track 10            | **Resolved**: Substack API rejects `Content-Type: multipart/form-data`. Fixed in `src/substack-api/media-upload.ts` — reads local file, encodes to base64, sends as JSON `{"media_image_base64": "..."}` with `Content-Type: application/json`. 6 images uploaded successfully against live Substack. |
| D009 | `--dry-run` ignored in API publish/schedule path — handler fell through to executing the operation.       | Track 11 live validation       | Track 11      | Track 11            | **Resolved**: `options.dryRun` was parsed but never checked after prepublish. Fixed: short-circuits like `--review-only` before executing publish/schedule.                  |
| D010 | `--trace-out` + `--review-only` gap — review-only path returned before `maybeWriteTrace`, so no trace.   | Track 11 live validation       | Track 11      | Track 11            | **Resolved**: Moved `maybeWriteTrace` call before early-return in review-only path. Trace files now written correctly for review-only runs.                                 |
| D011 | Trace status hardcoded to `"published"` / `"scheduled"` even on failure.                                 | Track 11 live validation       | Track 11      | Track 11            | **Resolved**: Now uses `publishResult.status === "failed" ? "failed" : "published"` (dynamic status).                                                                       |

## Additional Improvements To Consider

### Completed

- ✅ `docs/decisions/` created with 4 ADRs: 0001 (quality toolchain), 0002 (transport strategy), 0003 (reusable module boundaries), 0004 (E2E testing).
- ✅ `substack-cli doctor` command implemented at `src/doctor/doctor.ts` — checks config, transport readiness, and ignored runtime files. Also exposed as MCP `doctor` tool.
- ✅ CI setup at `.github/workflows/ci.yml` — runs quality gate (install, format, lint, typecheck, coverage tests), production audit, secret scan, mutation testing (gating at 50% break threshold), and manual-only E2E job.
- ✅ `api draft duplicates` command matches prepared drafts against read-only inventory.
- ✅ `api draft section` command resolves section metadata against read inventory.
- ✅ `api draft inspect` bundles compatibility, section resolution, duplicates, and draft planning in a single report.
- ✅ Live draft capture fixture at `fixtures/drafts/live-draft-contract.json` — see D006.

### Still Open

- Extract stable reusable modules into local workspace packages only after the API surface settles.
- Add a `substack-cli export` command group for read-side backup once Track 07 read model is fully mapped.
- Add a controlled test publication before validating publish/schedule operations.
- Persist a normalized contract matrix fixture when repeated captures converge on the same candidates.
- Compare matrix fixtures with `api draft contract-matrix-compare` once repeated captures stabilize.
