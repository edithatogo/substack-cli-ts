# Installation

## Windows / OneDrive note

If you are working on Windows, avoid placing the repository inside a OneDrive-synced folder when possible. npm caches, build output, and local browser profile state can be file-locked or slow to clean up in synced folders.

If you must keep the repo under OneDrive, point npm and CLI state to local disk:

```powershell
setx npm_config_cache "$env:LOCALAPPDATA\npm-cache"
setx SUBSTACK_CLI_STATE_DIR "$env:LOCALAPPDATA\substack-cli"
```

The local browser profile and stagehand cache are stored under `.substack-cli/` by default.

## Known parser limitations

- YAML block-list 	ags: entries are not currently parsed. Use bracketed arrays like 	ags: [a, b] or a comma-delimited string.
- Image alt text containing embedded quote characters may be truncated by the current Markdown parser; keep title/caption text in the title field or a following paragraph.

