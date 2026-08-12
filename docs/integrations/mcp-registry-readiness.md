# MCP Registry Readiness

This repository already ships a stdio MCP server and local registry metadata.

## Ready locally

- `registry.server.json` contains registry-ready metadata for the MCP Registry.
- The intended npm package is `@edithatogo/substack-publisher`. Live npm publish remains owner-gated.
- The MCP server name is `io.github.edithatogo/substack-publisher`.
- Client configs should launch `npx -y @edithatogo/substack-publisher mcp serve` after publish; registry metadata points at the packaged `dist/cli.js` entrypoint.
- `src/registry/metadata.ts` provides a typed local reader, validation checks, and reproducible publisher commands for the registry manifest.

## Required publish steps

1. Build and validate the registry package locally: `npm run registry:summary`
2. Verify metadata/client drift checks: `npm run registry:validate && npm run integrations:validate`
3. Capture the exact publisher command: `npm run registry:publish-command`
4. Publish the npm package: `npm publish --provenance --access public`
5. Authenticate with the MCP Registry using GitHub-based auth: `mcp-publisher login github`
6. Submit the registry metadata: `npm run registry:publisher -- publish`
7. Verify the published listing resolves the correct package and launch command

## External gates

The repo-side MCP registry package is complete and locally reproducible. Live MCP Registry, Smithery, npm, or marketplace submission remains external because it requires publisher credentials and registry review outside this repository.

## Notes

- Do not commit registry credentials or publisher tokens.
- Keep client examples on the same stdio launch contract unless a target registry requires a different shape.
