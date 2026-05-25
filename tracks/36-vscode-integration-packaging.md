# Track 36: VS Code Integration Packaging

## Goal

Provide a VS Code-friendly distribution path for the MCP server and local workflow helpers.

## Scope

- Create a VS Code extension scaffold or configuration package.
- Add launch/configuration examples for spawning the MCP server.
- Document how the extension relates to the stdio MCP server.

## Acceptance Criteria

- [x] VS Code setup instructions exist.
- [x] MCP server launch configuration is documented.
- [x] The integration remains optional and does not duplicate CLI logic.

## Implementation Notes

- `docs/integrations/vscode.md` documents workspace `.vscode/mcp.json` setup.
- `.vscode/mcp.json` provides a checked-in workspace example for VS Code MCP hosts.
- `extensions/vscode/package.json` remains a thin extension metadata scaffold.
- Launch command is normalized to `npx -y @edithatogo/substack-cli mcp serve`.

## Validation

- [x] `npm run registry:validate` validates shared registry/client metadata.
- [x] `npm run integrations:validate` validates the checked-in VS Code workspace config shape.
External gate: validate the config in a live VS Code MCP host before marketplace claims.
