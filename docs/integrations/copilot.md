# GitHub Copilot MCP Integration

GitHub Copilot uses MCP through supported editor surfaces such as VS Code. For this project, the Copilot path is the VS Code MCP configuration path, not a separate runtime.

Canonical launch command: `npx -y @edithatogo/substack-publisher mcp serve`

## VS Code workspace config

This repository includes `.vscode/mcp.json` as the Copilot-through-VS-Code example:

```json
{
  "servers": {
    "substack-cli": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@edithatogo/substack-publisher", "mcp", "serve"],
      "env": {
        "SUBSTACK_PUBLICATION_URL": "https://your-publication.substack.com"
      }
    }
  }
}
```

## Boundaries

- The Copilot integration should reuse the existing read-only MCP server.
- Any VS Code Marketplace extension should remain optional and should only help configure or launch the server.
- Do not add Copilot-specific write tools unless the core MCP safety policy changes.
