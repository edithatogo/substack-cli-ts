# Track 21: Community Features (Notes, Chat, Recommendations)

## Goal

Enable management of Substack community features — Notes (social posts), chat/DMs, threads/Q&A, and the publication recommendations network.

## Scope

- Create, read, and manage Notes (social posts)
- Chat/DM interactions (if API-accessible)
- Threads/Q&A management
- Publication recommendations network management
- Cross-publication promotion
- Recommend/unrecommend other publications

## Discovery Needed

Before implementation begins, research is required in these areas:

1. **Notes API endpoints**: Research the Notes API surface available via Substack's internal endpoints. Notes are Substack's Twitter-like social feature. Check `jakub-k-slys/substack-api` which already lists `GET /api/v1/notes`. Determine if Notes support create, delete, like, reshare, and reply operations. Map the Notes data model (content, media attachments, visibility, threading).

2. **Notes feed and timeline**: Determine if there's a Notes timeline/feed endpoint and whether it can be filtered by publication, followed accounts, or trending content.

3. **Chat/DM API surface**: Investigate whether Substack Chat (the DMs/group chat feature) has any known API endpoints. Check if Chat is entirely WebSocket-based or has REST endpoints. Determine feasibility — Chat may require real-time protocols that don't map well to a CLI tool.

4. **Threads/Q&A management**: Research the Threads feature (publication-wide Q&A or discussion threads). Identify endpoints for listing, creating, and managing threads. Determine the relationship between Threads and Comments.

5. **Recommendations API**: Identify endpoints for the publication recommendations network — listing recommended publications, getting recommendation status, recommending/unrecommending another publication. Check for endpoints related to cross-publication promotion settings and recommendation request management.

6. **Third-party research**: Review `jakub-k-slys/substack-api` for Notes endpoints. Check `python-substack` and `substack-mcp` for any community feature endpoints already discovered.

7. **Dashboard UI mapping**: Map relevant sections of the Substack dashboard — Notes composer, Chat interface, Threads management, Recommendations settings page. Understand the feature set that would need CLI equivalents.

8. **Auth scoping for community features**: Determine if Notes and Recommendations use the same session/auth as the rest of the API, or if they require separate authentication (e.g., Notes may use a different subdomain or API path).

## Dependencies

- Track 06 (API Auth) — session extraction for authenticated requests
- Track 07 (API Read Model) — typed read model patterns, shared API client
- Track 15 (MCP Integration) — MCP surface for read-only community data

## Acceptance Criteria

- `substack-cli note list` shows recent Notes from the publication
- `substack-cli note create <text> --yes` creates a new Note
- `substack-cli note delete <note-id> --yes` deletes a Note
- `substack-cli recommendation list` shows recommended and recommending publications
- `substack-cli recommendation status <publication-url>` checks recommendation status for a publication
- `substack-cli recommendation add <publication-url> --yes` recommends another publication
- `substack-cli recommendation remove <publication-url> --yes` removes a recommendation
- MCP surface exposes read-only community data (Notes feed, recommendation list)
- All write operations require `--yes` confirmation
- Output is typed with Zod and can be piped as JSON
- Chat and Threads are documented as "not CLI-accessible" if no suitable API surface is found

## Current Status

**In Progress (notes+following implemented, chat/recommendations pending)**

**Implemented:**
- `api notes list` — list recent notes from own profile via `listNotes()` in `notes.ts`
- `api notes get <id>` — get full note details via `getNote()`
- `api notes create --body <text>` — create and publish a new note via `createNote()`
- `api following` — list followed users via `client.ownProfile().following()`

**Pending:**
- Note delete, like, reshare, reply
- Recommendations network management (recommend/unrecommend publications)
- Chat/DM (likely WebSocket-based, not CLI-accessible)
- Threads/Q&A management
