# Implementation Plan

## Phase 1: Documentation Baseline

- [x] Task: Add Creator OS completion and hardening roadmap
    - [x] Document current API documentation state.
    - [x] Document API contract/versioning target.
    - [x] Document evidence promotion ladder.
    - [x] Document feature lanes beyond native Substack parity.
    - [x] Document CI/CD, strictness, and dependency options.
- [x] Task: Link roadmap from user-facing documentation
    - [x] Update docs index.
    - [x] Update API architecture notes.
    - [x] Update frontier maintenance and drift workflows.
    - [x] Update release checklist.

## Phase 2: API Contract Versioning

- [x] Task: Define first-party artifact schemas
    - [x] Campaign plan schema.
    - [x] Media/audio/live plan schemas.
    - [x] Analytics snapshot and trend schemas.
    - [x] Growth report schema.
    - [x] Run-log schema.
    - [x] Coverage and drift snapshot schemas.
- [x] Task: Generate local contract artifacts
    - [x] CLI command/options contract.
    - [x] MCP tools/resources/prompts contract.
    - [x] Safe-surface and capability status contract.
    - [x] Version metadata renderer.
- [x] Task: Add contract tests
    - [x] Snapshot generated contract artifacts.
    - [x] Fail when public surfaces change without a version decision.
    - [x] Add release checklist enforcement.

## Phase 3: Evidence and Capture Infrastructure

- [x] Task: Implement capture-kit validation
    - [x] Redaction rules for cookies, tokens, IDs, emails, private names, and payment/subscriber fields.
    - [x] Fixture minimizer.
    - [x] Endpoint inventory renderer.
    - [x] Endpoint diff report.
- [x] Task: Connect capture evidence to coverage status
    - [x] Evidence hash fields.
    - [x] Last verified timestamp fields.
    - [x] Graduation checks for planning/probe/manual surfaces.

## Phase 4: Creator OS Differentiators

- [x] Task: Add local creator data warehouse
    - [x] Normalize campaigns, posts, Notes, referrers, subscribers, revenue probes, and run logs.
    - [x] Export local JSON/CSV artifacts; SQLite/DuckDB remains deferred until a dependency is justified.
    - [x] Add cohort and campaign attribution reports.
- [x] Task: Add deliverability and compliance preflight
    - [x] Subject and preview checks.
    - [x] Link and UTM checks.
    - [x] Canonical URL, social image, and alt text checks.
    - [x] Audience and schedule collision checks.
- [x] Task: Add backup/export-first safety
    - [x] Redacted backup plan.
    - [x] Snapshot validation.
    - [x] Manual restore checklist.

## Phase 5: Hardening and Launch Completion

- [x] Task: Add strictest TypeScript lane
    - [x] `tsconfig.strictest.json`.
    - [x] Advisory CI job.
    - [x] Source fixes before test-helper fixes.
- [x] Task: Harden CI/CD
    - [x] Required audit and secret scan gates after false-positive cleanup.
    - [x] Stable Node matrix.
    - [x] Experimental dependency lane.
    - [x] SBOM and provenance evidence.
    - [x] Branch protection/ruleset documentation.
- [x] Task: Add release and external launch scorecard
    - [x] Local readiness report.
    - [x] External owner/admin gate report.
    - [x] Registry, marketplace, npm, GitHub release, docs, support, and rollback checks.

## Phase 6: Review and Closeout

- [x] Task: Run full local validation
    - [x] `npm run typecheck`
    - [x] `npm test`
    - [x] `npm run test:coverage`
    - [x] `npm run frontier:drift`
- [x] Task: Review and apply fixes
    - [x] Run Conductor review.
    - [x] Apply safe review fixes.
    - [x] Push branch.
    - [x] Check GitHub Actions and address failures.
