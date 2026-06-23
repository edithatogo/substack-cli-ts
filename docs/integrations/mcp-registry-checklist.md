# MCP Registry Submission Checklist

- [ ] Confirm GitHub auth namespace ownership
- [ ] Confirm `registry.server.json` name matches the package identifier and launch command with `npm run registry:validate`
- [ ] Run local publisher readiness verification with `npm run registry:publisher`
- [ ] Run `npm run registry:summary` and confirm `validationIssues` is empty
- [ ] Run `npm run registry:publish-command` and confirm the printed publisher command targets `registry.server.json`
- [ ] Build and test: `npm run build && npm test`
- [ ] Publish npm package publicly
- [ ] Authenticate with the MCP Registry: `mcp-publisher login github`
- [ ] Submit `registry.server.json` to the MCP Registry: `npm run registry:publisher -- publish`
- [ ] Submit/update the server in Smithery using the published npm package and MCP command
- [ ] Verify Claude/Gemini/Codex/Copilot client configs launch `npx -y @edithatogo/substack-cli mcp serve`
- [ ] Verify the registry entry resolves the package and launch command
