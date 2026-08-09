# Design T08-03

```mermaid
flowchart LR
  O[CLI MCP simulator parser state release] --> A[Bounded telemetry facade]
  A --> N[No-op OTel providers by default]
  A --> H[Explicit host-provider opt in]
  B[Deterministic benchmark suite] --> R[Machine-readable receipt]
  R --> G{Budget gate}
  G -->|within budget| P[CPU heap package profiles]
  G -->|regression| F[Block CI]
```

The telemetry facade uses the OpenTelemetry API but does not install a global provider or exporter. Performance automation measures real local read-only surfaces, compares results with versioned maximum budgets, and retains receipts and profiles without live network activity.

The repository-level npm peer-resolution bridge permits the exact TypeScript 7 nightly while typescript-eslint still declares support only through TypeScript 6. It is bounded by required lint, nightly typecheck, test, and compatibility jobs, and can be removed when upstream widens the peer range.
