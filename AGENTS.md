# Repository Guidelines

This is `edithatogo/substack-cli-ts`, a solo-maintainer TypeScript CLI and MCP server for publishing local Markdown to a user-owned Substack publication.

**Context conflict:** `OneDrive - Flinders/AGENTS.md` belongs to a different repository (`careops-finance`). Do not apply that file’s data-boundary, review, or finance-track rules here. Prefer this file, `conductor/index.md`, and verifiable evidence in this repo.

## Solo-maintainer contract

- One person may create, review, merge, and release.
- Do **not** add CODEOWNERS, required approving reviews, team assignment, or mandatory human gates.
- Automated checks replace reviewers. Required status checks stay on; review count stays `0`.
- Fail-closed on unconfirmed Substack writes. Never claim a live draft, publish, schedule, npm publish, or registry submission without a hosted receipt.
- Do not commit `.env`, tokens, `.substack-cli/`, cookies, storage-state, traces, screenshots, or private publication content.

## Read before writing

1. This file.
2. `conductor/index.md` and the active track under `conductor/tracks/` (or `conductor/tracks.md`).
3. `git status`, remotes, and the existing diff. Do not clobber unrelated dirty work.
4. `docs/quality-frontier.md` when changing tests, CI, Codecov, Renovate, or Scorecard.

## Project structure

- `src/cli.ts` — command surface. Keep handlers thin.
- `src/parser/` — front matter, Markdown, Tiptap/ProseMirror.
- `src/browser/` and `src/publish/` — browser session and publish workflow.
- `src/substack-api/` — HTTP transport. Mock or fixture in tests; no live network in default CI.
- `src/config/` — local non-secret config. Secrets come from env.
- `src/mcp/` — MCP server. Shared behavior lives in `src/` once.
- `src/test/assurance/` — taxonomy suites (property, DST, contract, metamorphic, agentic, fuzz).
- `examples/` and `fixtures/prosemirror/` — sample Markdown and frozen parser contracts.
- `conductor/` — product context, tracks, contracts. `conductor/github-programme.json` is owned by the GitHub programme track; do not rewrite it unless that track asks.

## Commands

Run from the repository root. In PowerShell do not chain with `&&`; use `;`. npm scripts may still use `&&` (npm translates them on Windows).

| Intent | Command |
| --- | --- |
| Install (no Camoufox) | `npm install --omit=optional` or `npm ci` |
| Agent PR gate | `npm run verify:agent` |
| Typecheck | `npm run typecheck` |
| Unit + default Vitest | `npm test` / `npm run test:unit` |
| Coverage | `npm run test:coverage` |
| Inspect example | `node dist/cli.js inspect examples/basic.md` |
| Taxonomy / assurance | `npm run test:assurance` |
| Fuzz (bounded) | `npm run test:fuzz` |
| Mutation | `npm run test:mutation` |
| Full local quality | `npm run quality` |
| Lint / format | `npm run ci` |

Do not start optional Camoufox or live Substack logins unless the user explicitly asks.

## Coding style

Strict TypeScript, ESM only, explicit module boundaries. Parser, config, browser, and publish stay separate. Command handlers delegate. Redact secrets on every output path.

## Testing

Tests are Vitest `*.test.ts` next to modules, plus `src/test/assurance/` for the taxonomy. Each modality has an npm script and CI wiring. See `test/testing-taxonomy.json` and `docs/quality-frontier.md`.

Before changing parser or runtime behavior:

1. `npm run typecheck`
2. `npm test`
3. `node dist/cli.js inspect examples/basic.md`

Or `npm run verify:agent`.

## Conductor

Use Conductor tracks for planned work. Start at `conductor/index.md`. Implementation marks the active task `[~]`, follows `conductor/workflow.md`, and marks `[x]` only with evidence. Do not invent a parallel planning system. Do not fight in-flight GitHub Project #38 / issue-nesting work.

## Commits and pull requests

Short imperative subjects. PRs need a summary, exact validation commands, contract/track IDs when applicable, and a secrets/live-write checkbox. Human approval is not required.

## Security

`SUBSTACK_EMAIL`, `SUBSTACK_PASSWORD`, `SUBSTACK_COOKIE`, and Browserbase keys stay in ignored local config. Use `.env.example` for documented names only. Live publish/schedule requires `--yes` after `--dry-run`. Default CI must not hit Substack.
