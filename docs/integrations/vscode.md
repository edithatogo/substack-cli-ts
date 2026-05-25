# VS Code MCP Integration

VS Code and GitHub Copilot can launch local MCP servers from workspace or user configuration. Use the published package command so the configuration does not depend on a checkout path.

Canonical launch command: `npx -y @edithatogo/substack-cli mcp serve`

## Workspace config

This repository includes `.vscode/mcp.json` as a workspace example. Use the same shape in any workspace that should use the Substack CLI MCP server:

```json
{
  "servers": {
    "substack-cli": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@edithatogo/substack-cli", "mcp", "serve"],
      "env": {
        "SUBSTACK_PUBLICATION_URL": "https://your-publication.substack.com"
      }
    }
  }
}
```

## Extension scaffold

`extensions/vscode/package.json` is a metadata scaffold for a future helper extension. It should remain a thin launcher/configuration helper and must not duplicate CLI or MCP server logic.

## Validation

Run:

```bash
npm run registry:validate
```

Then open the VS Code MCP server list and confirm `substack-cli` starts without exposing local secrets.
