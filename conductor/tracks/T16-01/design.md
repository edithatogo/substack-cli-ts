# Design

```mermaid
flowchart LR
    A[Agent tool arguments] --> M[MCP SDK registerTool]
    M --> Z[Canonical strict Zod object]
    Z --> P{Parse result}
    P -->|Invalid or unknown| E[Structured MCP validation error]
    P -->|Valid| H[Typed tool handler]
    H --> B[Core business logic]
    Z --> J[Zod 4 native JSON Schema export]
    J --> C[MCP client contract and assurance tests]
    S[Numeric string pagination] --> N[Bounded preprocess]
    N --> Z
```

Each tool references one schema object for runtime parsing and contract export. Pagination preprocessing accepts only trimmed decimal integer strings and leaves all other values unchanged so Zod can reject them. Strict objects close the input boundary to unknown keys. Zod 4's native exporter emits Draft 2020-12 schemas from the same runtime objects, preventing hand-maintained schema drift.
