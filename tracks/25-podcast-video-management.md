# Track 25: Podcast & Video Management

## Status

**Complete**

## Goal

Enable programmatic podcast and video content management — episodes, distribution settings, and media publishing.

## Scope

- Podcast RSS feed management
- Episode creation and scheduling
- Audio file upload and hosting
- Spotify/Apple podcast distribution settings
- Native video upload and transcoding
- Video player settings and thumbnails
- Podcast section management

## Need

- Identify podcast-specific API endpoints (likely `/api/v1/podcast/` or via section/draft integration)
- Research native video upload API — differs from image upload (larger files, transcoding pipeline)
- Check if podcast episodes use the same draft/publish flow with `draft_podcast_url` / `draft_podcast_duration` fields (confirmed in D006 fixture)
- Map the Substack podcast settings dashboard to endpoints
- Determine video upload endpoint and accepted formats/codecs
- Research thumbnail generation and management for video
- Check if distribution settings (Spotify/Apple) are API-configurable or manually configured
- Verify storage limits for audio and video on free vs paid plans

## Acceptance Criteria

- `substack-cli podcast section` lists podcast section with RSS feed URL (read-only currently available)
- `substack-cli podcast episode create <audio-file>` returns a structured blocked response until safe endpoint captures exist; use media planning plus manual dashboard upload
- `substack-cli podcast episode schedule <id> --at <datetime>` returns a structured blocked response until safe endpoint captures exist
- `substack-cli podcast settings` shows distribution settings
- `substack-cli video upload <file>` returns a structured blocked response until safe endpoint captures exist; use `media video plan`
- `substack-cli video settings <post-id>` shows video player settings and thumbnail
- Media operations reuse Track 10 upload infrastructure (base64 JSON body, image pipeline extended for audio/video)
- Audio and video uploads require `--yes` confirmation before sending large files

## Dependencies

- Track 06 (API Auth) — cookie extraction and session validation
- Track 10 (Media Upload) — reusable upload infrastructure, base64 encoding, file type detection
