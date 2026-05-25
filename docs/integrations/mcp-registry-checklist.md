# MCP Registry Submission Checklist

- [ ] Confirm GitHub auth namespace ownership
- [ ] Confirm `registry.server.json` name matches the package identifier and launch command with `npm run registry:validate`
- [ ] Run local publisher readiness verification with `npm run registry:publisher`
- [ ] Build and test: `npm run build && npm test`
- [ ] Publish npm package publicly
- [ ] Authenticate with the MCP Registry: `mcp-publisher login github`
- [ ] Submit `registry.server.json` to the MCP Registry: `npm run registry:publisher -- publish`
- [ ] Submit/update the server in Smithery using the published npm package and MCP command
- [ ] Verify Claude/Gemini/Codex/Copilot client configs launch `npx -y @edithatogo/substack-cli mcp serve`
- [ ] Verify the registry entry resolves the package and launch command
- [ ] Add a release note referencing the registry entry URL

The local readiness helper is safe to run without credentials in default, `dry-run`, and `help` modes. Only the explicit `publish` mode invokes `mcp-publisher publish registry.server.json`.
