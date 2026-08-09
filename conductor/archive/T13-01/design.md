# Design

## Assurance topology

```mermaid
flowchart LR
    A[Machine-readable taxonomy] --> B[Fast deterministic tier]
    A --> C[Deep deterministic tier]
    A --> D[Credentialed canary tier]
    B --> E[Unit and regression]
    B --> F[Integration, smoke and CLI]
    B --> G[Edge, property, metamorphic and Zod fuzz]
    C --> H[DST and VCR replay]
    C --> I[CDC and mutation]
    C --> J[Autonomous agent and semantic judge contracts]
    D --> K[Browser publication canary]
    D --> L[Live pinned-model judge canary]
    E --> M[Verification receipt]
    F --> M
    G --> M
    H --> M
    I --> M
    J --> M
    K --> N[Separate authorization and cleanup receipt]
    L --> N
    M --> O[Required GitHub check]
    O --> P{Actionable blocker or comment?}
    P -->|Yes, repository-owned| Q[Fix in the same bounded PR]
    Q --> O
    P -->|No| R[Merge small PR and confirm remote incorporation]
    P -->|External gate| S[Record blocker and owner action]
```

## Deterministic replay and judging

```mermaid
sequenceDiagram
    participant T as Test scenario
    participant A as Agent or judge adapter
    participant P as Policy and schema
    participant R as Seeded simulator or replay fixture
    T->>A: Versioned task and rubric
    A->>P: Validate input and authority
    P-->>A: Allowed bounded actions
    A->>R: Execute with seed or scenario ID
    R-->>A: Recorded structured response
    A->>P: Validate output and invariants
    P-->>T: Pass, refusal, or fail-closed error
```

## Decisions

- Test modalities are capabilities with explicit contracts, not aliases for one broad Vitest invocation.
- Deterministic adapters and recorded responses test agent/judge integration in required CI; live-model quality is separately evidenced and never inferred.
- TUI testing is not applicable while the product has no interactive terminal UI; CLI subprocess integration remains mandatory.
- Existing unit, mutation, browser e2e, fixture-transport, and fuzz tests are retained and registered rather than duplicated without value.
