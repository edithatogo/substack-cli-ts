# Track 40: GitHub Copilot Integration Packaging

## Goal

Prepare GitHub Copilot-friendly MCP connection instructions and any extension metadata needed for local usage.

## Scope

- Add Copilot setup docs.
- Clarify whether the integration is through VS Code or another supported client path.

## Acceptance Criteria

- [x] Copilot usage path is documented.
- [x] Any required extension or workspace config is included.

## Implementation Notes

- `docs/integrations/copilot.md` documents the VS Code MCP route for GitHub Copilot.
- `extensions/copilot/package.json` carries a copyable `mcpServers` scaffold.
- `.vscode/mcp.json` provides a checked-in workspace config that Copilot can use through VS Code MCP support.
- The Copilot path remains a client configuration path and does not add write tools.

## Validation

- [x] `npm run registry:validate` validates the packaged config shape.
- [x] `npm run integrations:validate` validates the checked-in VS Code/Copilot workspace config shape.
External gate: validate inside VS Code with Copilot enabled before marketplace claims.
