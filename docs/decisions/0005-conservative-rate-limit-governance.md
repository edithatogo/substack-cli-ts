# Conservative rate-limit governance

Status: implementation slice, 2026-08-05.

Substack publishes no fixed numeric quota for the authenticated endpoints used by this CLI. The client therefore must not infer a quota from third-party services or probe after a 429.

## Policy

- one request in flight per origin;
- conservative spacing is enforced by the caller's limiter;
- `Retry-After` is authoritative when present;
- idempotent reads may use bounded jittered retries after cooldown;
- mutations are fail-closed by default and have zero automatic retries;
- an explicit retry configuration is permitted only where the caller has established idempotency;
- rate-limit metadata is redacted and never includes cookies or payloads.

## Trade-offs

This is slower and may require manual recovery after an ambiguous response, but it avoids duplicate writes and makes account protection more important than throughput. A future adaptive governor should persist cooldown state and expose a read-only status command.

## Fallbacks

If `Retry-After` is absent, stop and require an operator-approved cooldown before one diagnostic read. If repeated 429s or schema drift occur, stop live access and use fixtures/local catalogue data. Do not escalate request frequency.

See Senseno issue #1 and upstream issue #173 for the complete option analysis and test requirements.
