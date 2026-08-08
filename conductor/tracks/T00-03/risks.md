# Risks

- GOV-PLAN-FIRST-001: The first Codex execution is planning-only. It may create or update programme-governance artefacts, Conductor context, the canonical contract, GitHub issues/subissues, and the planning PR, but it must not change runtime source, dependencies, lockfiles, release configuration, or live Substack state.
- GOV-NESTED-ISSUES-003: Represent the programme as a native GitHub issue hierarchy cross-referenced bidirectionally with Conductor.
- GOV-EXISTING-WORK-004: Reconcile all existing issues, pull requests, branches, tracks, decisions, and partially implemented work before creating new work items.
- Planning-only scope could drift into implementation tasks.
- Some legacy issue lineage may not support native subissue links.
- Registry claims need deferred verification in implementation
