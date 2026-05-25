# MCP Registry Readiness

This repository already ships a stdio MCP server via `src/mcp/server.ts` and exposes a redacted read-only surface.

## Registry metadata

- `registry.server.json` contains the registry-ready metadata for the MCP Registry.
- The package is published as npm package `@edithatogo/substack-cli`.
- The MCP server name is `io.github.edithatogo/substack-cli`.
- The package is launched via `node dist/cli.js mcp serve`.
- `src/registry/metadata.ts` provides a typed local reader for the registry manifest.

## Required publish steps

1. Build the package: `npm run build`
2. Publish the npm package: `npm publish --access public`
3. Authenticate with the MCP Registry using GitHub-based auth
4. Submit the registry metadata via `mcp-publisher publish`
5. Verify the published listing resolves the correct package and launch command

## Notes

- The registry stores metadata only; the package itself remains on npm.
- The MCP surface is intentionally redacted and read-only.
- Publishing should be performed only after verifying the name namespace and `mcpName` match.
