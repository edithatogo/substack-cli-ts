# Track 24: Email & Newsletter Design

## Handoff

- **Assigned agent:** Cline
- **Assigned on:** 2026-06-04
- **Last updated:** 2026-06-04
- **Scope:** Resolve or explicitly document full template/design editing, broadcast parity, and dashboard-only email-management gaps.

## Status

**Partial** — All acceptance criteria wired in CLI and covered by tests. Email template write (`api email set-template`) is probe-based and may fail if upstream endpoints are dashboard-only. Subject line = draft title (already in frontmatter), preview text = subtitle (already in frontmatter). `should_send_email` wired through draft payload.

## Goal

Enable programmatic email newsletter design and management — templates, subject lines, broadcast history, and send controls.

## Scope

- Email template design (header, footer, logo placement, colors)
- Subject line and preview text management per post
- Send test email functionality
- Broadcast history and scheduling
- Email customization per post
- `should_send_email` control (currently partially supported in frontmatter)

## Need

- Identify email design/template API endpoints (likely under publication settings or `/api/v1/emails/`)
- Check if email templates are stored as publication settings fields or separate resource
- Map the Substack dashboard email design interface to endpoints
- Determine test email sending capability (API endpoint vs browser-only)
- Research broadcast queue API — how scheduled emails are stored and managed
- Check if per-post email customization (subject, preview, header/footer override) is part of the draft model or separate
- Verify `should_send_email` field behavior in the draft create/update contract

## Acceptance Criteria

| # | Criterion | Status | Notes |
|---|-----------|--------|-------|
| 1 | `substack-cli api email template` shows current email template settings | ✅ | Probe-based, tries 3 known endpoints |
| 2 | `substack-cli api email set-template` updates template settings with confirmation | ✅ | `updateEmailTemplate()` with `--dry-run`/`--yes` support |
| 3 | `substack-cli api email send-test <draft-id>` sends a test email | ✅ | Probe-based, requires `--yes` |
| 4 | `substack-cli api email broadcast list` shows broadcast history | ✅ | With `--limit` option |
| 5 | `substack-cli api email broadcast cancel <broadcast-id>` cancels a scheduled broadcast | ✅ | Requires `--yes` |
| 6 | Subject line and preview text settable per post via frontmatter | ✅ | Subject = `title` → `draft_title`; Preview = `subtitle` → `draft_subtitle` |
| 7 | `should_send_email` properly wired through full draft→publish pipeline | ✅ | Parsed in `frontmatter.ts`, sent in `buildDraftWriteRequestBody()` |
| 8 | Send and cancel operations require `--yes` confirmation | ✅ | All write operations gated |

## Implementation Details

### Added in this reconciliation (2026-06-04)

- **`src/substack-api/email.ts`**: Added `EmailTemplateUpdate`, `UpdateEmailTemplateResult`, `updateEmailTemplate()`, and `mapEmailTemplateUpdateToBody()`.
- **`src/substack-api/email.test.ts`**: Added 5 tests for `updateEmailTemplate` (dry-run preview, missing-confirm preview, successful write, all-404, non-404 error).
- **`src/cli.ts`**: Added `api email set-template` command with `--header-html`, `--footer-html`, `--logo-url`, `--primary-color`, `--background-color`, `--text-color`, `--font-family`, `--dry-run`, `--yes`. Added imports for `EmailTemplateUpdate` and `updateEmailTemplate`.

### Already present before this track

- `fetchEmailTemplate()`, `fetchBroadcastHistory()`, `cancelScheduledBroadcast()`, `sendTestEmail()`
- CLI: `api email template`, `api email broadcast list`, `api email broadcast cancel`, `api email send-test`
- `shouldSendEmail` in `PostMetadata`, frontmatter parser, `SubstackDraftPayload`, draft write request body
- Subject line = `title`, preview text = `subtitle` in draft payload

### Known Gaps

1. **Email template write endpoints may be dashboard-only**: `updateEmailTemplate()` probes 3 known endpoints. Full template editing (drag-and-drop, logo upload, font pickers) is dashboard-only.
2. **Per-post email customization**: No separate `email_subject` or `email_preview_text` fields exist — uses `title`/`subtitle`. Would require Substack API discovery for separate fields.
3. **Broadcast scheduling from scratch**: Not supported — no endpoint discovered for queueing a new broadcast outside the publish/schedule workflow.
4. **Email analytics**: Covered by Track 22 (`api analytics email`).

## Dependencies

- Track 06 (API Auth) — cookie extraction and session validation
- Track 17 (Publication Settings) — template settings likely stored as publication configuration
