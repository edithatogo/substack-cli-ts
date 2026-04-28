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
- Renovate configuration for dependency update PRs.
- ADRs under `docs/decisions/`.
- `doctor` command for local configuration, transport, browser profile, and ignored-file diagnostics.

## Not Added Yet

- Monorepo orchestration: Nx, Turborepo, Moon, Rush, Bazel, Lage.
- Alternative runtimes: Bun, Deno.
- Deployment CD: Argo CD, Northflank, Harness, Buildkite, Dagger.
- Mandatory mutation testing in CI.
- Live Substack E2E in CI.

## Rationale

This is currently a single-package CLI. npm scripts and GitHub Actions are enough until there are multiple packages, deployment environments, or heavy integration-test matrices.

## Next Tasks

1. Raise coverage thresholds as Track 06-12 implementation expands.
2. Add mocked API integration tests for the internal adapter.
3. Add Playwright E2E tests against a controlled test publication, excluded from default CI.
4. Add deeper `doctor` checks for API transport probes after Track 06 exists.
5. Add a license/dependency policy check if the project becomes distributable.
6. Expand mutation targets once slow/browser-adjacent modules have isolated unit seams.
7. Add a dedicated mutation-testing CI job once the Windows cleanup issue is either fixed or isolated.
