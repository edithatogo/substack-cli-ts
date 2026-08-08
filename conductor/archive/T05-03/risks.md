# Risks

- MUT-COMPENSATION-005: Every reversible or partially reversible mutation produces a compensating plan and recovery instructions.
- MEDIA-TRANSACTION-003: Treat media staging and draft mutation as one recoverable transaction.
- SETTINGS-ALLOWLIST-004: Publication settings updates require an approved plan and transmit only a strict allowlisted patch with before-state evidence.
- MAPPINGS-PORTABLE-005: Use server publication IDs, stable content IDs, repository-relative paths, preserved import provenance, and efficient event hashing.
- RATE-LIMIT-SAFE-006: Rate-limit policy imports may only move toward greater safety by default and cannot self-assert server provenance or confidence.
- Planning-only scope could drift into implementation tasks.
- Some legacy issue lineage may not support native subissue links.
- Registry claims need deferred verification in implementation
