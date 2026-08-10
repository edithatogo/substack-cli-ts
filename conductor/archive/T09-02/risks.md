# Risks

- SEC-STRUCTURED-REDACTION-010: Redact and classify sensitive data structurally before any value reaches console, logs, MCP output, traces, fixtures, errors, or CI artefacts.
- SEC-THREAT-MODEL-011: Maintain an evidence-backed threat model for CLI, browser, internal API, official API, MCP stdio, MCP HTTP, registry distribution, state storage, and supply-chain boundaries.
- SEC-SUPPLY-CHAIN-008: Implement mature supply-chain controls: immutable action SHAs, CodeQL, dependency review, actionlint, zizmor, OpenSSF Scorecard, maintained secret scanning, OSV scanning, licence policy, npm signature audit, SBOMs, provenance, and signed attestations.
- Planning-only scope could drift into implementation tasks.
- Some legacy issue lineage may not support native subissue links.
- Registry claims need deferred verification in implementation
