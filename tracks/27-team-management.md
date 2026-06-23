# Track 27: Team Management

## Handoff

- **Assigned agent:** Cline
- **Assigned on:** 2026-06-04
- **Scope:** Resolve or explicitly document invite, remove, role-change, and team-permission gaps.

## Status

**Probe-only / Partial (list implemented, write/activity probes unconfirmed)**

**Implemented:**
- `api team list` CLI command — reads team members via `fetchTeamMembers()` from `GET /api/v1/publication/users`
- Email addresses are redacted by default; `api team list --include-emails` explicitly opts into full email output
- Team member schema with id, name, email, role
- `api team activity` — read probe for team activity endpoints
- `api team invite <email> --role <role> --yes` — invite probe with role validation
- `api team remove <user-id> --yes` — remove probe
- `api team role <user-id> --role <role> --yes` — role-change probe with role validation

**Pending:**
- No invite/remove/role-change/activity endpoints confirmed. Only `GET /api/v1/publication/users` is known available. Team write operations require browser DevTools network capture before promotion from probe-only support.

## Goal

Enable programmatic team and collaborator management — member listing, invitations, role changes, and activity monitoring.

## Scope

- List team members with roles (read-only currently partial via publicationUsers)
- Invite new collaborators via email
- Remove collaborators
- Change roles (admin, editor, contributor, reader)
- View activity log

## Need

- Identify team management API endpoints (likely `/api/v1/publication/users` or `/api/v1/team/`)
- Map the Substack dashboard team management UI to endpoints
- Research role/permission model — available roles and their capabilities
- Determine invitation flow — API-endpoint-driven or requires browser interaction (email confirmation, etc.)
- Check if activity log is accessible through a dedicated endpoint or inferred from other data
- Verify publicationUsers response schema — what role and permission data is already available
- Determine if role changes take effect immediately or require user acceptance

## Acceptance Criteria

- `substack-cli team list` shows all team members with email, role, and status
- `substack-cli team invite <email> --role <role>` sends an invitation
- `substack-cli team remove <user-id>` removes a collaborator (requires `--yes` confirmation)
- `substack-cli team role <user-id> --role <role>` changes a member's role (requires `--yes` confirmation)
- `substack-cli team activity` shows recent team activity log
- Invite, remove, and role-change operations require `--yes` confirmation
- Role values validated against known set (admin, editor, contributor, reader) before sending
- PII (emails) redacted by default unless `--include-emails` is passed

## Dependencies

- Track 06 (API Auth) — cookie extraction and session validation
