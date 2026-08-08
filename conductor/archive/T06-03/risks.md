# Risks

- COR-BOOLEAN-001: Parse frontmatter booleans strictly so false remains false, especially shouldSendEmail.
- SEC-NO-WRITE-PROBING-008: Prohibit guessed POST, PUT, PATCH, or DELETE endpoint discovery.
- MUT-REVISION-006: Unschedule and published revision preserve the canonical URL where required, default to no resend, reconcile before and after, and never use a schedule endpoint as an unschedule guess.
- SCHEDULE-POLICY-007: Enforce whole-publication schedule collisions, queue caps, maximum horizon, normalized spacing, IANA timezone semantics, DST ambiguity handling, and remote precision tolerances.
- SETTINGS-ALLOWLIST-004: Publication settings updates require an approved plan and transmit only a strict allowlisted patch with before-state evidence.
- ARCH-ADAPTERS-003: Separate official Substack API, undocumented internal creator API, browser automation, and simulator adapters with explicit support and stability labels.
- FEATURE-FIDELITY-008: Expand content, media, scheduling, notes, comments, analytics, backup, and publication-management features only through evidence-backed contracts.
- Planning-only scope could drift into implementation tasks.
- Some legacy issue lineage may not support native subissue links.
- Registry claims need deferred verification in implementation
