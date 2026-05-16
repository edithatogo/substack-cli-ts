# MCP Registry Submission Checklist

- [ ] Confirm GitHub auth namespace ownership
- [ ] Confirm `registry.server.json` name matches the package identifier and launch command
- [ ] Build and test: `npm run build && npm test`
- [ ] Publish npm package publicly
- [ ] Run `mcp-publisher publish --help` against the local metadata
- [ ] Submit `registry.server.json` to the MCP Registry
- [ ] Submit/update the server in Smithery using the published npm package and MCP command
- [ ] Verify Claude/Gemini/Codex/Copilot client configs launch `npx -y @edithatogo/substack-cli mcp serve`
- [ ] Verify the registry entry resolves the package and launch command
- [ ] Add a release note referencing the registry entry URL
