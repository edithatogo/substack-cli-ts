# Track 18: Custom Domain Management

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

- **Planned**: `domain status` command (read-only)
- **Planned**: `domain set` command with DNS instruction output
- **Planned**: `domain remove` command with `--yes` guard
- **Planned**: Domain format validation utility (no protocol, valid FQDN, no path)
- **Planned**: DNS instruction template generation (record type, name, target per domain type)
- **Planned**: SSL status check and polling
- **Planned**: Zod schema for domain management responses
- **Planned**: E2E test that reads domain status and validates output format (no mutation)
