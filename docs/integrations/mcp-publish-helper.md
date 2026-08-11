# MCP Publish Helper

The repository uses `registry.server.json` as the source of truth for MCP Registry metadata.

## Helper commands

Validate local registry metadata without requiring registry credentials:

```bash
npm run registry:summary
npm run registry:validate
npm run registry:publisher
npm run registry:publisher:dry-run
npm run registry:publish-command
```

`npm run registry:publisher` checks the manifest/package relationship, detects whether `mcp-publisher` is installed, and prints the credential-gated login and publish commands.

`npm run registry:publish-command` prints the registry publisher command produced from `registry.server.json` after a build.

To inspect the installed publisher CLI without publishing:

```bash
npm run registry:publisher -- help
```

The helper does not require credentials in verify, dry-run, or help mode.

## Live publish

Live registry submission is intentionally explicit because it requires account ownership and registry authentication:

```bash
mcp-publisher login github
npm run registry:publisher -- publish
```

If publishing through a client or catalog that does not consume `registry.server.json` directly, use this launch contract instead:

```bash
npx -y @edithatogo/substack-publisher mcp serve
```
