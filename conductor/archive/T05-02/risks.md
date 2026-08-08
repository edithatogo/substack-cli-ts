# Risks

- SEC-WORKSPACE-007: Enforce an explicit workspace boundary for every CLI and MCP filesystem read or write.
- SEC-SECRET-STORAGE-009: Separate project configuration, user configuration, runtime state, cache, browser profiles, audit logs, and credentials; protect credentials with the platform credential store or an equivalent encrypted design.
- SEC-STRUCTURED-REDACTION-010: Redact and classify sensitive data structurally before any value reaches console, logs, MCP output, traces, fixtures, errors, or CI artefacts.
- STATE-AUDIT-002: Maintain an append-only tamper-evident event ledger with hash chaining, stable identities, and minimal privacy-preserving records.
- Implementation scope must remain bounded by the track contract and verification evidence.
- Some legacy issue lineage may not support native subissue links.
- Registry claims need deferred verification in implementation
