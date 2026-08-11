# Compliance posture

This document records what this repository can honestly claim. It is not a SOC 2, ISO, or legal opinion.

## Scope

`@edithatogo/substack-publisher` is a local CLI and MCP server the operator runs against a publication they already control. The maintainer is not a processor of subscriber lists, payment data, or Substack's production systems.

## Applicable expectations

| Topic | Posture | Evidence |
| --- | --- | --- |
| Licence | Apache-2.0 | `LICENSE` |
| Security reporting | Private vulnerability reporting | `SECURITY.md` |
| Secrets | Never committed; redacted on output | `AGENTS.md`, `scripts/secret-scan.mjs` |
| Live writes | Fail-closed; `--dry-run` then `--yes` | CLI publish/schedule gates |
| Telemetry | Off unless the host opts in | `docs/operations/observability.md` |
| Supply chain | Lockfile, SBOM, provenance, Scorecard | `.github/workflows/` |
| Accessibility of CLI help | Documented commands and `--help` | `docs/api/commands.md` |

## Explicitly out of scope

- Subscriber export, billing, or tax reporting.
- Hosted MCP gateways or multi-tenant credential vaults.
- Claiming GDPR/CCPA certification from local code alone.
- Treating Substack private endpoints as a contractual API.

Email and deliverability compliance for a live send remain the publication owner's responsibility. The CLI can run local preflight checks; it does not replace the owner's legal review.
