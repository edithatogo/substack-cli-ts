# MCP Publish Helper

The repository uses `registry.server.json` as the registry-ready metadata artifact.

## Helper command

Validate the local registry metadata without requiring registry credentials:

```bash
npm run registry:publisher
```

This command checks the manifest/package relationship, detects whether `mcp-publisher` is installed, and prints the credential-gated login and publish commands.

For a non-interactive preview, run:

```bash
npm run registry:publisher:dry-run
```

To inspect the installed publisher CLI without publishing:

```bash
npm run registry:publisher -- help
```

The helper does not require credentials in `verify`, `dry-run`, or `help` mode.

## Live publish

Live registry submission is intentionally explicit because it requires account ownership and registry authentication:

```bash
mcp-publisher login github
npm run registry:publisher -- publish
```

The helper runs `mcp-publisher publish registry.server.json` only in `publish` mode. If the installed `mcp-publisher` version changes its argument shape, update `scripts/mcp-publisher-helper.mjs` after checking `npm run registry:publisher -- help`.

If publishing through a client or catalog that does not consume `registry.server.json` directly, use this launch contract instead:

```bash
npx -y @edithatogo/substack-cli mcp serve
```

## Purpose

- Keep the registry submission step explicit.
- Avoid coupling registry publication to the main CLI runtime.
- Provide a single source of truth for the registry payload.
- Allow local readiness verification without committing credentials or requiring an authenticated registry session.
