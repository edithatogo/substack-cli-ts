# Plan

## Phase 1: Contract and tests

- [x] Task: Define MoSCoW requirements, threat boundaries, risks, and Mermaid architecture.
- [x] Task: Probe current Zod, MCP SDK, and converter compatibility.
- [x] Task: Add tests for registration coverage, coercion, defaults, bounds, strict rejection, and generated JSON Schema.
- [x] Task: Phase verification and checkpoint per `conductor/workflow.md`.

## Phase 2: Implementation

- [x] Task: Replace every MCP input shape with a canonical strict Zod object.
- [x] Task: Add bounded pagination preprocessing and field descriptions.
- [x] Task: Export generated JSON Schemas using the faithful Zod 4 native exporter.
- [x] Task: Phase verification and checkpoint per `conductor/workflow.md`.

## Phase 3: Hosted closeout

- [x] Task: Register P16/T16-01 in Conductor, nested GitHub issues, and Project #38.
- [ ] Task: Validate, commit with task note, push the small PR, and inspect every Action/comment.
- [ ] Task: Fix actionable blockers and merge only when required checks are green.
- [ ] Task: Confirm remote master, close/archive receipts, and remove disposable branches/worktrees.
- [ ] Task: Phase verification and checkpoint per `conductor/workflow.md`.
