# Claude MCP Integration

Claude Desktop and Claude Code can launch the Substack CLI MCP server as a local stdio server.

Canonical launch command: `npx -y @edithatogo/substack-publisher mcp serve`

## Claude Desktop config

Add this server to the Claude Desktop MCP configuration:

```json
{
  "mcpServers": {
    "substack-cli": {
      "command": "npx",
      "args": ["-y", "@edithatogo/substack-publisher", "mcp", "serve"],
      "env": {
        "SUBSTACK_PUBLICATION_URL": "https://your-publication.substack.com"
      }
    }
  }
}
```

## Claude Code

Use the same command-based stdio launch contract. Keep account-specific values in the local client configuration or shell environment.

## Safety boundaries

- The MCP surface is read-only and redacted.
- Publishing, scheduling, login, and config mutation remain CLI operations outside MCP.
- Do not place `SUBSTACK_EMAIL`, `SUBSTACK_PASSWORD`, cookies, traces, or storage state in tracked files.
