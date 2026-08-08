# Risks

- GOV-PLAN-FIRST-001: The first Codex execution is planning-only. It may create or update programme-governance artefacts, Conductor context, the canonical contract, GitHub issues/subissues, and the planning PR, but it must not change runtime source, dependencies, lockfiles, release configuration, or live Substack state.
- GOV-EXISTING-WORK-004: Reconcile all existing issues, pull requests, branches, tracks, decisions, and partially implemented work before creating new work items.
- GOV-REPOSITORY-STANDARDS-007: Integrate the current edithatogo/repository-standards system and inherit its latest applicable node/software, supply-chain, coverage, release, verification-receipt, and solo-maintainer controls.
- CONTEXT-ENGINEERING-012: Mature repository context for Codex and other agents using concise canonical AGENTS guidance, ADRs, architecture maps, data classifications, invariants, runbooks, and generated context indexes.
- Planning-only scope could drift into implementation tasks.
- Some legacy issue lineage may not support native subissue links.
- Registry claims need deferred verification in implementation
