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
| `api.inventory` | Read user and publication inventory through read-only API probes |
| `api.auth.status` | Summarize local API auth material readiness without exposing secrets |
| `schema.validate` | Validate a ProseMirror JSON document or captured fixture |
| `api.media` | Inspect the parsed media manifest for a Markdown file |
| `trace.review` | Review a saved browser workflow trace artifact |
| `trace.compare` | Compare two workflow trace artifacts |
| `doctor` | Check local configuration, transport readiness, and ignored runtime files |
| `policy` | Review repository distribution and dependency policy |
| `coverage.validate` | Validate the frontier coverage matrix |
| `coverage.gaps` | Summarize frontier coverage gaps |
| `coverage.inspect` | Inspect one coverage capability |
| `coverage.safe_surfaces` | List safe frontier automation boundaries |
| `coverage.safe_surface` | Inspect one safe frontier automation boundary |
| `launch.check` | Review external launch and admin follow-through gates |
| `api.draft.contract` | Infer draft API endpoints from a saved capture artifact |
| `api.draft.contract.matrix` | Merge multiple draft capture artifacts into one contract matrix |
| `api.draft.contract.matrix.compare` | Compare two draft contract matrix fixtures |
| `api.draft.section` | Resolve a draft section against the current read-only inventory |
| `api.draft.duplicates` | Look up likely duplicate drafts using read-only inventory and mappings |
| `api.draft.inspect` | Inspect draft state through read-only inventory and mappings |
| `api.draft.review` | Review a saved draft capture artifact |
| `api.draft.compare` | Compare two draft capture artifacts |
| `api.draft.fixture` | Write a redacted draft capture fixture |
| `campaign.plan` | Build a Creator OS campaign plan without live writes |
| `campaign.validate` | Validate a campaign artifact |
| `analytics.trend` | Summarize local growth snapshot trends |
| `campaign.report` | Summarize campaign run-log artifacts |

All MCP tools are read-only by design for safety. Write operations (publish, draft, schedule, config, auth) are intentionally excluded from the MCP surface.

## MCP Resources

| Resource | Description |
|----------|-------------|
| `substack-cli://mcp/surface` | Redacted MCP surface manifest |
| `substack-cli://mcp/summary` | Redacted MCP summary counts |
| `substack-cli://coverage/matrix` | Canonical frontier coverage matrix |
| `substack-cli://coverage/roadmap` | Generated frontier coverage roadmap |
| `substack-cli://launch/checklist` | External launch and admin checklist |
| `substack-cli://coverage/decisions` | Coverage decision records and launch gate summaries |
| `substack-cli://coverage/safe-surfaces` | Safe frontier surface decisions and automation boundaries |

## MCP Prompts

| Prompt | Description |
|---------|-------------|
| `mcp.surface.overview` | Describe the read-only MCP surface |
| `mcp.workflow.review` | Review Substack workflow artifacts safely |

## Example MCP Session (Claude Code)

A user asks Claude to analyze a draft:

> *"Is my post.md ready to publish?"*

Claude uses the `mcp.surface.overview` prompt to inspect the available surface,
then calls `api.inventory` and `schema.validate` to confirm readiness before summarizing
findings to the user.
