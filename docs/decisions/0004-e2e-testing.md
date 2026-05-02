# ADR 0004: E2E Testing Strategy

## Status

Accepted

## Context

The project automates browser interactions with Substack's editor. Unit and
integration tests cover parsing, payload generation, and API client logic, but
they never exercise a real Substack session. As the browser-workflow path grows,
a full end-to-end test against a controlled test publication provides confidence
that the real interaction paths work.

## Decision

Add a Playwright E2E test suite that:

- Requires live Substack credentials (`SUBSTACK_EMAIL`, `SUBSTACK_PASSWORD`)
  and a `SUBSTACK_PUBLICATION_URL`.
- Uses `playwright-core` (already in dependencies) + Vitest so the project
  keeps a single test runner.
- Is excluded from the default `npm test` / `npm run quality` commands.
- Sits under `src/test/e2e/` with a `.e2e.ts` extension.
- Runs only via the explicit `npm run test:e2e` command.
- Is available in CI only through `workflow_dispatch` (manual trigger from the
  Actions tab), never on push or pull_request.

## Consequences

- Contributors can run E2E tests locally once they have credentials and
  `npx playwright install chromium`.
- The CI pipeline stays green for contributors who do not have credentials.
- The E2E suite can be promoted to a required CI check later if a dedicated
  test publication is set up.
- The `playwright-core` dependency does not pull browser binaries on install;
  contributors opt in with `npx playwright install chromium`.
