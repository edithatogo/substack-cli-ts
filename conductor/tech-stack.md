# Tech Stack

Inferred from this repository (brownfield). Do not introduce a second runtime.

## Runtime

- TypeScript ESM CLI (`"type": "module"`), Node `>=22`, current CI Node `26.5.1`
- npm `11.17.0` (`packageManager`)
- Commander for the CLI; MCP via `@modelcontextprotocol/sdk`

## Parsing and publishing

- Markdown: `marked` + YAML-ish front matter in `src/parser/`
- Editor model: Tiptap / ProseMirror (`@tiptap/*`)
- Dual transport: HTTP API (`src/substack-api/`) and browser (Playwright + Stagehand)
- Config: Zod schemas in `src/config/store.ts`
- Secrets: env + local Chrome profile; never committed

## Quality

- Vitest + `@vitest/coverage-v8`
- fast-check (property + fuzz)
- Stryker (mutation, parser/publish scope)
- Biome (lint/format)
- Knip, npm audit, secret scan, SBOM scripts
- GitHub Actions: CI, Hardening, Security (OSV, dependency-review, Scorecard, actionlint/zizmor)
- CodeQL: GitHub default setup (do not add a second CodeQL workflow)
- Codecov OIDC + `CODECOV_TOKEN`
- Renovate (`github>edithatogo/renovate-config`), not Dependabot PRs

## Orchestration

- Conductor artifacts under `conductor/`
- GitHub CLI for issues, project evidence, and checks
- Cursor rules/hooks under `.cursor/`
