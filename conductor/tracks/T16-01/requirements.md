# Requirements

## Must have

- **MUST-01 Canonical inputs:** Every MCP tool input is a named strict Zod object, including explicit empty objects for zero-argument tools.
- **MUST-02 Runtime boundary:** Pass complete schemas directly to MCP SDK `registerTool` so parsing occurs before business logic.
- **MUST-03 Safe coercion:** Preprocess only trimmed decimal integer strings for pagination limits.
- **MUST-04 Bounds and defaults:** Default pagination to 10 and enforce integer values from 1 through 100 inclusive.
- **MUST-05 Strict rejection:** Reject missing mandatory fields, unknown fields, blank strings, decimals, non-numeric strings, zero, negatives, and values above 100.
- **MUST-06 Descriptions:** Describe every accepted input field in the schema source of truth.
- **MUST-07 Generated contract:** Export JSON Schema from the same Zod objects without handwritten schema duplication.
- **MUST-08 Schema fidelity:** Test object type, closed properties, numeric type, bounds, defaults, descriptions, and one-to-one tool coverage.
- **MUST-09 Deterministic assurance:** Test without network access, live credentials, browser state, or Substack writes.
- **MUST-10 Traceability:** Link P16 #473, T16-01 #474, Project #38, Conductor, commit notes, PR, checks, comments, merge, and cleanup.
- **MUST-11 Small PR cadence:** Deliver and close this capability as an independent green PR.
- **MUST-12 Proactive blockers:** Self-address repository failures while preserving unrelated dirty work and external gates.

## Should have

- **SHOULD-01 Native Zod 4 export:** Prefer `z.toJSONSchema` because the current Zod version provides a faithful Draft 2020-12 exporter.
- **SHOULD-02 Reusable pagination schema:** Share one pagination contract across inventory and notes tools.
- **SHOULD-03 Typed handlers:** Preserve MCP SDK inference from parsed Zod output.

## Could have

- **COULD-01 Generated documentation:** Render the exported schemas into API documentation in a later contract-generation track.
- **COULD-02 Output schemas:** Add canonical Zod output contracts for every MCP tool in a separate bounded track.

## Won't have in this track

- `zod-to-json-schema`: version 3.25.2 produced an empty schema for the repository's Zod 4 objects during a compatibility probe; retaining it would weaken validation and duplicate Zod 4's native exporter.
- Broad input coercion, permissive unknown fields, raw handwritten JSON Schema, live tool execution, or mandatory second-person approval.
