# Risks

- GOV-PLAN-FIRST-001: The first Codex execution is planning-only. It may create or update programme-governance artefacts, Conductor context, the canonical contract, GitHub issues/subissues, and the planning PR, but it must not change runtime source, dependencies, lockfiles, release configuration, or live Substack state.
- GOV-APPROVAL-GATE-005: Implementation may begin only after the user explicitly approves the green planning PR using the approved plan hash.
- Planning-only scope could drift into implementation tasks.
- Some legacy issue lineage may not support native subissue links.
- Registry claims need deferred verification in implementation
