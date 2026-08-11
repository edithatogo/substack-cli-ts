# Repository Skill

Use this repository as a draft-first Substack CLI and MCP project. Full agent contract: `AGENTS.md`. Conductor entry: `conductor/index.md`. Quality map: `docs/quality-frontier.md`.

## How To Work

- Keep CLI and MCP changes aligned. Shared behavior should live in `src/` once.
- Update the relevant Conductor track when scope changes or a milestone completes.
- Keep secrets, browser sessions, traces, and `.substack-cli/` out of Git.
- After TypeScript changes run `npm run verify:agent`.
- Fail-closed on live Substack writes. Do not add required reviewers or CODEOWNERS.

## Primary References

- `conductor/workflow.md` for delivery rules.
- `docs/workflows/cli.md` for command and track work.
- `docs/workflows/mcp.md` for MCP surface changes.
- `README.md` for user-facing command examples.
- `.cursor/skills/conductor/SKILL.md` to discover Conductor without re-vendoring the plugin.
