# Risks

- DEP-FRONTIER-MAINLINE-002: Migrate every direct dependency to the newest maintained upstream release available at execution time, preferring an official next, canary, nightly, dev, beta, rc, or alpha channel over latest stable when such a channel exists and represents newer supported code.
- DEP-PUBLIC-PACKAGE-008: Remove the public package's file:vendor/substack-api dependency and establish a publishable, reproducible ownership model.
- ARCH-PUBLIC-API-004: Publish a stable programmatic API with explicit exports while preserving the CLI and MCP interfaces.
- Implementation scope must remain bounded by the track contract and verification evidence.
- Some legacy issue lineage may not support native subissue links.
- Registry claims need deferred verification in implementation
