# Track 33: CI, Coverage, and Quality Hardening

## Status

**Complete**

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
- [x] Keep smoke tests in the default Vitest suite while excluding only credential-backed E2E tests.
- [x] Make `npm test` build the CLI before running tests so CLI smoke tests exercise current compiled output.

## Acceptance Criteria

- [x] `npm run format:check` passes.
- [x] `npm run lint` passes.
- [x] `npm run typecheck` passes.
- [x] `npm run build` passes.
- [x] `npm run test:coverage` passes with the current enforceable baseline thresholds.
- [x] `npm run scan:secrets` passes without ignoring real credential patterns.
- [x] CI exposes manual E2E execution via `workflow_dispatch`.

## Current Coverage Gap

Coverage thresholds in `vitest.config.ts` are set to 91% for statements, branches, functions, and lines, and the current measured coverage exceeds that threshold on the unit-testable surface.

| Metric     | Latest Measured | Current Gate |
| ---------- | --------------: | -----------: |
| Statements |          95.81% |          91% |
| Branches   |          91.33% |          91% |
| Functions  |          96.36% |          91% |
| Lines      |          95.81% |          91% |

The remaining low-coverage files are intentionally excluded from the unit gate because they are runtime-only browser or live Substack integration surfaces. Smoke tests are included in the default Vitest suite; credential-backed E2E tests remain in `npm run test:e2e` so CI can run them only when the required secrets are available.

Knip receives the CLI entry point from `package.json#bin`. The explicit `knip.json` entry covers benchmark scripts because they are script-only surfaces that are not reachable from the published CLI entry point.
