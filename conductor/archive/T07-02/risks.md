# Risks

- DEP-MCP-V2-006: Replace @modelcontextprotocol/sdk v1 with the newest v2 split packages and explicitly adopt MCP protocol revision 2026-07-28 in mainline.
- MCP-STATELESS-001: Serve MCP 2026-07-28 explicitly with the stateless core, self-describing requests, header-based routing, deterministic/cacheable catalogues, and per-request capabilities.
- MCP-DUAL-TRANSPORT-002: Provide first-class stdio and Streamable HTTP transports from the same capability registry, with deliberate legacy-era compatibility rather than duplicated servers.
- MCP-AUTH-005: Implement current MCP authorization hardening for remote distribution, including issuer validation, credential isolation, scope step-up, client metadata documents, TLS, and least privilege.
- Planning-only scope could drift into implementation tasks.
- Some legacy issue lineage may not support native subissue links.
- Registry claims need deferred verification in implementation
