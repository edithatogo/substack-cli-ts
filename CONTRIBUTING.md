# Contributing to substack-cli

Thank you for your interest in contributing to `substack-cli`! This project converts local Markdown files into Substack drafts and publishes them via browser automation or the internal Substack API.

## Development Setup

### Prerequisites

- Node.js >= 18.0.0
- npm
- A Git client

### Getting Started

```powershell
git clone https://github.com/edithatogo/substack-cli-ts
cd substack-cli-ts
npm install
npm run build
```

Copy the environment template:

```powershell
Copy-Item .env.example .env
```

Configure at minimum `SUBSTACK_PUBLICATION_URL`. See `.env.example` for all available options.

## Running Tests and Checks

```powershell
npm run typecheck    # TypeScript type checking
npm test            # Run unit tests
npm run quality     # Full quality gate: format:check + lint + typecheck + build + test:coverage
npm run lint        # ESLint
npm run format:check # Prettier formatting check
```

## Code Style

- **TypeScript strict mode** is enabled — all strict checks apply.
- **ESLint** enforces code quality rules. Run `npm run lint:fix` to auto-fix issues.
- **Prettier** handles formatting. Run `npm run format` to format all files.
- Use explicit module boundaries — keep command handlers thin and delegate logic to separate modules.
- Use ESM imports (`import` / `export`), not CommonJS.
- No barrel files (`index.ts` that re-export) — import directly from the module.
- Shell scripts should quote variable expansions and use small, explicit setup steps.
- Do not commit `.env`, `config/master.key`, `.substack-cli/`, browser storage-state files, credentials, traces, screenshots, or generated dependency directories.

## How to Add a New Command

1. Create or reuse a handler function in the relevant module (e.g., `src/substack-api/`, `src/publish/`).
2. Add the command definition to `src/cli.ts` using the `commander` API.
3. Document the command and its options in `docs/api/commands.md`.
4. Add tests for the handler logic.
5. Run `npm run typecheck && npm test` to verify.
6. If the command produces output that should be fixture-tested, capture a fixture via the `schema capture` workflow.

## How to Add a New ProseMirror Node Type

1. Define the node extension in `src/parser/` following the existing Tiptap extension pattern.
2. Register it in the Tiptap editor configuration in `src/parser/`.
3. Add the corresponding HTML-to-ProseMirror conversion logic.
4. Add test cases that exercise the new node through the `inspect` command.
5. Capture updated fixtures with `schema capture`.

## Capturing and Updating Fixtures

Fixtures are used to lock down parser output and browser workflow traces:

```powershell
node dist/cli.js schema capture examples/basic.md --out fixtures/prosemirror/basic.json
node dist/cli.js trace fixture trace-artifact.json --out fixtures/workflow/publish.json
```

After updating parser or browser logic, regenerate relevant fixtures and verify with `schema compare`.

## Pull Request Process

1. Create a feature branch from `main`.
2. Make your changes following the code style above.
3. Run `npm run quality` to ensure all checks pass.
4. If your change affects parser output, regenerate fixtures.
5. Open a pull request with a concise summary of the change, what commands you ran to validate, and any notes about environment variables, browser automation, generated payloads, or secret handling.
6. The PR title should be a short imperative statement (e.g., "Add API transport for draft scheduling").

## Reporting Bugs and Requesting Features

Open an issue on [GitHub](https://github.com/edithatogo/substack-cli-ts/issues). Include the version, your environment, reproduction steps, and any relevant trace or error output.

## Architecture Decisions

Major design decisions are documented as ADRs in `docs/decisions/`:
- `0001-quality-toolchain.md` — CI and quality tooling
- `0002-transport-strategy.md` — Dual-transport design (browser + API)
- `0003-reusable-module-boundaries.md` — Module structure
- `0004-e2e-testing.md` — End-to-end testing strategy

## CI Pipeline

See Track 14 (Quality, CI, and Automation) for details on the CI pipeline, including linting, type checking, testing, coverage, mutation testing, and secret scanning.

## Code of Conduct

This project follows the [Contributor Covenant](CODE_OF_CONDUCT.md). By participating, you agree to uphold its standards.
