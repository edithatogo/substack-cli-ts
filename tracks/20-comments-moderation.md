# Track 20: Comments & Moderation

## Handoff

- **Assigned agent:** Cline
- **Assigned on:** 2026-06-04
- **Scope:** Resolve or explicitly document spam/quarantine, commenter management, and comment-settings gaps.

## Goal

Enable programmatic comment management — reading, moderating, and configuring comments on posts without using the Substack dashboard.

## Scope

- List comments on a post (with pagination and threading)
- Moderate comments: approve, delete, pin, reply
- Spam detection and quarantine management
- Comment settings per post and globally
- Commenter management: mute, ban, approve

## Discovery Needed

Before implementation begins, research is required in these areas:

1. **Comments API endpoints**: Validate the existence and structure of `/api/v1/comments` and related endpoints. Map the full request/response shape including query parameters for post ID, sorting, pagination, threading depth.

2. **Comment moderation endpoints**: Identify the API endpoints for approving, deleting, pinning, and replying to comments. Determine whether these are separate endpoints or use a common `PATCH /api/v1/comments/{id}` pattern with status field updates.

3. **Spam classification**: Research whether Substack's API returns a spam confidence score or classification on comments, or if spam detection requires heuristic matching (keyword patterns, link count, account age). Determine if quarantine/unspam actions are exposed via API.

4. **Comment settings**: Map the globals and per-post comment settings model — fields like `commenting_enabled`, `must_be_paid_subscriber`, `must_be_subscriber`, `hold_for_review`, `auto_approve_repeated_commenters`. Identify endpoints for reading and updating these settings.

5. **Commenter management API**: Locate endpoints for muting, banning, and approving commenters. Determine whether these are scoped per-publication or per-post.

6. **Third-party research**: Check `jakub-k-slys/substack-api` for known comment endpoints (already referenced in docs). Review `substack-mcp` for any comment-related tool implementations.

7. **Dashboard UI mapping**: Map the Substack dashboard Comments tab — identify how moderators review, filter, and batch-approve/delete comments. Determine if there's a queue view for held comments and spam.

8. **Pagination and volume**: Understand how comment pagination works for posts with many comments. Check if there's a count/aggregate endpoint.

## Dependencies

- Track 06 (API Auth) — session extraction for authenticated requests
- Track 07 (API Read Model) — typed read model patterns, shared API client

## Acceptance Criteria

- `substack-cli comment list <post-id>` shows comments with threading and pagination
- `substack-cli comment list <post-id> --status held` filters to comments awaiting moderation
- `substack-cli comment approve <comment-id> --yes` approves a held comment
- `substack-cli comment delete <comment-id> --yes` deletes a comment
- `substack-cli comment pin <comment-id> --yes` pins a comment
- `substack-cli comment reply <comment-id> <text> --yes` replies to a comment as the publication
- `substack-cli comment settings <post-id>` shows current comment settings for a post
- `substack-cli comment settings <post-id> --require-paid --yes` updates post comment settings
- `substack-cli commenter mute <user-id> --yes` mutes a commenter
- `substack-cli commenter ban <user-id> --yes` bans a commenter
- All destructive actions (approve, delete, pin, reply, settings changes, mute, ban) require `--yes`
- Output is typed with Zod and can be piped as JSON

## Current Status

**Partial (list + moderation implemented, commenter-mgmt probe-only, spam/quarantine not CLI-accessible)**

**Implemented (new in this session, 2026-06-04):**
- `src/substack-api/comments.ts` — complete API module with:
  - `fetchCommentsForPost()` from `GET /api/v1/post/{postId}/comments` with `--limit`, `--status`, cursor pagination
  - `moderateComment()` — POST `/api/v1/comments/{id}/{action}` for approve/delete/pin/unpin
  - `replyToComment()` — POST `/api/v1/comments/{id}/reply`
  - `getCommentById()` — uses vendored `substack-api` `client.commentForId()`
  - `fetchCommentSettings()` — probe pattern for post comment settings
  - `updateCommentSettings()` — confirmation-gated write probe for known comment settings fields
  - `muteCommenter()` / `banCommenter()` — probe pattern (endpoints tentative, returns "not-found" if no endpoint responds)
- CLI commands under `api comment`:
  - `api comment list <post-id>` — list comments with `--limit`, `--status` (e.g. `held`)
  - `api comment get <comment-id>` — single comment by ID
  - `api comment approve <comment-id> --yes`
  - `api comment delete <comment-id> --yes`
  - `api comment pin <comment-id> --yes`
  - `api comment reply <comment-id> <text> --yes`
  - `api comment settings <post-id>` — show comment settings for a post
  - `api comment settings <post-id> --require-paid --yes` — probe comment settings updates
  - All destructive actions require `--yes`
- CLI commands under `api commenter`:
  - `api commenter mute <user-id> --yes`
  - `api commenter ban <user-id> --yes`
  - Both use probe patterns; respond with `"not-found"` if no endpoint responds

**Not CLI-accessible (no endpoints discovered):**
- Spam detection and quarantine management (no API endpoint known)
- Comment settings write operations remain probe-only until dashboard DevTools capture confirms the exact endpoint
- Commenter approve/unmute — no endpoint discovered
