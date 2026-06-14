# Using MCP Integration

The Model Context Protocol (MCP) server exposes a read-only surface of Substack
tools, resources, and prompts for AI-powered assistants and agentic workflows.

## Starting the MCP Server

```bash
# Start the stdio MCP server
substack-cli mcp serve
```

Configure your MCP client (Claude Code, VS Code, etc.) to spawn the server:

```json
{
  "mcpServers": {
    "substack-cli": {
      "command": "substack-cli",
      "args": ["mcp", "serve"]
    }
  }
}
```

## Inspecting the MCP Surface

```bash
# Print the full MCP surface manifest
substack-cli mcp surface

# Print the redacted MCP summary resource
substack-cli mcp summary
```

## Available MCP Tools

| Tool | Description |
|------|-------------|
| `read_inventory` | Read user and publication inventory through read-only API probes |
| `validate_schema` | Validate a ProseMirror JSON document or captured fixture |
| `compare_schema` | Compare a Markdown file's current document with a saved fixture |
| `inspect_media` | Inspect the parsed media manifest for a Markdown file |
| `review_trace` | Review a saved browser workflow trace artifact |
| `compare_trace` | Compare two workflow trace artifacts |
| `doctor` | Check local configuration, transport readiness, and ignored runtime files |
| `policy` | Review repository distribution and dependency policy |
| `infer_contract` | Infer draft API endpoints from a saved capture artifact |
| `merge_contracts` | Merge multiple draft capture artifacts into one contract matrix |
| `compare_contracts` | Compare two draft contract matrix fixtures |
| `resolve_section` | Resolve a draft section against the current read-only inventory |
| `find_duplicates` | Look up likely duplicate drafts using read-only inventory and mappings |
| `list_draft_mappings` | List local source-file to Substack draft mappings |
| `campaign.plan` | Build a Creator OS campaign plan without live writes |
| `campaign.validate` | Validate a campaign artifact |
| `analytics.trend` | Summarize local growth snapshot trends |
| `campaign.report` | Summarize campaign run-log artifacts |

All MCP tools are read-only by design for safety. Write operations (publish, draft, schedule, config, auth) are intentionally excluded from the MCP surface.

## MCP Resources

| Resource | Description |
|----------|-------------|
| `substack://summary/redacted` | Redacted CLI summary with transport and auth readiness |
| `substack://inventory/{source}` | User and publication inventory (e.g., `substack://inventory/auto`) |

## MCP Prompts

| Prompt | Description |
|---------|-------------|
| `analyze_draft` | Analyze a Markdown file for draft readiness |
| `review_trace` | Review and summarize a workflow trace |

## Example MCP Session (Claude Code)

A user asks Claude to analyze a draft:

> *"Is my post.md ready to publish?"*

Claude uses the `analyze_draft` prompt to inspect the file, then calls
`read_inventory` and `validate_schema` to confirm readiness before summarizing
findings to the user.
