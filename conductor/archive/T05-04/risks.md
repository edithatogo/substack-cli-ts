# Risks

- MUT-COMPENSATION-005: Every reversible or partially reversible mutation produces a compensating plan and recovery instructions.
- STATE-SQLITE-001: Use the current Node built-in SQLite capability where appropriate for transactional state, durable tasks, approvals, event logs, mappings, migrations, and locks.
- MAPPINGS-PORTABLE-005: Use server publication IDs, stable content IDs, repository-relative paths, preserved import provenance, and efficient event hashing.
- BACKUP-RECOVERY-007: Provide lossless export, import, backup, verification, restore, and rollback for local state and recoverable Substack content.
- Implementation scope must remain bounded by the track contract and verification evidence.
- Some legacy issue lineage may not support native subissue links.
- Registry claims need deferred verification in implementation
