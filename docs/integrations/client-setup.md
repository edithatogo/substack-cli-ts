# MCP Client Setup

This page documents local MCP client setup for the packaged `substack-cli` server. The
server is stdio-based, read-only, and redacted: MCP clients can inspect inventory,
schema, traces, diagnostics, and policy state, but they cannot publish, schedule, draft,
change config, or log in through the MCP surface.

## Launch Contracts

Use the published package form when configuring a client outside this repository:

```json
{
  "mcpServers": {
    "substack-cli": {
      "command": "npx",
      "args": ["-y", "@edithatogo/substack-cli", "mcp", "serve"],
      "env": {}
    }
  }
}
```

Use the repository-local form while developing this project:

```json
{
  "mcpServers": {
    "substack-cli": {
      "command": "node",
      "args": ["dist/cli.js", "mcp", "serve"],
      "env": {}
    }
  }
}
```

Run `npm run build` before using the repository-local form.

## VS Code

Use the MCP configuration supported by your VS Code MCP extension or workspace agent.
Point the server entry at the published-package launch contract above. The optional
helper metadata in `extensions/vscode/package.json` records the same command shape and
does not duplicate CLI logic.

## Claude

Add the `mcpServers.substack-cli` block to the Claude Desktop or Claude Code MCP
configuration file. Keep secrets out of the config whenever possible; prefer the local
Substack CLI state and browser profile configured by `substack-cli auth` and
`substack-cli config`.

## Gemini

For Gemini-compatible local agents that accept MCP stdio configuration, add the same
`mcpServers.substack-cli` block. If the client uses a different key name, preserve the
command and args exactly and adapt only the enclosing client-specific schema.

## Codex

For Codex-compatible MCP configuration, register `substack-cli` as a stdio server using
the published-package launch contract. The MCP surface remains read-only, so Codex can
review local readiness without gaining write access to Substack publication actions.

## GitHub Copilot

Use the VS Code MCP path when configuring GitHub Copilot in an editor environment. If a
future Copilot client supports direct MCP server configuration outside VS Code, reuse the
same published-package launch contract.

## Safety Boundary

- MCP tools are read-only and return redacted summaries.
- Publishing, scheduling, draft creation, auth login, and config mutation remain CLI-only.
- Do not place `SUBSTACK_PASSWORD`, session cookies, or browser storage state in client
  configuration files.
- Use `substack-cli mcp surface` and `substack-cli mcp summary` to audit the exposed
  server surface before registering it with a new client.
