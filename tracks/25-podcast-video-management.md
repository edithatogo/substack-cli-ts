# Track 25: Podcast & Video Management

## Handoff

- **Assigned agent:** Cline
- **Assigned on:** 2026-06-04
- **Scope:** Resolve or explicitly document podcast/video creation, scheduling, upload, and platform-parity gaps.

## Status

**Probe-only / Partial**

## Goal

Enable programmatic podcast and video content management — episodes, distribution settings, and media publishing.

## Verified Implementation

### CLI commands (all wired in `src/cli.ts`, lines 1962–2149)

| Command | Description | Status |
| --- | --- | --- |
| `api podcast section` | Show podcast section details (RSS feed URL) | ✅ |
| `api podcast episodes` | List podcast episodes | ✅ |
| `api podcast settings` | Show podcast distribution settings | ✅ |
| `api podcast create <audio-file>` | Create a podcast episode draft from audio | ✅ |
| `api podcast schedule <draft-id> --at <iso-date>` | Schedule a podcast episode | ✅ |
| `api podcast video upload <file>` | Upload a video file | ✅ |
| `api podcast video settings <post-id>` | Show video player settings and thumbnail | ✅ |

### Source module (`src/substack-api/podcast.ts`)

All functions implemented:
- `fetchPodcastSection()` — finds podcast section from `/api/v1/publication/sections`
- `fetchPodcastEpisodes()` — multi-endpoint probe (`podcast_episodes`, `podcast/episodes`)
- `fetchPodcastSettings()` — multi-endpoint probe for distribution settings
- `createPodcastEpisode()` — creates draft + uploads audio via base64 data URL, updates draft with `draft_podcast_url`
- `schedulePodcastEpisode()` — POSTs to `/api/v1/drafts/{id}/schedule`
- `uploadVideo()` — multi-endpoint probe for video upload via base64 data URL
- `fetchVideoSettings()` — probes post video settings endpoints

Key design decisions:
- **Reuses Track 10 media upload infrastructure** — base64 data URLs in JSON body (not FormData), matching the image upload pattern
- **`--yes` flag required** for all create/upload/schedule operations
- **Multi-endpoint probe pattern** — tries known paths, falls back gracefully with "not-found" / "may be dashboard-only" messages
- **Audio/Video format validation** — rejects unsupported formats before any file I/O or network calls
- **Audio upload endpoint fallback** — tries `/api/v1/drafts/{id}/audio`, then `/api/v1/drafts/{id}/podcast`
- **Video upload endpoint fallback** — tries `/api/v1/video/upload`, `/api/v1/publication/video/upload`, `/api/v1/media/video`
- **Thumbnail parsing** — standard + alternate field names for thumbnails

### Test coverage (`src/substack-api/podcast.test.ts`)

| Test suite | Count | Coverage |
| --- | --- | --- |
| `fetchPodcastSection` | 4 tests | happy path, schema-drift, not-found, HTTP error |
| `fetchPodcastEpisodes` | 3 tests | nested episodes, flat array, not-found |
| `fetchPodcastSettings` | 2 tests | distribution mapping, not-found |
| `podcast write probes` | 6 tests | unsupported format, create with temp file, existing draftId, upload failure, schedule success, schedule failure |
| `video probes` | 6 tests | unsupported format, upload with temp file, file-not-found, endpoint fallback, fetch settings, settings not-found |
| **Total** | **21 tests** | All functions and error paths covered |

### Updated files

- `src/substack-api/podcast.test.ts` — Expanded from 8 tests to 21 tests, adding coverage for error paths, alternative response shapes, and real-file upload flows
- `tracks/25-podcast-video-management.md` — Updated handoff with verified implementation details

### What was not changed

- `src/cli.ts` — All podcast/video commands were already wired; no CLI changes needed
- `src/substack-api/podcast.ts` — Implementation was already complete; no code changes needed
- `src/mcp/catalog.ts` — Podcast/video tools are not part of the MCP tool surface (they match the same pattern as other `api` subcommands like `api analytics`, `api email`, etc., which are also absent from the MCP catalog)
- `conductor/tracks.md` and `tracks/README.md` — Status remains "Probe-only / Partial" because several podcast/video endpoints are multi-endpoint probes and have not been live-confirmed.

### Verification

The full suite was verified after this implementation from an unsandboxed Windows process because sandboxed smoke tests cannot spawn `node.exe` on this machine.

## Acceptance Criteria (repo-side implementation verified)

- [x] `substack-cli podcast section` lists podcast section with RSS feed URL
- [x] `substack-cli podcast episode create <audio-file>` creates a draft with audio attachment when the probed endpoints are available
- [x] `substack-cli podcast episode schedule <id> --at <datetime>` schedules a podcast episode when the probed schedule endpoint is available
- [x] `substack-cli podcast settings` shows distribution settings
- [x] `substack-cli video upload <file>` uploads a video file when one of the probed video endpoints is available
- [x] `substack-cli video settings <post-id>` shows video player settings and thumbnail
- [x] Media operations reuse Track 10 upload infrastructure (base64 JSON body, image pipeline extended for audio/video)
- [x] Audio and video uploads require `--yes` confirmation before sending large files

## Dependencies

- Track 06 (API Auth) — cookie extraction and session validation
- Track 10 (Media Upload) — reusable upload infrastructure, base64 encoding, file type detection
