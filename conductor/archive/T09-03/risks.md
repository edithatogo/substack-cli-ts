# Risks

- DEP-FRONTIER-MAINLINE-002: Migrate every direct dependency to the newest maintained upstream release available at execution time, preferring an official next, canary, nightly, dev, beta, rc, or alpha channel over latest stable when such a channel exists and represents newer supported code.
- DEP-COHERENCE-007: Keep tightly coupled dependency families on coherent versions and eliminate accidental duplicate majors.
- DEP-PUBLIC-PACKAGE-008: Remove the public package's file:vendor/substack-api dependency and establish a publishable, reproducible ownership model.
- MCP-PACKAGING-007: Produce installable npm, MCPB, Docker/OCI, stdio, and Streamable HTTP distributions from one reproducible release.
- CI-ONE-COMMAND-006: Provide one deterministic verification command that runs contracts, generation drift, types, lint, tests, coverage, mutation, fuzz smoke, package checks, MCP conformance, security checks, and receipt generation.
- SEC-SUPPLY-CHAIN-008: Implement mature supply-chain controls: immutable action SHAs, CodeQL, dependency review, actionlint, zizmor, OpenSSF Scorecard, maintained secret scanning, OSV scanning, licence policy, npm signature audit, SBOMs, provenance, and signed attestations.
- RELEASE-REPRODUCIBLE-010: Use trusted publishing, reproducible artefacts, provenance, clean-room installation, version synchronization, release notes, rollback, and staged release channels.
- Implementation scope must remain bounded by the track contract and verification evidence.
- Some legacy issue lineage may not support native subissue links.
- Registry claims need deferred verification in implementation
