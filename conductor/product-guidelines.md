# Product Guidelines
- Contract-first planning and traceability.
- Runtime implementation is permitted after the plan-only first-invocation gate and must pass required verification.
- Native GitHub hierarchy and canonical mapping.
- Explicit evidence for every mapped contract.

- Every implementation task must add or update automated tests, or record a bounded applicability receipt explaining why tests do not apply.
- Fail-closed: unconfirmed publish/schedule, missing credentials, and unverified live writes are errors, not best-effort successes.
- Solo maintainer: automated checks replace required human review. Do not add CODEOWNERS or a review count.
- Prefer this repo’s `AGENTS.md` over the parent `careops-finance` contract.
