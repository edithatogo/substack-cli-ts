# Design options T19-01

## Recommended architecture

Introduce a pure compatibility analyzer between payload construction and transport. It consumes node JSON plus an explicit target profile and returns structured findings. Transport remains separate. Authenticated canary verification consumes the same findings and adds observed runtime evidence.

## Options and trade-offs

- **Static profiles:** fast, deterministic and testable; vulnerable to upstream schema drift.
- **Authenticated canary:** detects real drift; slower, stateful, rate-limited and authentication-dependent.
- **Stored-post round trip:** detects transport mutation; does not prove browser editability.
- **Complexity budgets:** useful for diagnosing duplicate-DOM pressure; thresholds can produce false positives.
- **Selective normalization:** preserves operability but is lossy and must require an explicit policy and preview.
- **CLI-only update:** restores editing capability but does not repair Substack's UI.

The design should combine the first three signals and treat complexity metrics as explanatory rather than dispositive.
