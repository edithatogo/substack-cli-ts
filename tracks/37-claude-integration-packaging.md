# Track 37: Claude Integration Packaging

## Goal

Document and package the repo for Claude Desktop / Claude Code MCP usage.

## Scope

- Add Claude MCP client configuration examples.
- Document the stdio server launch contract.
- Add redaction and safety guidance for local sessions.

## Acceptance Criteria

- [x] Claude setup example exists.
- [x] The MCP server can be spawned from Claude-compatible config.
- [x] Safety boundaries are documented.

## Implementation Notes

- `docs/integrations/claude.md` documents Claude Desktop / Claude Code stdio setup.
- `extensions/claude/package.json` carries a copyable `mcpServers` scaffold.
- Launch command is normalized to `npx -y @edithatogo/substack-cli mcp serve`.

## Validation

- [x] `npm run registry:validate` validates the packaged config shape.
External gate: validate the config in a live Claude client before public directory claims.
