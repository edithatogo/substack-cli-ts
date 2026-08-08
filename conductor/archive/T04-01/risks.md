# Risks

- NET-IDEMPOTENCY-004: Retry mutations only when server-side idempotency is verified and actually transmitted, or when reconciliation proves the original mutation did not occur.
- SEC-PUBLICATION-AUTHORITY-006: Distinguish authentication from authorization and require verified publication identity and role for every mutation.
- PLAN-CANONICAL-001: Every significant mutation must be represented by a canonical immutable machine-readable plan before execution.
- PLAN-INDEPENDENT-APPROVAL-002: Approval must be cryptographically or independently bound to the exact plan and must not be a self-generated unhashed checksum available to the planner.
- Implementation scope must remain bounded by the track contract and verification evidence.
- Some legacy issue lineage may not support native subissue links.
- Registry claims need deferred verification in implementation
