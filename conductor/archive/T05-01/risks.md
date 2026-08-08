# Risks

- STATE-SQLITE-001: Use the current Node built-in SQLite capability where appropriate for transactional state, durable tasks, approvals, event logs, mappings, migrations, and locks.
- STATE-AUDIT-002: Maintain an append-only tamper-evident event ledger with hash chaining, stable identities, and minimal privacy-preserving records.
- MCP-TASKS-003: Implement the current MCP Tasks extension for durable long-running operations using capability negotiation and the transactional state store.
- Implementation scope must remain bounded by the track contract and verification evidence.
- Some legacy issue lineage may not support native subissue links.
- Registry claims need deferred verification in implementation
