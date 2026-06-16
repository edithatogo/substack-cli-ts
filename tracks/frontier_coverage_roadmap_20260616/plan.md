# Track 42 Implementation Plan: Frontier Coverage Roadmap

## Phase 1: Coverage Schema and Source of Truth

- [x] Task: Define the coverage data model and validation contract
    - [x] Add a typed coverage schema for capability domains, status labels, execution paths, safety classes, evidence links, and next actions.
    - [x] Add unit tests for required fields, invalid status labels, missing fallbacks, missing evidence, and unsupported-feature decision records.
    - [x] Implement the validator until the schema tests pass.
    - [x] Run focused validation for the schema task.
    - [x] Self-review the schema task diff and apply safe fixes.
    - [x] Commit the completed schema task.
- [x] Task: Seed the canonical Substack capability matrix
    - [x] Add machine-readable matrix rows for publishing, media, live, Creator OS, Notes/community, growth, analytics, moderation, publication/admin, integrations, and distribution/agent surfaces.
    - [x] Link existing implemented tracks, tests, docs, fixtures, and known external/admin gates as evidence.
    - [x] Add decision records for unsupported, dashboard-only, app-only, and capture-first surfaces.
    - [x] Run focused validation for the seeded matrix.
    - [x] Self-review the matrix task diff and apply safe fixes.
    - [x] Commit the completed matrix task.
- [x] Task: Generate the human-readable roadmap from the matrix
    - [x] Add a generator that renders the matrix into a stable Markdown roadmap.
    - [x] Include coverage status summaries, missing evidence, fallback coverage, launch gates, and next implementation lanes.
    - [x] Add tests or snapshots for generated roadmap output.
    - [x] Run focused validation for the generated roadmap task.
    - [x] Self-review the generator task diff and apply safe fixes.
    - [x] Commit the completed generator task.
- [x] Task: Phase 1 review, push, and CI handoff
    - [x] Run relevant project validation for Phase 1.
    - [x] Review the full Phase 1 diff and apply safe fixes.
    - [x] Push the branch to the remote.
    - [x] Check GitHub Actions for the pushed branch or pull request.
    - [x] Address failing checks and push fixes before starting Phase 2.

## Phase 2: CLI, Docs, and Run-Log Surfaces

- [x] Task: Add coverage audit CLI commands
    - [x] Add commands for coverage validation, summary/report output, gap lookup, and decision-record inspection.
    - [x] Keep command handlers thin and delegate schema/matrix logic to modules.
    - [x] Add CLI smoke tests for successful validation, missing-evidence failure, and generated report output.
    - [x] Run focused validation for the CLI task.
    - [x] Self-review the CLI task diff and apply safe fixes.
    - [x] Commit the completed CLI task.
- [x] Task: Add launch/admin checklist artifacts
    - [x] Add checklists for npm publish, GitHub release/provenance, MCP registry, VS Code, Copilot, Claude, Gemini, Codex, Substack admin, support, security, and rollback readiness.
    - [x] Add docs explaining account-gated/manual/admin boundaries.
    - [x] Add tests or validation for checklist completeness.
    - [x] Run focused validation for the checklist task.
    - [x] Self-review the checklist task diff and apply safe fixes.
    - [x] Commit the completed checklist task.
- [x] Task: Add run-log actions for roadmap operations
    - [x] Add action names for `coverage.audit`, `coverage.validate`, `coverage.drift`, `launch.check`, `endpoint.capture.review`, and `decision.record`.
    - [x] Include diagnostics for unsupported endpoint evidence, manual/admin gates, and stale docs.
    - [x] Add tests for run-log serialization and redaction behavior.
    - [x] Run focused validation for the run-log task.
    - [x] Self-review the run-log task diff and apply safe fixes.
    - [x] Commit the completed run-log task.
- [ ] Task: Phase 2 review, push, and CI handoff
    - [ ] Run relevant project validation for Phase 2.
    - [ ] Review the full Phase 2 diff and apply safe fixes.
    - [ ] Push the branch to the remote.
    - [ ] Check GitHub Actions for the pushed branch or pull request.
    - [ ] Address failing checks and push fixes before starting Phase 3.

## Phase 3: MCP Read-Only Roadmap Tools

- [ ] Task: Add safe MCP resources for coverage artifacts
    - [ ] Expose coverage matrix, generated roadmap, launch checklists, and decision records as read-only MCP resources.
    - [ ] Ensure outputs redact sensitive local paths, secrets, cookies, tokens, and account-private details.
    - [ ] Add MCP tests for resource discovery and redaction.
    - [ ] Run focused validation for the MCP resources task.
    - [ ] Self-review the MCP resources task diff and apply safe fixes.
    - [ ] Commit the completed MCP resources task.
- [ ] Task: Add safe MCP tools for roadmap review
    - [ ] Add tools to validate the matrix, summarize gaps, inspect a capability, and review launch/admin readiness.
    - [ ] Do not add Substack write operations or broad mutation tools.
    - [ ] Add MCP tool tests for happy paths, validation failures, and unsupported-feature diagnostics.
    - [ ] Run focused validation for the MCP tools task.
    - [ ] Self-review the MCP tools task diff and apply safe fixes.
    - [ ] Commit the completed MCP tools task.
- [ ] Task: Phase 3 review, push, and CI handoff
    - [ ] Run relevant project validation for Phase 3.
    - [ ] Review the full Phase 3 diff and apply safe fixes.
    - [ ] Push the branch to the remote.
    - [ ] Check GitHub Actions for the pushed branch or pull request.
    - [ ] Address failing checks and push fixes before starting Phase 4.

## Phase 4: Drift Monitoring and Final Track Closeout

- [ ] Task: Add official-doc and endpoint-drift workflow
    - [ ] Add docs and scripts for refreshing official Substack support-page evidence before future coverage updates.
    - [ ] Add diagnostics for endpoint shape changes, unavailable endpoints, and stale capture fixtures.
    - [ ] Add tests for drift report parsing and stale-evidence detection where feasible.
    - [ ] Run focused validation for the drift task.
    - [ ] Self-review the drift task diff and apply safe fixes.
    - [ ] Commit the completed drift task.
- [ ] Task: Add final roadmap documentation and examples
    - [ ] Document how to add capabilities, evidence, fallback paths, decision records, and launch/admin results.
    - [ ] Add examples for a fully covered feature, a read-only feature, a capture-first feature, and a manual/admin-only gate.
    - [ ] Update Conductor and track documentation to reference Track 42 without overclaiming external gates.
    - [ ] Run focused validation for the docs task.
    - [ ] Self-review the docs task diff and apply safe fixes.
    - [ ] Commit the completed docs task.
- [ ] Task: Final track review, push, GitHub Actions, and external-gate record
    - [ ] Run full relevant validation, including `npm run typecheck`, `npm test`, and available CI-equivalent checks.
    - [ ] Review the full track diff and apply safe fixes.
    - [ ] Push the final branch state to the remote.
    - [ ] Create or update the pull request if needed.
    - [ ] Check GitHub Actions results for the track.
    - [ ] Address failing actions and push fixes until checks pass or a true external/account gate is documented.
    - [ ] Record any remaining npm, MCP registry, client, Substack admin, or authenticated live-check blockers as explicit external gates.
