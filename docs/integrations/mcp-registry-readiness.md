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
3. Verify local registry readiness: `npm run registry:publisher`
4. Authenticate with the MCP Registry using GitHub-based auth: `mcp-publisher login github`
5. Submit the registry metadata: `npm run registry:publisher -- publish`
6. Verify the published listing resolves the correct package and launch command

## Local verification boundary

The helper script is bounded to local checks unless `publish` mode is explicitly requested:

```bash
npm run registry:publisher
npm run registry:publisher:dry-run
npm run registry:publisher -- help
```

These commands do not require registry credentials. They validate local metadata, report whether `mcp-publisher` is installed, and print the live publish commands.

## External gates

The following steps cannot be completed from an unauthenticated local checkout:

- npm package publication requires package owner access or a configured trusted publisher.
- MCP Registry publication requires GitHub namespace ownership for `io.github.edithatogo/substack-cli` and an authenticated `mcp-publisher` session.
- Smithery and other catalogs require their own publisher accounts, review processes, or API tokens.

## Notes

- The registry stores metadata only; the package itself remains on npm.
- The MCP surface is intentionally redacted and read-only.
- Publishing should be performed only after verifying the name namespace and `mcpName` match.
