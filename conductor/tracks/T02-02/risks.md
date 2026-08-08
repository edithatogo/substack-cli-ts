# Risks

- GOV-EXISTING-WORK-004: Reconcile all existing issues, pull requests, branches, tracks, decisions, and partially implemented work before creating new work items.
- DEP-NO-EXPERIMENTAL-LANE-001: There must be no separate experimental dependency lane, branch, package, or non-blocking workflow. Selected bleeding-edge dependencies and experimental capabilities belong to the main library and normal required CI.
- DEP-FRONTIER-MAINLINE-002: Migrate every direct dependency to the newest maintained upstream release available at execution time, preferring an official next, canary, nightly, dev, beta, rc, or alpha channel over latest stable when such a channel exists and represents newer supported code.
- DEP-EXPERIMENTAL-FEATURE-AUDIT-003: Inspect every direct dependency and runtime for relevant experimental APIs, flags, transports, extensions, performance controls, and security features; adopt all relevant features in mainline.
- DEP-COHERENCE-007: Keep tightly coupled dependency families on coherent versions and eliminate accidental duplicate majors.
- DEP-RENOVATE-009: Configure Renovate to track the same prerelease channels used by mainline, pin exact versions and action digests, and open normal blocking PRs rather than experimental-lane updates.
- Planning-only scope could drift into implementation tasks.
- Some legacy issue lineage may not support native subissue links.
- Registry claims need deferred verification in implementation
