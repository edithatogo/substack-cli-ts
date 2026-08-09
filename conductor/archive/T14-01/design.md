# Design

```mermaid
flowchart LR
    S[Six-hour schedule or manual dispatch] --> U[Deterministic unit tests]
    U --> P[Live read-only probe]
    V[GitHub variables: URL and contract] --> P
    C[Secret: tester cookie] --> P
    P --> H[Unauthenticated HTML GET]
    P --> J[Same-origin authenticated JSON GET]
    H --> D[Structural drift evaluator]
    J --> D
    D --> R[Redacted receipt artifact]
    D -->|failure| A[Alert dispatcher]
    K[Slack, Discord, PagerDuty secrets] --> A
    A --> I[Incident channel]
```

The public HTML request receives no cookie. Authenticated JSON requests are limited to reviewed same-origin paths. Redirects, oversized bodies, non-HTTPS targets, non-Substack hosts, malformed contracts, missing credentials, schema drift, and missing alert destinations fail closed. Evidence stores only origin, check names, status, and bounded diagnostics.
