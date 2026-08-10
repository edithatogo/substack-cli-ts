# Requirements T05-05

## Must

- Persistence failure MUST NOT overwrite an observed HTTP status with zero.
- Local persistence retries MUST be bounded and MUST NOT replay HTTP requests.
- Writes MUST fail closed with an unknown outcome when cooldown state is not durable.
- Typed errors MUST contain no credentials, content, headers, or account identifiers.
- Tests MUST cover transient success, terminal failure, no replay, and status preservation.

## Should

- Retry timing SHOULD be short, deterministic in tests, and exponential.
- Read callers SHOULD expose degraded persistence separately from network failure.

## Could

- Future receipts COULD expose redacted persistence-health counters.

## Won't

- This track WILL NOT make mutation persistence best-effort or retry an HTTP write.
