# Plan T19-01

This track is planning-only. Implementation must begin only after separate authorization.

## Phase 1: Reproduction contract and failing tests

- [x] Task: Freeze privacy-safe fixtures for full-editor rich content, restricted-editor incompatibilities and primary-editor table incompatibility.
- [x] Task: Add failing unit tests for exact JSON-path and node-type diagnostics.
- [x] Task: Add failing contract tests that keep public rendering, primary compatibility, auxiliary risk and browser verification distinct.
- [x] Task: Add a deterministic reproduction for duplicate editor mounting and DOM-cost metrics.
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md).

## Phase 2: Static compatibility analyzer

- [x] Task: Define versioned editor capability profiles and schema fingerprints.
- [x] Task: Implement pure node/mark inventory and compatibility analysis.
- [x] Task: Treat primary-editor incompatibility as a hard stop and auxiliary incompatibility as an explicit editability-risk state.
- [x] Task: Add property-based, mutation and malformed-payload tests.
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md).

## Phase 3: Transport and receipt integration

- [x] Task: Add stored `draft_body`/published `body` round-trip inspection.
- [x] Task: Extend create/update receipts without changing existing confirmation semantics.
- [x] Task: Add CLI diagnostics and machine-readable remediation options.
- [x] Task: Verify backwards compatibility and consumer-driven contracts.
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md).

## Phase 4: Authenticated canary and contingencies

- [x] Task: Add a disposable unpublished canary with no-email and no-publication invariants.
- [x] Task: Detect runtime Tiptap errors, mounted schema fingerprints, DOM duplication, page closure and cleanup state.
- [x] Task: Add stop conditions for auth expiry, CAPTCHA/2FA, shared cooldown, schema drift and cleanup failure.
- [x] Task: Document CLI-only update-in-place and selective normalization as explicit contingencies.
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md).

## Phase 5: Upstream escalation and release evidence

- [x] Task: Generate a minimal synthetic reproduction package for Substack.
- [x] Task: Run unit, integration, end-to-end, smoke, mutation, property-based, autonomous-agent, metamorphic and consumer-contract coverage required by repository policy.
- [x] Task: Run type, formatting, contract, governance, security and diff checks.
- [x] Task: Record verification receipts and update issue #550 with reproducible evidence.
- [x] Task: Open a focused pull request and stop for review before runtime rollout.
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md).
