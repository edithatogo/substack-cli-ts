# Design T05-05

```mermaid
flowchart LR
  F[HTTP fetch once] --> O[Record status and headers]
  O --> P[Persist local rate-limit state]
  P -->|transient failure| R[Bounded local retry]
  R --> P
  P -->|success| C[Return response]
  P -->|terminal failure| E[Typed persistence error]
  E -->|read| D[Observed status plus degraded marker]
  E -->|write| X[Fail closed, unknown outcome]
```

The fetch boundary is isolated from post-response accounting. Only the local save operation is retried. A terminal error retains the observed status and channel without retaining response content or sensitive headers.
