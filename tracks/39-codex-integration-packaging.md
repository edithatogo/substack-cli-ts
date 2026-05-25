# Track 39: Codex Integration Packaging

## Goal

Prepare Codex-compatible local agent integration documentation and manifests for the MCP server.

## Scope

- Document Codex plugin-style configuration if supported.
- Provide a clean MCP launch example.

## Acceptance Criteria

- [x] Codex setup example exists.
- [x] The server launch contract is documented.

## Implementation Notes

- `docs/integrations/codex.md` documents Codex CLI and TOML examples.
- `extensions/codex/package.json` carries a copyable `mcpServers` scaffold.
- ChatGPT custom connectors are documented as a remote MCP productization path, not the local stdio artifact.

## Validation

- [x] `npm run registry:validate` validates the packaged config shape.
- [x] `codex mcp add` / `codex mcp list` validated the stdio launch shape in an isolated temporary `CODEX_HOME`.
External gate: validate end-to-end tool discovery in the user's real Codex config before public claims.
