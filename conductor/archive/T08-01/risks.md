# Risks

- NET-DISCRIMINATED-RESULT-002: Replace synthetic HTTP status 0 and broad status heuristics with discriminated transport outcomes and operation-specific success contracts.
- NET-OUTCOME-UNKNOWN-003: Represent lost responses after a possible mutation as outcome-unknown and reconcile before any replay.
- NET-IDEMPOTENCY-004: Retry mutations only when server-side idempotency is verified and actually transmitted, or when reconciliation proves the original mutation did not occur.
- RATE-LIMIT-SAFE-006: Rate-limit policy imports may only move toward greater safety by default and cannot self-assert server provenance or confidence.
- TEST-SIMULATOR-001: Build a deterministic Substack protocol simulator with fake clock, deterministic RNG, request ledger, partial failures, lost responses, retries, auth expiry, schema drift, conflicts, rate limits, redirects, and zero-mutation assertions.
- Implementation scope must remain bounded by the track contract and verification evidence.
- Some legacy issue lineage may not support native subissue links.
- Registry claims need deferred verification in implementation
