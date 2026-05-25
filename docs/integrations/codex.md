# Codex MCP Integration

Codex can connect to MCP servers from CLI or IDE configuration. Use the same published-package launch command used by the other local stdio clients.

Canonical launch command: `npx -y @edithatogo/substack-cli mcp serve`

## CLI setup

```bash
codex mcp add substack-cli -- npx -y @edithatogo/substack-cli mcp serve
codex mcp list
```

## TOML example

```toml
[mcp_servers.substack-cli]
command = "npx"
args = ["-y", "@edithatogo/substack-cli", "mcp", "serve"]

[mcp_servers.substack-cli.env]
SUBSTACK_PUBLICATION_URL = "https://your-publication.substack.com"
```

## ChatGPT connector distinction

ChatGPT custom connectors use remote MCP transports and account/workspace controls. This repository currently ships a local stdio MCP server, so ChatGPT connector publication is an external productization path rather than the same artifact as Codex local setup.
