# Design

```mermaid
flowchart LR
    F[Standard read-only fetch] --> D{403 or challenge fingerprint?}
    D -->|No| R[Return JSON response]
    D -->|Yes, no provider| G[Return fallback required and CLI guidance]
    D -->|Yes, explicit provider| B[Open trusted local Playwright profile]
    B --> H[Human completes challenge or existing headless session refreshes]
    H --> S[Write ignored private storage state]
    H --> C[Extract refreshed cookie headers]
    C --> O[Retry GET exactly once]
    O --> R
    W[Write APIs] --> X[No browser fallback and no automatic replay]
```

Challenge detection inspects only status, bounded response text, and server headers; returned diagnostics contain no body. Playwright state uses the existing persistent local Chrome profile and standard `cookies`/`origins` format. The CLI defaults to headed operation and fails closed if no recognized Substack session exists.
