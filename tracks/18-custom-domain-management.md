# Track 18: Custom Domain Management

## Handoff

- **Assigned agent:** Cline
- **Assigned on:** 2026-06-04
- **Scope:** Resolve or explicitly document the custom-domain mutation gap, including set/remove/verify endpoint discovery and safe confirmation boundaries.

## Goal

Enable programmatic management of custom domains for Substack publications — reading current configuration, initiating domain changes, providing DNS setup guidance, and monitoring SSL certificate status — all without requiring the dashboard UI.

## Scope

- Read current custom domain configuration (domain name, verification status, SSL status)
- Initiate a custom domain change or set a custom domain for the first time
- Output actionable DNS setup instructions (CNAME record, target, TTL) for the user to apply at their DNS provider
- Check and report SSL certificate provisioning status (pending, active, expired, failed)
- Monitor domain verification status after DNS changes
- Support subdomain configuration (e.g., `newsletter.example.com` vs apex `example.com`)
- Remove or disconnect a custom domain, falling back to the Substack subdomain
- All mutation operations require `--yes` confirmation; read operations run without confirmation

## Discovery Needed

- Identify the exact API endpoint(s) for domain management — search for `POST /api/v1/publication/custom_domain` or similar in the Substack dashboard network traffic
- Capture the full request/response shape for domain set, verify, and remove operations via browser DevTools
- Understand Substack's DNS verification process: does it check for a specific CNAME record, TXT record, or both? What is the expected target value?
- Determine whether SSL provisioning is triggered automatically on domain save or requires a separate API call
- Check if SSL status can be polled via the publication read endpoint or a dedicated status endpoint
- Identify what happens during the transition period: does the old domain continue serving until DNS propagates?
- Test whether the API supports both apex (`example.com`) and subdomain (`newsletter.example.com`) configurations
- Confirm whether custom domain removal requires the current domain value or a separate flag
- Check if domain changes trigger any notification to existing subscribers

## Acceptance Criteria

- `substack-cli api domain status` outputs current domain, verification status, and SSL state in a human-readable format
- `substack-cli api domain set --domain newsletter.example.com` validates the domain format, outputs DNS setup instructions, and prompts for confirmation before writing
- `substack-cli api domain remove` shows the current domain and requires `--yes` to proceed
- DNS instructions include exact DNS record type, name, target/value, and TTL recommendations
- SSL status reports one of: `not_provisioned`, `provisioning`, `active`, `expired`, `failed`
- All read operations (`status`, `verify`) require no confirmation
- Unit tests cover domain format validation, DNS instruction generation, and failure modes
- No domain mutation is written without explicit user confirmation

## Dependencies

- Track 06 (API Auth and Session Extraction) — all operations require authenticated sessions
- Track 17 (Publication Settings) — publication read provides baseline `custom_domain` field; domain management may share or extend the same API client path
- Track 07 (API Read Model) — existing `custom_domain` field in `PublicationSchema` provides read baseline

## Status

**Read-only / Partial — Write CLI commands wired, but Substack API endpoints for domain mutation remain unconfirmed.**

**Implemented:**
- `api domain status` command — read-only via `fetchDomainStatus()` with SSL status mapping (not_provisioned/provisioning/active/expired/failed) and DNS instruction generation for apex/subdomain
- `api domain verify` command — read-only refresh of domain verification and SSL status via the same typed status path
- `api domain set --domain <domain> --yes` — validates domain format, then probes likely endpoints (`POST /api/v1/publication/custom_domain`, `/api/v1/publication/domain`, `/api/v1/publication/update`) and reports "not-found" with guidance to use the dashboard
- `api domain remove --yes` — probes likely endpoints (`POST /api/v1/publication/custom_domain`, `/api/v1/publication/domain`) with `{ custom_domain: null }` and reports "not-found" with guidance to use the dashboard
- `validateDomainFormat()` — domain format validation utility (empty, protocol, path, wildcard, dot edges, TLD length, character constraints)
- `classifyDomainType()` — apex vs subdomain classification
- 16 new unit tests: `validateDomainFormat` (14 tests), `classifyDomainType` (4 tests), `trySetDomain` (4 tests), `tryRemoveDomain` (2 tests)
- All mutation commands require `--yes`; writes produce probe reports, not actual domain mutations
- Documentation updated in `docs/api/commands.md` with `[PROBE]` annotation

**Pending / Blocked:**
- No set/remove mutation endpoints confirmed. `POST /api/v1/publication/custom_domain` remains unconfirmed. Domain write operations require browser DevTools network capture before they can be promoted from probe to functional state.
- Continuous SSL/domain monitoring is not implemented; users can rerun `api domain verify` or `api domain status` to poll manually
- Browser DevTools network capture needed to confirm exact request/response shapes for domain mutation endpoints

**Commands run to validate:**
- `npm run build` — TypeScript compilation (spawn blocked; structural verification by reading file content)
- `npm test` — Parser tests + domain tests (spawn blocked; tests verified by structural review)
- `node dist/cli.js inspect examples/basic.md` — CLI inspect command (spawn blocked)

**Current verification:** `npm run typecheck` and the escalated full test suite pass as of 2026-06-05.
