# Creator OS Completion and Hardening Roadmap

This roadmap extends the Creator OS plan beyond feature enumeration. Its goal is to make the repository safer to finish, easier to verify, and competitive with or ahead of the native Substack dashboard while preserving the current local-first and explicit-confirmation boundaries.

## Current State

- CLI command documentation exists in `docs/api/commands.md`.
- Architecture documentation exists in `docs/api/architecture.md`.
- Endpoint captures and draft contract matrices exist for selected internal Substack API paths.
- The frontier coverage matrix records coverage status, evidence, fallback paths, safety class, decision records, and owner/admin gates.
- A formal, machine-readable, dynamically versioned API contract is not yet complete. The current API documentation is comprehensive prose plus fixtures, not a generated API/CLI/MCP specification with compatibility metadata.

## API and Contract Versioning Target

Add a generated contract package that represents the public local API surface of this project, not a promise that Substack's private endpoints are stable.

Required artifacts:

- `docs/api/substack-cli.contract.json`: generated CLI, MCP, artifact, run-log, and safe-surface contract.
- `docs/api/substack-cli.schema.json`: JSON Schema for first-party local artifacts such as campaign plans, analytics snapshots, media plans, live plans, run logs, drift snapshots, and coverage matrices.
- `docs/api/versioning.md`: human-readable compatibility policy.
- `src/contracts/`: source schemas and renderers for generated contract artifacts.
- Snapshot tests that fail when command options, artifact fields, run-log actions, or MCP tools change without a version decision.

Recommended version fields:

| Field | Scope | Purpose |
| --- | --- | --- |
| `contractVersion` | Whole local contract | Semver for the generated CLI/MCP/artifact contract. |
| `schemaVersion` | Individual artifact type | Strict parser version for each JSON artifact. |
| `minCliVersion` | Artifact or MCP resource | Oldest CLI version expected to read the artifact. |
| `generatedBy` | Generated artifacts | Package name, package version, git SHA, and command. |
| `capabilityStatus` | Substack-facing surfaces | `implemented`, `read-only`, `probe-only`, `planning-only`, `manual-admin`, or `unsupported`. |
| `evidenceHash` | Captured contracts | Hash of redacted endpoint capture or fixture evidence. |
| `lastVerifiedAt` | External evidence | UTC timestamp for official-doc or endpoint verification. |

Versioning rules:

- Breaking local artifact changes require a major `contractVersion` bump.
- New optional fields require a minor `contractVersion` bump.
- Documentation-only or evidence timestamp changes require a patch bump.
- Captured private Substack endpoint changes never imply public stability; they update evidence and capability status only.
- MCP write tools remain out of scope unless the equivalent CLI command already has explicit confirmation and tests.

## Evidence Promotion Ladder

Every planning-only, probe-only, manual-admin, or unsupported surface should move through this ladder before automation is expanded:

1. `public-doc`: official Substack or registry documentation confirms the user-facing workflow exists.
2. `manual-runbook`: the repo documents a safe manual path and rollback/recovery notes.
3. `redacted-trace`: an owner-approved test publication trace is captured and scrubbed.
4. `fixture`: the trace is minimized into a deterministic fixture.
5. `contract-test`: CI verifies the request and response shape against the fixture.
6. `dry-run-adapter`: the CLI can plan or validate the workflow without a live mutation.
7. `confirmed-write`: the CLI exposes the write only behind `--yes`, run logs, tests, and documented fallback.

Promotion blockers:

- Secrets, cookies, account IDs, emails, draft IDs, payment data, tax data, or subscriber private data cannot be redacted safely.
- The workflow has no owner-approved test publication.
- The dashboard flow has no manual recovery path.
- A public or captured contract requires unsupported anti-bot, CAPTCHA, app-only, or deceptive behavior.

## Completion-Oriented Tracks

These tracks are intentionally parallelizable. Each should have its own implementation branch, commit after each task, review after each phase, push after review fixes, and GitHub Actions verification before merge.

| Track | Purpose | Acceptance signal |
| --- | --- | --- |
| API contract versioning | Generate and validate local CLI/MCP/artifact schemas with dynamic version metadata. | Contract JSON and schema are generated from source and snapshot-tested. |
| Evidence capture kit | Standardize dashboard trace capture, redaction, fixture minimization, and endpoint diff reports. | A fixture can be captured, redacted, linted, and rejected if secrets remain. |
| Creator data warehouse | Normalize campaigns, posts, Notes, subscriber deltas, referrers, revenue probes, and run logs. | SQLite or DuckDB export supports cohort, funnel, and campaign reports. |
| Deliverability and compliance preflight | Check subject, preview text, links, UTM consistency, canonical URL, alt text, paid/free audience, and schedule collisions. | `preflight` and `campaign validate` block common deliverability defects. |
| Backup and export-first safety | Create local redacted snapshots before risky manual/admin or future write workflows. | Backup plans and snapshot validation exist before any new admin write is considered. |
| Platform drift monitor | Turn official-doc and fixture drift into a scheduled gate with last-verified badges and issue output. | Drift checks can open or update an issue with stale/changed evidence. |
| Operator modes | Support `solo`, `team`, `agency`, and `ci` defaults for confirmations, retention, secrets, and multi-publication handling. | Mode-specific config validation changes defaults without weakening safety. |
| Release and external launch scorecard | Separate repo-complete from npm, GitHub release, MCP registry, docs site, provenance, support, and rollback readiness. | `coverage release-scorecard` reports local readiness, package metadata, owner/admin gates, rollback notes, and prioritized next actions. |

## Features Beyond Native Substack

These features should be evaluated as differentiators rather than dashboard parity:

- Editorial calendar with campaign, post, Note, social, video, and live-event dependencies.
- Series planning and content inventory across drafts, published posts, Notes, media, and backlinks.
- Local growth warehouse with UTM, referrer, read-rate, click, subscriber-delta, and revenue attribution.
- Creator QA reviewer for title/preview quality, link health, paywall placement, accessibility, and compliance.
- Post-publication retrospectives that merge run logs, snapshots, comments, Notes, and subscriber movement.
- Repurposing plans for Notes, LinkedIn, X, YouTube, podcast descriptions, transcripts, and email previews.
- Multi-publication and agency mode with per-publication safety policy, profile isolation, and audit retention.
- Redacted support bundles that package diagnostics without secrets or private subscriber data.
- Offline-first backup snapshots for posts, plans, run logs, coverage evidence, and local artifact schemas.

## CI/CD Hardening Options

Current CI already runs Biome, Knip, TypeScript, build, coverage, mutation, smoke, production audit, and secret scanning. The E2E job is workflow-dispatch only, not automatic on pull requests or pushes. Production Audit and Secret Pattern Scan currently use advisory `continue-on-error` behavior in CI, so making them required is a deliberate hardening step rather than the current baseline.

Recommended additions:

- Make production audit and secret scanning required once false positives are handled.
- Add a Node compatibility matrix for the supported engine range and a separate `next` lane.
- Add an experimental dependency lane for canary/beta packages without blocking normal merges.
- Generate and diff the CLI/MCP/API contract in CI.
- Add a custom SBOM generation script, package provenance verification, and package contents assertions.
- Upload SLSA/npm provenance evidence and make it visible in the release scorecard.
- Add branch protection/ruleset documentation listing required checks for dependency PRs and feature PRs.
- Keep mutation testing advisory until runtime is stable, then raise thresholds per module rather than globally.

## Strictness Options

The root `tsconfig.json` already enables `strict`, `exactOptionalPropertyTypes`, and `noUncheckedIndexedAccess`. Stricter settings to consider:

- `noImplicitOverride`: catches accidental method overrides in future class-heavy adapters.
- `noImplicitReturns`: forces explicit command and parser return paths.
- `noFallthroughCasesInSwitch`: protects status and domain switch logic.
- `noPropertyAccessFromIndexSignature`: makes dynamic endpoint and fixture maps more explicit.
- `noUnusedLocals` and `noUnusedParameters`: suitable after generated and test-helper churn is controlled.
- `verbatimModuleSyntax`: aligns ESM imports with emitted JavaScript more strictly.
- `isolatedDeclarations`: useful if the package starts publishing typed subpath exports.
- `noUncheckedSideEffectImports`: useful once CSS/assets or setup-only imports are isolated.
- `skipLibCheck: false`: useful as a nightly or dependency-lane gate before enabling on every PR.

Recommended adoption path:

1. Add `tsconfig.strictest.json` as an advisory CI job.
2. Fix warnings in source modules first, then tests.
3. Promote stable strict flags into `tsconfig.json`.
4. Keep dependency-induced flags, especially `skipLibCheck: false`, in a scheduled lane until the dependency tree is quiet.

## Dependency Options

Current npm registry state checked on 2026-06-24. Reproduce the stable snapshot with `npm outdated --json` plus targeted `npm view <package> version dist-tags --json` checks for packages that have experimental tags.

| Package | Current installed | Latest / wanted | Recommendation |
| --- | ---: | ---: | --- |
| `@biomejs/biome` | 2.5.0 | 2.5.1 | Safe patch candidate. |
| `@tiptap/extension-table` | 3.24.0 | 3.27.1 | Align with `@tiptap/core` and starter-kit after parser fixtures pass. |
| `@tiptap/extension-table-cell` | 3.26.1 | 3.27.1 | Align with the Tiptap family in one PR. |
| `@tiptap/extension-table-header` | 3.24.0 | 3.27.1 | Align with the Tiptap family in one PR. |
| `@vitest/coverage-v8` | 4.1.7 | 4.1.9 | Safe patch candidate with Vitest. |
| `vitest` | 4.1.7 | 4.1.9 | Safe patch candidate with coverage package. |
| `fast-check` | 4.7.0 | 4.8.0 | Good candidate for parser/property tests. |
| `knip` | 6.17.1 | 6.18.0 | Safe patch candidate. |
| `playwright-core` | 1.60.0 | 1.61.1 | Update with smoke and manual E2E dispatch. |
| `typescript-eslint` | 8.61.1 | 8.62.0 | Safe patch candidate. |
| `zod` | 4.3.6 | 4.4.3 | Safe patch candidate; useful before contract schema work. |

Packages already at latest in the current registry check include `commander`, `marked`, `js-yaml`, `chrome-launcher`, `@modelcontextprotocol/sdk`, `@browserbasehq/stagehand`, `eslint`, `@eslint/js`, `@types/node`, `@stryker-mutator/core`, `@stryker-mutator/vitest-runner`, and `prettier`.

Experimental dependency lanes to consider:

| Package | Experimental tag | Use case | Boundary |
| --- | --- | --- | --- |
| `playwright-core` | `next` / alpha | Early browser compatibility and trace changes. | Scheduled/advisory only. |
| `@browserbasehq/stagehand` | `alpha` | Agentic browser workflow improvements. | Spike branch only; never auto-merge. |
| `typescript` | `rc` or `next` | Future strictness and declaration compatibility. | `tsconfig.strictest.json` lane. |
| `vitest` | beta major | Test runner migration readiness. | Advisory matrix job. |
| `zod` | canary | Future schema generation and metadata features. | Contract-schema branch only. |
| `prettier` | alpha major | Formatting migration readiness. | Do not mix with feature work. |

Dependency policy:

- Normal PRs should use latest stable releases only.
- Experimental versions should run in scheduled or workflow-dispatch jobs.
- Tiptap family upgrades must regenerate parser fixtures and run `node dist/cli.js inspect examples/basic.md`.
- Browser and Stagehand upgrades must run smoke tests and at least manual E2E dispatch before release.
- Contract/schema dependencies must include generated artifact diffs in review.
