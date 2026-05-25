# Track 34: Publication Routes & Registry Distribution

## Status

**Complete**

## Goal

Map and implement all publication/distribution routes for the substack-cli package across relevant registries and platforms, ensuring discoverability, proper metadata, and automated releases.

## Scope

- npm registry publication (primary distribution channel)
- MCP registry integration
- GitHub Container Registry / npm packages
- Homebrew tap (future)
- Shell completion distribution
- Automated release workflow
- Package signing and provenance

---

## Registry Publication Map

```mermaid
graph TB
    REPO[GitHub Repo] --> NPM[npm Registry]
    REPO --> GHCR[GitHub Packages]
    REPO --> MCP[MCP Registry]
    
    NPM --> CONSUMERS[Direct npm consumers]
    NPM --> HOMEBREW[Homebrew tap - future]
    
    MCP --> AI_AGENTS[AI Agents - Claude, Cline, etc.]
    
    GHCR --> ENTERPRISE[Enterprise users]
    
    subgraph RELEASE[Release Pipeline]
        CI[CI Workflow] --> PUBLISH[npm publish]
        CI --> TAG[Git Tag]
        CI --> NOTES[Release Notes]
    end
    
    subgraph METADATA[Package Metadata]
        PKG_JSON[package.json]
        README[README.md]
        LICENSE[LICENSE]
        CHANGELOG[CHANGELOG.md]
    end
    
    METADATA --> NPM
    METADATA --> GHCR
```

---

## 1. npm Registry (Primary)

### 1.1 Current Status

| Item | Status | Details |
|------|--------|---------|
| Package name | ✅ | `@edithatogo/substack-cli` |
| Version | ✅ | `0.1.0` |
| `"private": false` | ✅ | Published to npm |
| `"main"` entry | ✅ | `"dist/cli.js"` |
| `"bin"` entry | ✅ | `{ "substack-cli": "dist/cli.js" }` |
| `"files"` include list | ✅ | Selects dist/ and required files |
| `"publishConfig"` | ✅ | Public access |
| `"prepublishOnly"` script | ✅ | Build step |

---

## 2. MCP Registry Integration

### 2.1 Current Status

| Item | Status | Details |
|------|--------|---------|
| MCP stdio server | ✅ | `mcp serve` command |
| Tool registration (17 tools) | ✅ | 3 groups: read, review, capture |
| Resource registration (2) | ✅ | surface, summary |
| Prompt registration (2) | ✅ | overview, workflow review |
| MCP manifest | ✅ | `buildMcpSurfaceManifest()` |

### 2.2 MCP Discovery Configuration

For AI agents to discover the MCP server:

```json
{
  "mcpServers": {
    "substack-cli": {
      "command": "npx",
      "args": ["substack-cli", "mcp", "serve"],
      "env": {}
    }
  }
}
```

---

## 3. Shell Completion Distribution

| Shell | Status | Command | File |
|-------|--------|---------|------|
| bash | ✅ | `substack-cli completion bash` | `scripts/completions.bash` |
| zsh | ✅ | `substack-cli completion zsh` | `scripts/completions.zsh` |
| powershell | ✅ | `substack-cli completion powershell` | `scripts/completions.ps1` |

---

## 4. Release Workflow

### 4.1 Release Process

```mermaid
flowchart TB
    DEV[Development] --> PR[Pull Request]
    PR --> CI[CI passes]
    CI --> MERGE[Merge to master]
    MERGE --> BUMP[Version bump]
    BUMP --> CHANGELOG[Update CHANGELOG.md]
    CHANGELOG --> TAG[Git tag v*]
    TAG --> PUBLISH[npm publish --provenance]
    TAG --> RELEASE[GitHub Release]
    RELEASE --> NOTES[Auto-generate release notes]
```

### 4.2 Release Workflow
### 7.2 Completed Documentation Items

| Gap | Action Taken |
|-----|--------------|
| Starlight/Astro docs site | ✅ `docs/starlight-setup.md` — Complete setup guide with Astro config, sidebar structure, and deployment instructions |
| MCP server documentation | ✅ Updated in `docs/index.md` feature list and commands reference |
| API documentation site | ✅ Jekyll (GitHub Pages) configured with comprehensive nav + Starlight compatibility |
| Installation guide | ✅ `docs/installation.md` created with prerequisites, global/npx/dev install options, shell completions |
| Navigation | ✅ `docs/_config.yml` updated with full site config, nav structure, Starlight compatibility flag |
| Badges | ✅ Added to `docs/index.md`, README.md |


```yaml
name: Publish
on:
  push:
    tags: ['v*']
jobs:
  publish:
    runs-on: ubuntu-latest
    permissions:
      contents: write
      id-token: write  # For npm provenance
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          registry-url: 'https://registry.npmjs.org'
      - run: npm ci
      - run: npm publish --provenance
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

---

## 5. Badge & Repo Homepage Contract

| Badge | Status | URL |
|-------|--------|-----|
| npm version | ✅ Added | `https://img.shields.io/npm/v/%40edithatogo%2Fsubstack-cli` |
| npm downloads | ✅ Added | `https://img.shields.io/npm/dm/%40edithatogo%2Fsubstack-cli` |
| CI | ✅ In README | Workflow status badge |
| Coverage | ✅ In README | Codecov badge |
| License (Apache-2.0) | ✅ In README | Apache-2.0 badge |
| Node version | ✅ In README | `>=18` |
| TypeScript | ✅ In README | Blue badge |

### Repository Homepage Requirements

| Element | Status |
|---------|--------|
| Project name & description | ✅ |
| Badges row | ✅ |
| Installation instructions | ✅ |
| Quick start example | ✅ |
| Command reference | ✅ |
| Authentication docs | ✅ |
| Contributing guide | ✅ |
| Code of conduct | ✅ |
| Security policy | ✅ |
| Changelog | ✅ |
| License file | ✅ |

---

## 6. Security & Automation

| Feature | Status | Details |
|---------|--------|---------|
| Renovate config | ✅ | Auto-merge patch/minor |
| Dependabot config | ✅ | GitHub-native security updates |
| Auto-merge workflow | ✅ | For Renovate/Dependabot PRs |
| npm provenance | ✅ | `--provenance` flag in publish workflow |
| Secret scanning | ✅ | `scripts/secret-scan.mjs` |
| Production audit | ✅ | `npm run audit:prod` |

---

## Acceptance Criteria

- [x] `npm publish` workflow automated with provenance signing
- [x] MCP server discoverable via standard JSON configuration
- [x] README has all relevant badges (npm, CI, coverage, license, node, TS)
- [x] GitHub release workflow auto-generates notes
- [x] Shell completions distributed with the package
- [x] Renovate + Dependabot configured with auto-merge
- [x] Starlight/Astro docs site scaffold plan documented
- [x] Security scanning passes without false positives

## Autonomous Preparation

- [x] Fix stale package and badge metadata to match `@edithatogo/substack-cli` and Apache-2.0.
- [x] Add `npm run registry:validate` as a fast preflight for registry and client scaffolds.
- [x] Normalize MCP client launch examples on `npx -y @edithatogo/substack-cli mcp serve`.
- [x] Package completion installer helpers as generated-at-install artifacts.
- [x] Run `npm run scan:secrets`.

| `npm pack` test | ✅ | Clean `.tgz` output |
| `npm publish --dry-run` | ✅ | Succeeds |

### 1.2 Required package.json Fields

```json
{
  "name": "substack-cli",
  "version": "0.1.0",
  "private": false,
  "description": "Publish local Markdown files to a user-owned Substack publication.",
  "keywords": ["substack", "cli", "markdown", "publishing", "newsletter"],
  "homepage": "https://github.com/edithatogo/substack-cli-ts#readme",
  "bugs": { "url": "https://github.com/edithatogo/substack-cli-ts/issues" },
  "license": "MIT",
  "main": "dist/cli.js",
  "bin": { "substack-cli": "dist/cli.js" },
  "files": ["dist/", "README.md", "LICENSE"],
  "engines": { "node": ">=18.0.0" },
  "publishConfig": { "access": "public" },
  "repository": {
    "type": "git",
    "url": "git+https://github.com/edithatogo/substack-cli-ts.git"
  }
}
```

### 1.3 Automated npm Release

Implement GitHub Actions workflow for automated npm publishing:

```mermaid
flowchart LR
    TAG[Git Tag v* pushed] --> BUILD[Build & Test]
    BUILD --> PUBLISH[npm publish]
    PUBLISH --> GH_RELEASE[GitHub Release]
    GH_RELEASE --> NOTES[Generate Release Notes]
```
