# Repository Guidelines

## Project Structure & Module Organization

This repository contains a TypeScript CLI scaffold for publishing local Markdown files to a user-owned Substack publication.

- `conductor.json` declares the setup and run entrypoints used by Conductor.
- `bin/conductor-setup` prepares a workspace by linking shared secrets and installing Ruby and Node dependencies.
- `script/server` configures runtime ports and Redis isolation, then starts the app through `bin/dev`.
- `src/cli.ts` defines the command surface.
- `src/parser/` contains front matter, Markdown, and Tiptap/ProseMirror conversion.
- `src/browser/` and `src/publish/` hold browser-session and publishing workflow code.
- `examples/` contains sample Markdown inputs.

## Build, Test, and Development Commands

- `npm install --omit=optional`: installs the core CLI dependencies without optional Camoufox packages.
- `npm run build`: compiles TypeScript to `dist/`.
- `npm run typecheck`: runs TypeScript checks without emitting files.
- `npm test`: builds and runs the parser tests.
- `node dist/cli.js inspect examples/basic.md`: prints generated HTML and ProseMirror JSON.
- `node dist/cli.js config show`: shows effective non-secret configuration.
- `node dist/cli.js config set-runtime local`: uses a local persistent Chrome profile under `.substack-cli/chrome-profile`.
- `node dist/cli.js auth status`: shows Browserbase and session readiness.
- `node dist/cli.js schema capture examples/basic.md --out fixtures/prosemirror/basic.json`: writes a parser fixture.
- `bin/conductor-setup`: links shared secrets when present, then runs dependency installation.

Run scripts from the repository root. On Windows, use a Bash-compatible shell for these scripts.

## Coding Style & Naming Conventions

Use strict TypeScript, ESM imports, and explicit module boundaries. Keep command handlers thin and delegate parsing, config, browser, and publishing logic to separate modules. Shell scripts should use clear environment variable names, quote variable expansions, and prefer small, explicit setup steps.

## Testing Guidelines

Tests use Node’s built-in `node:test` runner after TypeScript compilation. Name tests `*.test.ts` and keep them close to the module under test.

Before changing parser or runtime behavior, verify:

- `npm run typecheck`
- `npm test`
- `node dist/cli.js inspect examples/basic.md`

## Commit & Pull Request Guidelines

This directory does not currently include Git history, so no local commit convention can be inferred. Use short, imperative commit subjects such as `Add Conductor server hook` or `Document workspace setup`.

Pull requests should include a concise summary, commands run to validate the change, any required environment variables, and notes about changes to browser automation, generated payloads, or secret handling.

## Security & Configuration Tips

Do not commit `.env`, `config/master.key`, `.substack-cli/`, browser storage-state files, credentials, traces, screenshots, or generated dependency directories. `SUBSTACK_EMAIL` and `SUBSTACK_PASSWORD` are supported for `auth login --auto-login`, but must remain in ignored local config only. Use `.env.example` for documented variables only.
