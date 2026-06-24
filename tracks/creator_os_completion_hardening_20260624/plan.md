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

- [ ] Task: Define first-party artifact schemas
    - [ ] Campaign plan schema.
    - [ ] Media/audio/live plan schemas.
    - [ ] Analytics snapshot and trend schemas.
    - [ ] Growth report schema.
    - [ ] Run-log schema.
    - [ ] Coverage and drift snapshot schemas.
- [ ] Task: Generate local contract artifacts
    - [ ] CLI command/options contract.
    - [ ] MCP tools/resources/prompts contract.
    - [ ] Safe-surface and capability status contract.
    - [ ] Version metadata renderer.
- [ ] Task: Add contract tests
    - [ ] Snapshot generated contract artifacts.
    - [ ] Fail when public surfaces change without a version decision.
    - [ ] Add release checklist enforcement.

## Phase 3: Evidence and Capture Infrastructure

- [ ] Task: Implement capture-kit validation
    - [ ] Redaction rules for cookies, tokens, IDs, emails, private names, and payment/subscriber fields.
    - [ ] Fixture minimizer.
    - [ ] Endpoint inventory renderer.
    - [ ] Endpoint diff report.
- [ ] Task: Connect capture evidence to coverage status
    - [ ] Evidence hash fields.
    - [ ] Last verified timestamp fields.
    - [ ] Graduation checks for planning/probe/manual surfaces.

## Phase 4: Creator OS Differentiators

- [ ] Task: Add local creator data warehouse
    - [ ] Normalize campaigns, posts, Notes, referrers, subscribers, revenue probes, and run logs.
    - [ ] Export SQLite or DuckDB plus CSV/Parquet where practical.
    - [ ] Add cohort and campaign attribution reports.
- [ ] Task: Add deliverability and compliance preflight
    - [ ] Subject and preview checks.
    - [ ] Link and UTM checks.
    - [ ] Canonical URL, social image, and alt text checks.
    - [ ] Audience and schedule collision checks.
- [ ] Task: Add backup/export-first safety
    - [ ] Redacted backup plan.
    - [ ] Snapshot validation.
    - [ ] Manual restore checklist.

## Phase 5: Hardening and Launch Completion

- [ ] Task: Add strictest TypeScript lane
    - [ ] `tsconfig.strictest.json`.
    - [ ] Advisory CI job.
    - [ ] Source fixes before test-helper fixes.
- [ ] Task: Harden CI/CD
    - [ ] Required audit and secret scan gates after false-positive cleanup.
    - [ ] Stable Node matrix.
    - [ ] Experimental dependency lane.
    - [ ] SBOM and provenance evidence.
    - [ ] Branch protection/ruleset documentation.
- [ ] Task: Add release and external launch scorecard
    - [ ] Local readiness report.
    - [ ] External owner/admin gate report.
    - [ ] Registry, marketplace, npm, GitHub release, docs, support, and rollback checks.

## Phase 6: Review and Closeout

- [ ] Task: Run full local validation
    - [ ] `npm run typecheck`
    - [ ] `npm test`
    - [ ] `npm run test:coverage`
    - [ ] `npm run frontier:drift`
- [ ] Task: Review and apply fixes
    - [ ] Run Conductor review.
    - [ ] Apply safe review fixes.
    - [ ] Push branch.
    - [ ] Check GitHub Actions and address failures.
