# Design

```mermaid
flowchart LR
    PR[Pull request] --> WP[Actionlint and zizmor]
    PR --> DR[Dependency review and OSV]
    PR --> CQ[CodeQL]
    MAIN[Default branch or schedule] --> SC[OpenSSF Scorecard]
    MAIN --> OSV[Full OSV scan]
    LOCK[package-lock.json] --> SB[SPDX and CycloneDX generator]
    SB --> SV[SBOM validator]
    LOCK --> LP[Licence and signature policy]
    SC --> SARIF[Security SARIF]
    CQ --> SARIF
    OSV --> SARIF
    SV --> ART[Versioned workflow evidence]
```

Workflow permissions default to `contents: read`. Security-event and identity-token permissions are granted only to jobs that publish SARIF or Scorecard results. Pull requests are read-only analysis surfaces; release attestations remain in T09-03 so untrusted changes cannot acquire signing authority.
