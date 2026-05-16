# MCP Publish Helper

The repository uses `registry.server.json` as the registry-ready metadata artifact.

## Helper command

Create a simple manual publish flow by running:

```bash
mcp-publisher publish --file registry.server.json
```

If publishing through a client or catalog that does not consume `registry.server.json` directly, use this launch contract instead:

```bash
npx -y @edithatogo/substack-cli mcp serve
```

If the official CLI uses a different option shape, update this helper after confirming the installed version.

## Purpose

- Keep the registry submission step explicit.
- Avoid coupling registry publication to the main CLI runtime.
- Provide a single source of truth for the registry payload.
