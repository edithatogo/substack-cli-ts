# Risks

- GOV-CONTRACT-002: Create a canonical machine-readable implementation contract derived from this prompt and make it the binding source of truth for all subsequent work.
- DEP-RUNTIME-CURRENT-004: Use the newest supported Node.js Current release and newest compatible npm release as the main development, CI, build, test, and release baseline.
- TEST-RISK-WEIGHTED-002: Replace misleading headline coverage with risk-weighted assurance and remove blanket exclusions from high-risk modules.
- CI-ONE-COMMAND-006: Provide one deterministic verification command that runs contracts, generation drift, types, lint, tests, coverage, mutation, fuzz smoke, package checks, MCP conformance, security checks, and receipt generation.
- CI-CROSS-PLATFORM-007: Run blocking checks on Linux, macOS, and Windows using the main Node Current runtime and exact package-manager version.
- Planning-only scope could drift into implementation tasks.
- Some legacy issue lineage may not support native subissue links.
- Registry claims need deferred verification in implementation
