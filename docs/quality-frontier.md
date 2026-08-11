# Quality frontier

Solo-maintainer quality, security, and assurance map for `edithatogo/substack-cli-ts`. Human review count is **0**. Machines gate merges.

## Agent local gate

```powershell
npm run verify:agent
```

Runs typecheck, `npm test` (build + Vitest), and `node dist/cli.js inspect examples/basic.md`.

## Test matrix

| Type | Exists | Script | PR CI | Schedule / deep |
| --- | --- | --- | --- | --- |
| Unit | Yes — `src/**/*.test.ts` | `test:unit` / `npm test` | Quality | — |
| Integration | Yes — parser→contract, CLI help | `test:integration`, `test:cli-integration` | Assurance | — |
| Contract / CDC | Yes — MCP manifest + frozen ProseMirror fixtures | `test:cdc`, `test:contract` | Assurance + unit fixtures | — |
| Property | Yes — fast-check front matter / markdown | `test:property` | Assurance + Fuzz | Extended Fuzz |
| Fuzz | Yes — Zod schemas + parser/config/ProseMirror | `test:fuzz`, `test:schema-fuzz` | Fuzz (`FUZZ_RUNS=80`) | Extended Fuzz (`FUZZ_RUNS=400`) |
| DST | Yes — seeded retry + publish gate | `test:dst` | Assurance | — |
| Metamorphic | Yes — line endings, idempotent parse, headings/links | `test:metamorphic` | Assurance | — |
| Agentic / AI | Yes — synthetic planner + CLI recipes, no paid LLM | `test:agentic` | Assurance | — |
| Semantic judge | Yes — recorded adapter only | `test:semantic-judge` | Assurance | live model is owner-gated |
| Smoke | Yes — built CLI inspect/prepublish | `test:smoke` | Smoke | — |
| Edge | Yes — empty/unicode/CRLF/invalid enum/fail-closed publish | `test:edge` | Assurance | — |
| E2E (CLI) | Yes — `inspect examples/basic.md` | `test:e2e` | Assurance (built CLI file) | live browser E2E is `workflow_dispatch` only |
| Mutation | Yes — Stryker, parser/publish scope, break 60 | `test:mutation` | Mutation | — |
| Coverage | Yes — Vitest V8 → `coverage/lcov.info` | `test:coverage` | Quality → Codecov | fail upload errors on `master` push only |
| Lint / format | Yes — Biome | `ci` | Quality | — |
| Typecheck | Yes | `typecheck` | Quality + Strictest TypeScript | advisory index/dependency lanes |
| Profiling | Yes — performance suite + CPU profile | `profile`, `profile:parser` | Performance budgets | — |
| VCR / network replay | Yes — fixture transport | `test:vcr` | Assurance | — |

Taxonomy source of truth: `test/testing-taxonomy.json`, enforced by `npm run test:taxonomy`.

## CI lanes

**Required for merge** (ruleset + classic protection, 0 approving reviews):

- CodeQL default setup: `Analyze (actions)`, `Analyze (javascript-typescript)`
- `Quality`, `Smoke`, `Deterministic Assurance Taxonomy`, `Mutation`
- `Required Audit And Secret Scan`, `SBOM Evidence`, `Strictest TypeScript`
- Node compatibility 22 / 24 / 26.5.1
- Cross-platform `ubuntu-latest / windows-latest / macos-latest` × Node 26.5.1

**Visible, not required** (so SKIPPED checks cannot block Renovate automerge):

- `codecov/patch` and `codecov/project` — informational on PRs; Quality still uploads
- `Fuzz` — bounded; Scorecard-facing name
- `OpenSSF Scorecard` — push/`master` + weekly, skipped on PRs
- `E2E`, Frontier Drift, experimental/live canaries

## Codecov

- Upload: `.github/workflows/ci.yml` Quality job, `codecov/codecov-action` v7, `coverage/lcov.info`
- `CODECOV_TOKEN` repo secret exists (created 2026-05-14). OIDC (`id-token: write` + `use_oidc: true`) is also enabled as a fallback.
- `fail_ci_if_error` is true only on push to `master`.
- `codecov.yml` marks project/patch informational so a missing token cannot fail PRs or Renovate.
- Observed working: `codecov/patch` passed on PRs #552 and #553.

If uploads skip after a token rotation, re-add the Codecov GitHub App / OIDC bind at [Codecov GitHub OIDC](https://docs.codecov.com/docs/github-oidc-app) and keep `CODECOV_TOKEN` as backup. Do not invent tokens.

## Renovate

- Config: `.github/renovate.json` extends `github>edithatogo/renovate-config`
- Dependabot PRs are not used. Do not add `dependabot.yml`. Dependabot **alerts** may remain.
- Hosted proof: renovate[bot] PR #535 (`@biomejs/biome` 2.5.7)
- `platformAutomerge: true` for non-major updates. Majors stay manual (`breaking` label, dashboard approval).
- Auto-merge waits only for **required** checks. Codecov is not required, so SKIPPED Codecov cannot block.
- Dependency Dashboard is enabled in config. If the issue is missing, open the Mend dashboard or wait for the next Renovate run; do not fake the GitHub App.

App install (human, if the bot stops opening PRs): https://github.com/apps/renovate

## OpenSSF Scorecard

- Workflow job: `Security / OpenSSF Scorecard` with SARIF upload and `publish_results: true`
- Public API `https://api.securityscorecards.dev/projects/github.com/edithatogo/substack-cli-ts` returned **404** on 2026-08-11 (results not in the public weekly index yet). Latest `master` Security runs succeeded (for example run `31478890049`).
- Intentional low/failed checks for a solo repo:
  - **Code-Review**: no required human reviewers. Documented exception.
  - **Branch-Protection / contributors**: one maintainer; force-push and deletion are off; status checks are on.
- Expected to stay strong: License (Apache-2.0), Security-Policy, CI-Tests, SAST (CodeQL), Dependency-Update-Tool (Renovate), Token-Permissions, Pinned-Dependencies, Dangerous-Workflow, Binary-Artifacts, Fuzzing (after the Fuzz job), Maintained.

Do not raise required review count to chase the Code-Review score.

## GitHub security features

| Feature | Status (2026-08-11) |
| --- | --- |
| Secret scanning | Enabled |
| Push protection | Enabled |
| Secret scanning non-provider patterns | Disabled — enable if the token allows |
| Secret scanning validity checks | Disabled — enable if the token allows |
| Dependabot security updates (PRs) | Disabled on purpose (Renovate) |
| CodeQL default setup | Working (`Analyze (*)` + `CodeQL`) |
| Dependency review | Security workflow, PRs |
| OSV scanner | Security workflow |
| actionlint + zizmor | Workflow Policy job |
| Private vulnerability reporting | `SECURITY.md` |

Enable leftover Advanced Security toggles (human PAT / repo admin):

```powershell
gh api -X PATCH repos/edithatogo/substack-cli-ts -f security_and_analysis[secret_scanning_non_provider_patterns][status]=enabled
gh api -X PATCH repos/edithatogo/substack-cli-ts -f security_and_analysis[secret_scanning_validity_checks][status]=enabled
```

## Parent-repo conflict

`OneDrive - Flinders/AGENTS.md` is for `careops-finance`. It does not own this repository. Do not apply its `data/raw` database rules here.
