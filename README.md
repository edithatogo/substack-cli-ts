# substack-cli

[![CI](https://github.com/edithatogo/substack-cli-ts/actions/workflows/ci.yml/badge.svg)](https://github.com/edithatogo/substack-cli-ts/actions/workflows/ci.yml)
[![codecov](https://codecov.io/gh/edithatogo/substack-cli-ts/branch/master/graph/badge.svg)](https://codecov.io/gh/edithatogo/substack-cli-ts)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D18-brightgreen)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/typescript-5.9-blue)](https://www.typescriptlang.org)
[![Renovate](https://img.shields.io/badge/renovate-enabled-brightgreen?logo=renovate)](https://github.com/edithatogo/substack-cli-ts)
[![Dependabot](https://img.shields.io/badge/dependabot-enabled-brightgreen?logo=dependabot)](https://github.com/edithatogo/substack-cli-ts)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen)](CONTRIBUTING.md)
[![Mutation testing](https://img.shields.io/badge/mutation-stryker-orange)](https://stryker-mutator.io)
[![MCP](https://img.shields.io/badge/mcp-ready-purple)](https://modelcontextprotocol.io)

TypeScript CLI for publishing local Markdown files to a user-owned Substack publication. Supports dual-transport: **HTTP API** for automated publishing and **browser automation** (Playwright + Stagehand) for full editor interaction.

---

## Features

- âœ… **Markdown â†’ ProseMirror** â€” Parse Markdown with front matter into Substack-compatible JSON
- âœ… **Dual Transport** â€” `--transport api` for API-driven or `--transport browser` for full editor interaction
- âœ… **API Publishing** â€” Create, update, publish, and schedule drafts via Substack's API
- âœ… **Browser Automation** â€” Local Chrome or Browserbase remote sessions
- âœ… **Media Upload** â€” Upload images via base64 data URLs
- âœ… **MCP Server** â€” 17 tools, 2 resources, 2 prompts for AI agents
- âœ… **Rich Content** â€” Tables, embeds, paywall, subscribe, code blocks, blockquotes
- âœ… **Draft Management** â€” Mappings, optimistic concurrency, section resolution, duplicates
- âœ… **Workflow Traces** â€” Capture, review, and compare browser artifacts
- âœ… **Quality Gates** â€” Format â†’ Lint â†’ TypeScript â†’ Build â†’ Test (â‰¥91% coverage) â†’ Mutation

---

## Installation

```bash
npm install -g substack-cli
npx substack-cli inspect examples/basic.md
```

---

## Quick Start

```bash
# 1. Configure
substack-cli config set-publication https://yourpub.substack.com

# 2. Inspect a Markdown file
substack-cli inspect examples/basic.md

# 3. Create a draft (dry-run first)
substack-cli draft post.md --dry-run

# 4. Publish
substack-cli publish post.md --yes

# 5. Schedule
substack-cli schedule post.md --at "2026-06-01T09:00:00Z" --yes
```

- Final publish and schedule button flows.

## Setup

```powershell
npm install
npm run build
npm test
npm run quality
```

Create a local `.env` from `.env.example`:

```powershell
Copy-Item .env.example .env
```

Set:

- `BROWSERBASE_API_KEY`
- `BROWSERBASE_PROJECT_ID`
- `SUBSTACK_PUBLICATION_URL`
- `SUBSTACK_EMAIL` and `SUBSTACK_PASSWORD` only if you want `auth login --auto-login`
- `SUBSTACK_COOKIE` only if you want to test the internal API adapter without reading the local browser profile

## Commands

```powershell
node dist\cli.js inspect examples\basic.md
node dist\cli.js prepublish examples\basic.md
node dist\cli.js prepublish examples\basic.md --mode schedule --at 2026-05-01T09:00:00Z
node dist\cli.js draft examples\basic.md --dry-run
node dist\cli.js draft examples\basic.md --transport auto
node dist\cli.js config set-publication https://example.substack.com
node dist\cli.js config set-runtime local
node dist\cli.js doctor
node dist\cli.js policy
node dist\cli.js mcp surface
node dist\cli.js mcp summary
node dist\cli.js mcp serve
node dist\cli.js api auth status --source local-profile
node dist\cli.js api inventory --source local-profile --post-limit 10
node dist\cli.js api payload examples\basic.md
node dist\cli.js api media examples\media.md
node dist\cli.js api draft create examples\basic.md
node dist\cli.js api draft observe --timeout-seconds 180
node dist\cli.js api draft contract .substack-cli\draft-captures\example.json
node dist\cli.js api draft contract-matrix .substack-cli\draft-captures\a.json .substack-cli\draft-captures\b.json
node dist\cli.js api draft contract-matrix .substack-cli\draft-captures\a.json .substack-cli\draft-captures\b.json --out fixtures\draft\matrix.json
node dist\cli.js api draft contract-matrix-compare fixtures\draft\expected.json fixtures\draft\actual.json
node dist\cli.js api draft duplicates examples\basic.md
node dist\cli.js api draft section examples\basic.md
node dist\cli.js api draft inspect examples\basic.md
node dist\cli.js api draft review .substack-cli\draft-captures\example.json
node dist\cli.js api draft compare .substack-cli\draft-captures\expected.json .substack-cli\draft-captures\actual.json
node dist\cli.js api draft fixture .substack-cli\draft-captures\example.json --out fixtures\draft\baseline.json
node dist\cli.js api draft mappings
node dist\cli.js api draft link examples\basic.md --draft-id 123
node dist\cli.js auth status
node dist\cli.js auth login --wait-seconds 120
node dist\cli.js auth login --auto-login --wait-seconds 120
node dist\cli.js auth login --auto-login --pause-before-password --wait-seconds 300
```

Capture and compare parser fixtures:

```powershell
node dist\cli.js schema capture examples\basic.md --out fixtures\prosemirror\basic.json
node dist\cli.js schema validate fixtures\prosemirror\basic.json
node dist\cli.js schema compare examples\basic.md fixtures\prosemirror\basic.json
```

Publishing and scheduling require explicit confirmation:

```powershell
node dist\cli.js prepublish examples\basic.md
node dist\cli.js publish examples\basic.md --dry-run
node dist\cli.js publish examples\basic.md --review-only --yes --trace-out .substack-cli\publish-traces\review.json
node dist\cli.js publish examples\basic.md --transport browser --yes
node dist\cli.js publish examples\basic.md --yes
node dist\cli.js schedule examples\basic.md --at 2026-05-01T09:00:00Z --yes
node dist\cli.js schedule examples\basic.md --at 2026-05-01T09:00:00Z --transport auto --yes
node dist\cli.js trace review .substack-cli\publish-traces\review.json
node dist\cli.js trace compare .substack-cli\publish-traces\review.json .substack-cli\publish-traces\publish.json
node dist\cli.js trace fixture .substack-cli\publish-traces\review.json --out fixtures\trace\review.json
```

Publish and schedule commands run the same prepublish validation first and stop early if the payload is not compatible. Use `--trace-out` to capture a local JSON review artifact for later comparison.

## Markdown Markers

Use front matter for metadata:

```markdown
---
title: "Example post"
subtitle: "Generated from Markdown"
tags: [example, markdown]
audience: everyone
section: original-essays
comments: enabled
---
```

Media examples:

```markdown
![Remote alt](https://example.com/image.png "Remote caption")
![Local alt](./assets/local-image.png "Local caption")
```

Supported custom markers:

```markdown
{{paywall}}
{{subscribe: Subscribe for future posts}}
{{youtube: https://www.youtube.com/watch?v=VIDEO_ID}}
{{embed: https://example.com/article}}
{{podcast: https://open.spotify.com/episode/ID}}
```

## Markdown Feature Support

### Supported Nodes (Substack API-compatible)

| ProseMirror Node                                   | Markdown Source                              | Notes                                   |
| -------------------------------------------------- | -------------------------------------------- | --------------------------------------- |
| `paragraph`                                        | Plain text                                   | Default block                           |
| `heading`                                          | `#` through `######`                         | Levels 1-6                              |
| `bulletList` / `listItem`                          | `- `, `* `                                   | Nested lists supported                  |
| `orderedList` / `listItem`                         | `1. `                                        | Nested lists supported                  |
| `blockquote`                                       | `> `                                         | Nested blockquotes supported            |
| `codeBlock`                                        | ` ``` ` or ` ```language `                   | Language annotation preserved           |
| `horizontalRule`                                   | `---`                                        | Thematic break                          |
| `image`                                            | `![alt](src)` or `<img>`                     | Captions via `data-caption`, alt, title |
| `embedNode`                                        | `{{youtube:}}`, `{{embed:}}`, `{{podcast:}}` | URL and embed type stored               |
| `paywallDivider`                                   | `{{paywall}}`                                | Atom block, no content                  |
| `subscribeWidget`                                  | `{{subscribe: label}}`                       | Label attribute                         |
| `table` / `tableRow` / `tableCell` / `tableHeader` | GFM tables                                   | Non-resizable, inline marks supported   |
| `hardBreak`                                        | Line break                                   |                                         |
| `text`                                             | Text content                                 |                                         |

### Supported Marks

| ProseMirror Mark | Markdown Source          |
| ---------------- | ------------------------ |
| `bold`           | `**text**` or `__text__` |
| `italic`         | `*text*` or `_text_`     |
| `strike`         | `~~text~~`               |
| `code`           | `` `text` ``             |
| `link`           | `[text](url)`            |

### Unsupported Markdown Features

These constructs pass through the parser but are either not mapped to a named ProseMirror node or may render differently in Substack's editor. The `inspect` command reports them as compatibility issues before any publish attempt:

| Feature                              | Why / Fallback                                                                                                |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------- |
| **Image galleries**                  | No multi-image group node; single images work independently                                                   |
| **Substack native captioned images** | Captions parsed from `data-caption` but no separate caption element                                           |
| **Native audio/video**               | All media embeds use `embedNode`; no dedicated audio/video ProseMirror node                                   |
| **Math / LaTeX** (`$$`, `$`)         | No MathExtension registered; falls through as plain text                                                      |
| **Callouts / pull quotes**           | No Substack blockquote variant; rendered as standard `blockquote`                                             |
| **Buttons**                          | No Substack button element; would be stripped if HTML is unrecognized                                         |
| **Task lists** (`- [ ]`)             | Syntax not processed; renders as plain `listItem`                                                             |
| **Mentions** (`@user`)               | No mention extension                                                                                          |
| **Footnote references**              | No footnote ProseMirror node                                                                                  |
| **Figure / figcaption**              | HTML5 `<figure>` not handled; children still parsed                                                           |
| **Auto-generated heading IDs**       | StarterKit heading extension does not emit `id` attributes                                                    |
| **Image dimensions**                 | `image` node does not carry `width`/`height` attrs                                                            |
| **Substack editor node names**       | Custom node names (`paywallDivider`, `subscribeWidget`, `embedNode`) may not match Substack's internal schema |

The `inspect` command reports the full list of detected node types, mark types, and any unmapped types in `compatibility`:

```text
$ substack-cli inspect examples/formatting.md
{
  "compatibility": {
    "ok": true,
    "supportedNodeTypes": ["blockquote", "bulletList", ...],
    "unsupportedIssues": null
  }
}
```

