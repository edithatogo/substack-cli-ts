# AI Client Readiness Matrix

| Target | Repo-side status | Boundary |
| --- | --- | --- |
| MCP registry | Metadata ready / external submission required | `registry.server.json` is present; publication requires registry/GitHub namespace auth. |
| Smithery | Documented / external submission required | Use the published npm package and MCP launch command. |
| VS Code | Config documented / scaffolded | `docs/integrations/vscode.md` documents workspace MCP config; marketplace publication requires a real VS Code extension package and publisher token. |
| Claude | Config documented | `docs/integrations/claude.md` documents local stdio launch for Claude Desktop / Claude Code. |
| Gemini | Config documented | `docs/integrations/gemini.md` documents Gemini CLI settings; validate against the installed Gemini CLI version before publishing claims. |
| Codex / ChatGPT | Codex documented / ChatGPT remote path gated | `docs/integrations/codex.md` documents Codex local MCP setup; ChatGPT custom connectors require remote MCP productization. |
| GitHub Copilot | Config documented | `docs/integrations/copilot.md` documents the VS Code MCP path for Copilot. |

## Principles

- Prefer the published package launch contract: `npx -y @edithatogo/substack-cli mcp serve`.
- Keep `SUBSTACK_PUBLICATION_URL` as a placeholder in examples; do not embed credentials.
- Treat live publication, marketplace submission, and catalog review as external gates.
