# Track 36: VS Code Integration Packaging

## Status

**Complete**

## Goal

Provide a VS Code-friendly distribution path for the MCP server and local workflow helpers.

## Scope

- Create a VS Code extension scaffold or configuration package.
- Add launch/configuration examples for spawning the MCP server.
- Document how the extension relates to the stdio MCP server.

## Acceptance Criteria

- [x] VS Code setup instructions exist in `docs/integrations/client-setup.md` and `extensions/vscode/README.md`.
- [x] MCP server launch configuration is documented for published-package and repository-local use.
- [x] The integration remains optional and does not duplicate CLI logic.

## Implementation Notes

- `extensions/vscode/package.json` provides thin helper metadata and defaults to `npx -y @edithatogo/substack-cli mcp serve`.
- `extensions/vscode/README.md` documents the VS Code launch contract and MCP safety boundary.
- `docs/integrations/client-setup.md` keeps the cross-client setup contract in one place.
