# Track 24: Email & Newsletter Design

## Status

**Planned (no discovered endpoints)**

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

- `substack-cli email template` shows current email template settings (header, footer, logo, colors)
- `substack-cli email template --set` updates template settings with confirmation
- `substack-cli email send <draft-id>` sends a test email
- `substack-cli email broadcast list` shows broadcast history with status, date, metrics
- `substack-cli email broadcast cancel <broadcast-id>` cancels a scheduled broadcast
- Subject line and preview text settable per post via frontmatter or `email` command options
- `should_send_email` properly wired through the full draft→publish pipeline
- Send and cancel operations require `--yes` confirmation

## Dependencies

- Track 06 (API Auth) — cookie extraction and session validation
- Track 17 (Publication Settings) — template settings likely stored as publication configuration
