# Plan

## Phase 1: Contract and tests

- [x] Task: Define MoSCoW requirements, threat boundaries, risks, and Mermaid architecture.
- [x] Task: Add deterministic tests for challenge detection, fallback decisions, one-shot retry, and secure state persistence.
- [x] Task: Phase verification and checkpoint per `conductor/workflow.md`.

## Phase 2: Implementation

- [x] Task: Implement challenge fingerprints and read-only browser fallback contracts.
- [x] Task: Implement private Playwright storage-state capture and automatic local-login recording.
- [x] Task: Add headed/headless `auth refresh-state` operation and documentation.
- [x] Task: Phase verification and checkpoint per `conductor/workflow.md`.

## Phase 3: Hosted closeout

- [x] Task: Register P15/T15-01 in Conductor, nested GitHub issues, and Project #38.
- [ ] Task: Validate, commit with task note, push the small PR, and inspect every Action/comment.
- [ ] Task: Fix actionable blockers and merge only when required checks are green.
- [ ] Task: Confirm remote master, close/archive receipts, and remove disposable branches/worktrees.
- [ ] Task: Phase verification and checkpoint per `conductor/workflow.md`.
