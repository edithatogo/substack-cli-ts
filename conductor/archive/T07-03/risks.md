# Risks

- DEP-EXPERIMENTAL-FEATURE-AUDIT-003: Inspect every direct dependency and runtime for relevant experimental APIs, flags, transports, extensions, performance controls, and security features; adopt all relevant features in mainline.
- DEP-MCP-V2-006: Replace @modelcontextprotocol/sdk v1 with the newest v2 split packages and explicitly adopt MCP protocol revision 2026-07-28 in mainline.
- STATE-SQLITE-001: Use the current Node built-in SQLite capability where appropriate for transactional state, durable tasks, approvals, event logs, mappings, migrations, and locks.
- MCP-TASKS-003: Implement the current MCP Tasks extension for durable long-running operations using capability negotiation and the transactional state store.
- MCP-APPS-004: Adopt the current MCP Apps extension in mainline for safe review-oriented interfaces such as plan review, trace comparison, coverage, campaign preview, and reconciliation.
- Implementation scope must remain bounded by the track contract and verification evidence.
- Some legacy issue lineage may not support native subissue links.
- Registry claims need deferred verification in implementation
