# Risks

- SEC-ORIGIN-005: Bind credentials and cookies to verified HTTPS origins, paths, and redirect destinations.
- SEC-PUBLICATION-AUTHORITY-006: Distinguish authentication from authorization and require verified publication identity and role for every mutation.
- SEC-WORKSPACE-007: Enforce an explicit workspace boundary for every CLI and MCP filesystem read or write.
- SEC-STRUCTURED-REDACTION-010: Redact and classify sensitive data structurally before any value reaches console, logs, MCP output, traces, fixtures, errors, or CI artefacts.
- SEC-THREAT-MODEL-011: Maintain an evidence-backed threat model for CLI, browser, internal API, official API, MCP stdio, MCP HTTP, registry distribution, state storage, and supply-chain boundaries.
- Implementation scope must remain bounded by the track contract and verification evidence.
- Some legacy issue lineage may not support native subissue links.
- Registry claims need deferred verification in implementation
