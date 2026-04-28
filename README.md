# substack-cli

TypeScript CLI scaffold for turning local Markdown into Substack draft content and driving the authenticated Substack editor through Browserbase, Playwright, and Stagehand.

## Current Status

Implemented:

- Markdown front matter parsing.
- Markdown to HTML conversion.
- Tiptap/ProseMirror JSON generation.
- Custom placeholder nodes for `{{paywall}}` and `{{subscribe: Label}}`.
- Dry-run inspection commands.
- Local non-secret config and Browserbase session metadata storage under `.substack-cli/`.
- Browser workflow skeleton for draft creation, publish confirmation, and manual login sessions.

Not yet fully validated against a live Substack editor session:

- Stagehand navigation from publication home/dashboard to the text post editor.
- Paste-based body insertion in Substack's live editor.
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
node dist\cli.js api auth status --source local-profile
node dist\cli.js api inventory --source local-profile --post-limit 10
node dist\cli.js api payload examples\basic.md
node dist\cli.js api media examples\media.md
node dist\cli.js api draft create examples\basic.md
node dist\cli.js api draft observe --timeout-seconds 180
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
```
