# Threat model

## Boundaries

The CLI crosses local Markdown, browser automation, Substack APIs, MCP stdio/HTTP, local state, npm packaging, CI, and external registries. Credentials and publication mutations remain user-owned and local-first.

| Threat | Control | Evidence | Residual risk |
| --- | --- | --- | --- |
| Credential exfiltration | Ignored secret files, structural redaction, no-export telemetry | Secret scan and privacy tests | User-hosted browser/session compromise |
| SSRF and malicious URLs | URL policy and explicit publication targets | URL/policy tests | Upstream redirect behaviour |
| Prompt or argument injection | Typed command boundaries and safe parser output | CLI/parser tests | Malicious local content still requires user authorization |
| Path traversal | Resolved path checks and bounded fixture roots | Parser/state tests | Platform-specific filesystem semantics |
| Confused deputy | Authority, approval, and mutation guards | P01/P04 tests | External provider authorization semantics |
| Replay or duplicate mutation | Idempotency keys, state records, and guarded execution | Mutation/state tests | Outcome-unknown provider responses |
| Supply-chain compromise | Lockfile, audit, SBOM, provenance, immutable release artifact policy | CI and release receipts | Hosted service compromise |
| PII leakage | Redaction, fingerprinting, minimal logs, no-export default | Privacy and telemetry tests | User-supplied secrets in third-party tools |
| Malicious repository content | Secret scan, parser sanitization, bounded generated artifacts | Fuzz/property and scan receipts | Novel parser vulnerabilities |

Each release must re-evaluate this table and record new controls or residual risk in its receipt.

Related: [privacy](privacy.md), [P01 boundaries](p01-threat-model.md), [compliance](../governance/compliance.md).
