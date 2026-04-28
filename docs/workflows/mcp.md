# MCP Workflow

Use this workflow when changing the MCP server, surface manifest, resources, prompts, or redacted summaries.

## Sequence

1. Update the shared MCP catalog or manifest module.
2. Register the same behavior in the stdio server.
3. Keep the CLI command, MCP resource, and prompt output aligned.
4. Add or update tests for the surface descriptors and summary shapes.
5. Run `npm run quality` and `npm run scan:secrets`.

## Surface Rules

- Expose redacted summaries only.
- Keep the tool surface narrow.
- Prefer read-only resources and prompts over new write paths.
- Never include cookies, session URLs, or local secret values.

## Useful References

- `src/mcp/manifest.ts`
- `src/mcp/catalog.ts`
- `src/mcp/resources.ts`
- `src/mcp/prompts.ts`
- `tracks/15-mcp-integration.md`
