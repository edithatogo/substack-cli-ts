# Track 33: CI, Coverage, and Quality Hardening

## Status

**In Progress**

## Goal

Bring CI/CD, documentation checks, testing, automation, and code-quality gates up to a strict standard, with enforceable coverage above 90% for the unit-testable TypeScript surface.

## Scope

- Fix currently broken quality gates.
- Make GitHub Actions triggers and permissions explicit.
- Enforce strict coverage thresholds in `vitest.config.ts`.
- Keep secret scanning useful without false-positive failures on public author metadata.
- Document residual gaps that cannot be completed in one pass without broad test expansion.

## Completed Items

- [x] Add `workflow_dispatch` so the manual E2E job is reachable.
- [x] Fix secret-scan false positives for public author metadata.
- [x] Re-run quality gates and record current pass/fail state.
- [x] Create `src/parser/extensions.test.ts` — covers PaywallDivider, SubscribeWidget, SubstackImage, EmbedNode, getTiptapExtensions.
- [x] Create `src/substack-api/draft-section.test.ts` — 7 test cases covering all resolution statuses and score ordering.
- [x] Create `src/mcp/catalog.test.ts` — covers buildMcpToolDescriptors, buildMcpToolGroups, registerMcpTools.
- [x] Create `src/mcp/manifest.test.ts` — covers buildMcpSurfaceManifest, summarizeMcpSurface, buildMcpSummaryResource.
- [x] Expand `src/substack-api/payload.test.ts` — adds unsupported marks, shouldSendEmail, update-without-lastUpdatedAt, and full-ok validation tests.
- [x] Expand `src/substack-api/client.test.ts` — adds requestJson network error and parse failure tests.
- [x] Expand `src/mcp/resources.test.ts` — adds registerMcpResources test.
- [x] Expand `src/mcp/prompts.test.ts` — adds registerMcpPrompts test.
- [x] Set enforceable coverage thresholds in `vitest.config.ts` at the current measured baseline.

## Acceptance Criteria

- [x] `npm run format:check` passes.
- [x] `npm run lint` passes.
- [x] `npm run typecheck` passes.
- [x] `npm run build` passes.
- [x] `npm run test:coverage` passes with the current enforceable baseline thresholds.
- [x] `npm run scan:secrets` passes without ignoring real credential patterns.
- [x] CI exposes manual E2E execution via `workflow_dispatch`.

## Current Coverage Gap

Coverage thresholds in `vitest.config.ts` are set to the current enforceable baseline. The long-term target remains 91% for all metrics, but it is not yet realistic without broad test expansion.

| Metric     | Latest Measured | Current Gate | Long-Term Target |
| ---------- | --------------: | -----------: | ---------------: |
| Statements |          78.30% |          78% |              91% |
| Branches   |          62.83% |          62% |              91% |
| Functions  |          82.73% |          82% |              91% |
| Lines      |          79.92% |          79% |              91% |

Largest remaining gaps are in auth browser flows, MCP catalog (inner handler functions), `draft-write.executeDraftWrite`, `read-model.readApiInventory`, and branch coverage across API probe modules (`publication.ts`, `subscriber.ts`, `email.ts`, `analytics.ts`, `billing.ts`, `podcast.ts`, `integrations.ts`, `team.ts`, `notes.ts`).

## Next Steps for Follow-Up Pass

- Add unit tests for `executeDraftWrite` in `draft-write.ts` (all error branches: network, 409, 400+, missing draftId).
- Add unit tests for `readApiInventory` in `read-model.ts` (all failure and schema-drift branches).
- Add branch coverage tests for API probe modules (`publication.ts`, `subscriber.ts`, `email.ts`, `analytics.ts`, `billing.ts`, `podcast.ts`, `integrations.ts`, `team.ts`, `notes.ts`).
- Add unit tests for `uploadDraftMedia` and `uploadImage` error branches.
- Keep adding branch/error-path tests and raise thresholds incrementally until `npm run test:coverage` consistently passes at the 91% target.
