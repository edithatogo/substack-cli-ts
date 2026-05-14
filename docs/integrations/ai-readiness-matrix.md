# AI Integration Readiness Matrix

| Target | Status | Notes |
| --- | --- | --- |
| MCP registry | In progress | Track 35 is prioritized for registry-readiness and submission docs. |
| VS Code | Planned | Likely via extension scaffold and MCP client config. |
| Claude | Planned | Direct MCP server spawning via stdio config. |
| Gemini | Planned | Needs client-specific config/manifest validation. |
| Codex | Planned | Needs supported integration path confirmation. |
| GitHub Copilot | Planned | Likely through VS Code integration path. |

## Principles

- Keep the core MCP server read-only and redacted.
- Avoid duplicating business logic in integration wrappers.
- Prefer thin packaging layers and docs over forked implementations.
