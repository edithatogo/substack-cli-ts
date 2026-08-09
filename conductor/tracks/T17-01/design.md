# Design

```mermaid
flowchart TD
    C[Conductor registry and contracts] --> M[Canonical issue maps]
    S[Supplemental track manifest] --> M
    M --> V[Read-only GraphQL hierarchy validator]
    G[GitHub programme issue 184] --> P[Phase subissues]
    P --> T[Track subissues]
    T --> K[Task or plan-phase subissues]
    V --> G
    K --> A[Native auto-add subissues workflow]
    A --> J[GitHub Project 38]
    J --> F[Governance fields and native workflows]
    V --> R[PR, master, daily, and manual checks]
```

The maturity contract remains authoritative for P00-P11. Supplemental tracks use a small manifest because they were approved after the frozen maturity prompt. The validator compares committed issue numbers and exact titles with GitHub's native parent-child graph and rejects duplicate identifiers. It performs no mutations. Project #38 uses its native auto-add-subissues workflow; this avoids storing a user Project PAT in the repository while retaining native Parent issue and Sub-issues progress fields.
