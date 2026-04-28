# Repository Skill

Use this repository as a draft-first Substack CLI and MCP project.

## How To Work

- Keep CLI and MCP changes aligned. Shared behavior should live in `src/` once, then be exposed through the CLI, MCP server, and tests.
- Update the relevant `tracks/*.md` file when scope changes or a milestone completes.
- Keep secrets, browser sessions, traces, and `.substack-cli/` out of Git.
- Run `npm run quality` and `npm run scan:secrets` before committing changes.

## Primary References

- `workflow.md` for the high-level delivery strategy.
- `docs/workflows/cli.md` for command and track work.
- `docs/workflows/mcp.md` for MCP surface changes.
- `README.md` for user-facing command examples.

## Editing Rules

- Prefer small, typed modules over shared ad hoc helpers.
- Keep redacted summaries redacted.
- Treat direct browser/API probing as discovery input, not the default path.
