# Branch Protection

Solo-maintainer policy: **0 approving reviews**, no CODEOWNERS, no last-push approval. Automated checks are the merge gate. Force-push and default-branch deletion stay off. Linear history and resolved conversations stay on. Signed commits are **not** required.

Live capture (2026-08-11): classic protection on `master` plus ruleset `20603600` (`Solo maintainer default branch`). Machine-readable copy: `docs/ruleset-solo-maintainer.json`.

## Required Pull Request Checks

- `Analyze (actions)`
- `Analyze (javascript-typescript)`
- `Quality`
- `Smoke`
- `Deterministic Assurance Taxonomy`
- `Mutation`
- `Required Audit And Secret Scan`
- `SBOM Evidence`
- `Strictest TypeScript`
- `Dependency Declaration Strictness`
- `Index Signature Strictness`
- `Node Compatibility (22)`
- `Node Compatibility (24)`
- `Node Compatibility (26.5.1)`
- `ubuntu-latest / Node 26.5.1`
- `windows-latest / Node 26.5.1`
- `macos-latest / Node 26.5.1`

Do **not** require `codecov/patch`, `codecov/project`, `Fuzz`, or `OpenSSF Scorecard`. Codecov is informational on PRs so SKIPPED uploads cannot block Renovate automerge.

Treat generated contract drift as required when public CLI, MCP, schema, or run-log surfaces change (covered today by Quality / Assurance / fixture tests).

## Advisory Checks

- `Fuzz` (bounded on PRs; longer on Hardening schedule)
- `codecov/patch` / `codecov/project`
- `OpenSSF Scorecard` (push to `master` and weekly)
- `E2E` (manual `workflow_dispatch`, live credentials)
- `Frontier Drift Monitor`
- `Extended Fuzz`

## Dependency Pull Requests

Renovate is the update bot. Dependabot PRs stay disabled.

- Non-major updates may automerge after **required** checks pass.
- Majors stay labeled `breaking` and need dashboard approval.
- Parser / Tiptap bumps should also run `npm test` and `node dist/cli.js inspect examples/basic.md`.
- Do not automerge live-canary or credential-bearing workflow changes.

## Release Rules

Before creating a release tag, verify:

- Latest `master` is green for `CI`, `Hardening`, `Security`, `Deploy GitHub Pages`, and `Release Drafter`.
- `npm run sbom` produces an SBOM artifact.
- `node dist/cli.js coverage release-scorecard` reports `localStatus: "ready"`.
- `.github/workflows/publish.yml` uses `npm publish --provenance --access public` and `id-token: write`.
- External npm, GitHub release, MCP registry, marketplace, and Substack admin gates remain owner-approved.
