# Branch Protection

This policy separates required merge gates from advisory hardening lanes. It is intentionally stricter for release and dependency work than for day-to-day local planning because Substack live writes, npm publication, and registry submissions remain owner-approved gates.

## Required Pull Request Checks

Require these checks before merging feature or dependency pull requests:

- `Quality`
- `Smoke`
- `Required Audit And Secret Scan`
- `Node Compatibility (20)`
- `Node Compatibility (22)`
- `Node Compatibility (24)`
- `codecov/patch`

Treat the generated contract check as required when public CLI, MCP, schema, or run-log surfaces change. Treat frontier drift as required when safe-surface coverage, endpoint evidence, or launch/admin readiness changes.

## Advisory Checks

Keep these checks visible but advisory until their runtime dependencies are stable enough for every pull request:

- `Mutation`
- `E2E`
- `Strictest TypeScript`
- `Experimental Dependency Lane`
- `Frontier Drift Monitor`

Mutation is already run and reviewed before track closeout, but it should not block emergency security fixes until module-level thresholds are stable. E2E stays manual because it needs live Substack credentials and a test publication.

## Dependency Pull Requests

Dependency PRs may be merged only after required checks pass and the change is reviewed for runtime risk.

- Stable tooling bumps should pass `Quality`, `Smoke`, hardening Node compatibility, audit, and secret scan.
- Parser, Markdown, Tiptap, or ProseMirror bumps should also run `npm test` and `node dist/cli.js inspect examples/basic.md`.
- Browser, Playwright, Stagehand, or authentication-adjacent bumps should run smoke locally and use manual E2E before release.
- Security updates should run `npm run audit:prod` and `npm run scan:secrets`.
- Experimental dependency lanes must not automerge.

## Release Rules

Before creating a release tag, verify:

- Latest `master` commit is green for `CI`, `Hardening`, `Deploy GitHub Pages`, and `Release Drafter`.
- `npm run sbom` produces an SBOM artifact.
- `node dist/cli.js coverage release-scorecard` reports `localStatus: "ready"`.
- `.github/workflows/publish.yml` uses `npm publish --provenance --access public`.
- `.github/workflows/publish.yml` grants `id-token: write` for npm provenance.
- External npm, GitHub release, MCP registry, marketplace, and Substack admin gates remain owner-approved.

