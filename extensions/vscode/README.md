# Substack CLI MCP Helper for VS Code

This folder contains thin VS Code-facing metadata for launching the
`substack-cli` MCP server. It is not a separate implementation of the CLI and
does not duplicate publishing, parsing, auth, or API logic. It has no runtime extension entrypoint; VS Code clients should use the documented MCP command directly.

## Published Package Launch

Use this command shape when configuring a VS Code MCP extension or workspace
agent outside the repository:

```json
{
  "mcpServers": {
    "substack-cli": {
      "command": "npx",
      "args": ["-y", "@edithatogo/substack-publisher", "mcp", "serve"],
      "env": {}
    }
  }
}
```

## Repository-Local Launch

Use this form while developing this repository:

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

## Safety Boundary

The MCP server exposes read-only, redacted tools/resources/prompts. Drafting,
publishing, scheduling, auth login, and config mutation remain CLI-only flows and
are not exposed through the MCP server.
