# Risks

- NET-OUTCOME-UNKNOWN-003: Represent lost responses after a possible mutation as outcome-unknown and reconcile before any replay.
- MUT-RECONCILE-004: Verify mutation success by reading remote after-state and comparing it to the approved plan.
- MUT-COMPENSATION-005: Every reversible or partially reversible mutation produces a compensating plan and recovery instructions.
- MUT-REVISION-006: Unschedule and published revision preserve the canonical URL where required, default to no resend, reconcile before and after, and never use a schedule endpoint as an unschedule guess.
- Planning-only scope could drift into implementation tasks.
- Some legacy issue lineage may not support native subissue links.
- Registry claims need deferred verification in implementation
