# Distribution Targets

This project publishes one core artifact, the npm package `@edithatogo/substack-cli`, plus registry metadata/configuration for MCP-capable clients.

Most registry submissions require account ownership, API tokens, or manual review. Keep those steps explicit and do not automate them with local secrets committed to the repository. `prepublishOnly` runs `npm run quality` before npm publication.

## Core package

| Target | Local artifact | Publish command | Credential required | Status |
| --- | --- | --- | --- | --- |
| npm | `npm pack` from root | `npm publish --provenance --access public` | npm automation token / OIDC trusted publisher | Ready after clean CI |
| GitHub Release | Git tag `v*` | `.github/workflows/publish.yml` | GitHub Actions token + npm token/trusted publisher | Workflow present |

## MCP registries and agent catalogs

| Target | Artifact/config | Submission path | Credential required | Status |
| --- | --- | --- | --- | --- |
| Official MCP registry / GitHub MCP registry | `registry.server.json` | Submit/publish using the current MCP registry process for `io.github.edithatogo/substack-cli` | GitHub namespace ownership; registry publisher token if required | Metadata ready; external submission required |
| Smithery | `registry.server.json` plus npm package launch command | Register package/server through Smithery's publisher flow | Smithery account/API token | External submission required |
| Claude Desktop / Claude Code | MCP config spawning `npx -y @edithatogo/substack-cli mcp serve` | User/client config, not a public package registry | None for local use | Config documented |
| Gemini CLI extensions | MCP config spawning `npx -y @edithatogo/substack-cli mcp serve` | Gemini settings or extension/registry process when available | Gemini/Google publisher access if registry-backed | Config documented; external process required |
| Codex / ChatGPT connectors | Codex local MCP config; ChatGPT requires remote MCP connector | Codex local config or ChatGPT connector flow | OpenAI account/admin access for ChatGPT connector publication | Codex documented; ChatGPT external productization required |
| GitHub Copilot | VS Code MCP configuration or Copilot extension path | VS Code workspace/user config and marketplace docs | Marketplace publisher for extension package | Config documented |

## Editor marketplaces

| Target | Artifact/config | Publish command | Credential required | Status |
| --- | --- | --- | --- | --- |
| VS Code Marketplace | `extensions/vscode/package.json` scaffold | `vsce package` / `vsce publish` after adding extension implementation assets | Azure DevOps publisher token | Scaffold only |
| Open VSX | `extensions/vscode/package.json` scaffold | `ovsx publish` after adding extension implementation assets | Open VSX token | Scaffold only |

## Shell completions

The npm package includes `scripts/install-completions.sh` and `scripts/install-completions.ps1`. These scripts load completions dynamically from `substack-cli completion bash|zsh|powershell`, so generated completion files do not need to be committed.

## Pre-publication checklist

1. Ensure `git status` is clean.
2. Run `npm ci` if dependencies changed.
3. Run `npm run typecheck`.
4. Run `npm test`.
5. Run `npm run test:coverage`.
6. Run `npm run scan:secrets`.
7. Run `npm pack --dry-run --json` and confirm only intended package files are included.
8. Confirm `registry.server.json` references `@edithatogo/substack-cli` and `mcp serve`.
9. Tag a release (`vX.Y.Z`) only after CI is green.
10. Publish to npm, then submit/update MCP registry and Smithery entries using the published package version.

## Standard MCP launch config

```json
{
  "mcpServers": {
    "substack-cli": {
      "command": "npx",
      "args": ["-y", "@edithatogo/substack-cli", "mcp", "serve"],
      "env": {
        "SUBSTACK_PUBLICATION_URL": "https://your-publication.substack.com"
      }
    }
  }
}
```
