# Track 38: Gemini Integration Packaging

## Goal

Prepare Gemini CLI / Gemini-compatible local agent integration examples for the MCP server.

## Scope

- Add Gemini integration docs or manifest examples.
- Map the MCP server launch command to Gemini-compatible config.

## Acceptance Criteria

- [x] Gemini usage example exists.
- [x] The integration points are clearly documented.

## Implementation Notes

- `docs/integrations/gemini.md` documents Gemini CLI settings.
- `extensions/gemini/package.json` carries a copyable `mcpServers` scaffold.
- `.gemini/settings.json` provides a checked-in project-level Gemini settings example.
- Consumer Gemini web support is explicitly not claimed.

## Validation

- [x] `npm run registry:validate` validates the packaged config shape.
- [x] `npm run integrations:validate` validates the checked-in Gemini settings shape.
- [x] `gemini mcp --help` confirms the installed Gemini CLI supports `mcp add/list`.
External gate: validate end-to-end tool discovery in an authenticated Gemini session before publishing registry/client-specific claims.
