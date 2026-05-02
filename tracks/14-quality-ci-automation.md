# Track 14: Quality, CI, and Automation

## Goal

Keep the project safe to change as browser automation, internal API calls, and content parsing complexity grow.

## Implemented Baseline

- TypeScript strict mode with `exactOptionalPropertyTypes` and `noUncheckedIndexedAccess`.
- ESLint flat config with type-aware TypeScript rules.
- Prettier formatting and format checks.
- Vitest unit tests with V8 coverage.
- fast-check for property-based tests.
- Stryker mutation testing as an opt-in local command, initially scoped to fast pure logic modules. On this Windows environment it produced a valid report above the configured break threshold but exited nonzero during child-process cleanup, so it is not part of CI yet.
- GitHub Actions CI for install, format, lint, typecheck, coverage tests, production audit, and secret pattern scan.
- Cross-platform secret scan script shared between local and CI checks.
- Dedicated GitHub Actions mutation-testing job that uploads the report artifact.
- Mocked internal API integration tests for auth, read-model, and shared client helpers.
- Doctor API probe readiness checks for local auth sources and read-only endpoints.
- Distribution policy check for private-package, license, and non-registry dependency hygiene.
- Renovate configuration for dependency update PRs.
- ADRs under `docs/decisions/`.
- `doctor` command for local configuration, transport, browser profile, and ignored-file diagnostics.

## Completed (additional)

1. ✅ Coverage thresholds raised (statements: 60, branches: 50, functions: 60, lines: 60).
2. ✅ Mutation targets expanded: added `src/parser/markdown.ts`, `src/parser/media.ts`, `src/publish/prepublish.ts`, `src/substack-api/payload.ts`.
3. ✅ Node.js `engines` field added to `package.json` (`>=18.0.0`).
4. ✅ CI engines check step added to `quality` job (verifies Node version matches `package.json`).
5. ✅ Prettier config file (`.prettierrc`) created with project-consistent settings (semi, trailingComma, printWidth 100, tabWidth 2, lf).

## Implemented (via Track 14 parallel work, May 2026)

1. ✅ **Mutation CI gating**: Stryker `thresholds.break: 50` was already configured and the `mutation` CI job (`needs: quality`) already acts as a gate (no `continue-on-error`). The `ci.yml` was already gating on mutation score below 50. Documented explicitly with inline comments. ADR 0001 updated to reflect mutation is CI-gated.
2. ✅ **E2E test scaffold**: Created `src/test/e2e/substack-publish.e2e.ts` — Playwright smoke test (requires `SUBSTACK_EMAIL`, `SUBSTACK_PASSWORD`, `SUBSTACK_PUBLICATION_URL` env vars, skipped when not set). Added separate `vitest.e2e.config.ts` with 60s timeout. Added `test:e2e` script to `package.json`. Excluded `src/test/e2e/` from default Vitest config.
3. ✅ **E2E CI job**: Manual-only `e2e` job in `ci.yml` gated by `workflow_dispatch` — installs Chromium and runs `npm run test:e2e`.
4. ✅ **ADR 0004 (E2E testing)**: Documented testing strategy for E2E tests.
5. ✅ **Stryker `thresholds.break: 50`** is the actual gating mechanism — if mutation score drops below 50, Stryker exits non-zero and the CI job fails.

## Test Coverage Expanded (May 2026 parallel work)

10 new tests added across 3 files (33 test files, 150 total, all passing):

- **`media-upload.test.ts`** (+5): Empty document → no-op; all-remote URLs → skips all; mixed local/remote → uploads locals, preserves remotes; data URI images → skipped; unresolvable relative path → "File not found"
- **`prepublish.test.ts`** (+3): Draft mode produces "ready" report; schedule mode includes `scheduleAt`; blocked report includes correct file path/mode
- **`workflow-trace.test.ts`** (+2): `summarizeWorkflowTrace()` returns correct structured summary; handles draft trace with no session/URLs

## Not Added (intentionally deferred)

- Monorepo orchestration: Nx, Turborepo, Moon, Rush, Bazel, Lage.
- Package manager migration: pnpm.
- Alternative runtimes: Bun, Deno.
- Deployment CD: Argo CD, Northflank, Harness, Buildkite, Dagger.
- Live Substack E2E in CI (manual-only `workflow_dispatch` instead).

## Rationale

This is currently a single-package CLI. npm scripts and GitHub Actions are enough until there are multiple packages, deployment environments, or heavy integration-test matrices.

## Remaining

1. Revisit `pnpm` if the repository becomes a multi-package workspace or dependency install speed becomes a real bottleneck.
