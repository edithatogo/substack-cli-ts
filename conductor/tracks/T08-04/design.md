# Design T08-04

```mermaid
flowchart TD
  A[Manual workflow dispatch] --> B{Exact confirmation and protected environment}
  B -->|invalid| X[Fail closed]
  B -->|valid| C{Dedicated Substack origin not denylisted}
  C -->|invalid| X
  C -->|valid| D[Create uniquely marked draft]
  D --> E[Reconcile marker]
  E --> F[Revise draft]
  F --> G[Unschedule draft]
  D --> H[Finally cleanup by draft ID]
  E --> H
  F --> H
  G --> H
  H --> I[Redacted passed or uncertain receipt]
```

The runner accepts a reviewed same-origin lifecycle contract and constrains methods per operation. It never stores response bodies, cookies, or publication content in receipts. Compatibility CI is independent of the live write workflow and records repository-tested support separately from owner-gated or production-observed evidence.
