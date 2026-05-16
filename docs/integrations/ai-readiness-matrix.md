# AI Integration Readiness Matrix

| Target | Status | Notes |
| --- | --- | --- |
| MCP registry | Metadata ready / external submission required | `registry.server.json` is present; publication requires registry/GitHub namespace auth. |
| Smithery | Documented / external submission required | Use the published npm package and MCP launch command. |
| VS Code | Scaffolded | Extension metadata exists; marketplace publication requires a real VS Code extension package and publisher token. |
| Claude | Config scaffolded | Direct MCP server spawning via stdio config. |
| Gemini | Config scaffolded | Needs client-specific validation against the current Gemini extension process. |
| Codex / ChatGPT | Config scaffolded | Needs supported connector/extension path confirmation for the target account. |
| GitHub Copilot | Config scaffolded | Likely through VS Code MCP integration path. |

## Principles

- Keep the core MCP server read-only and redacted.
- Avoid duplicating business logic in integration wrappers.
- Prefer thin packaging layers and docs over forked implementations.
