# Product Plan: Substack Markdown Publisher CLI

## Objective

Build a TypeScript CLI that turns local Markdown files into Substack drafts and, with explicit confirmation, publishes or schedules them through the authenticated web editor.

Substack's current official Developer API is read-only for public profile lookup, so the write path should be a browser workflow rather than an undocumented HTTP API client. The tool must operate only against accounts and publications the user controls, preserve credentials securely, and provide clear dry-run and confirmation behavior before publishing.

## Users

- Writers who draft posts locally in Markdown.
- Newsletter operators who want a scriptable publishing workflow.
- Developers who need repeatable draft creation, scheduling, or publishing from a repository.

## Core Capabilities

- Parse local Markdown files into editor-compatible ProseMirror JSON.
- Preserve Substack sessions securely to avoid repeated logins.
- Create or update Substack drafts through an authenticated browser session.
- Prefer editor-supported paste/input flows; use editor-state injection only behind an experimental flag.
- Publish immediately or schedule when requested, after explicit confirmation.
- Provide dry-run output for inspecting generated payloads before browser execution.

## Recommended Architecture

- Primary workflow: draft-first browser automation with Playwright, Browserbase session persistence, and Stagehand semantic navigation.
- Content workflow: Markdown front matter and body parsing, Markdown-to-HTML normalization, Tiptap/ProseMirror JSON generation, schema validation, and rendered-output checks.
- Session workflow: use Playwright `storageState` or Browserbase sessions instead of storing raw cookies in project files.
- Optional runtime: evaluate Camoufox as a local/remote browser adapter after the Browserbase path works. Treat it as a compatibility spike, not the default dependency.
- Experimental workflow: direct editor-state injection is useful for speed, but keep a slower paste-based fallback because Substack's editor schema is private and can change.

## Product Milestones

### Phase 1: Scaffolding and Identity Management

- Create the TypeScript package, CLI entrypoint, build scripts, and configuration layout.
- Define commands such as `substack-cli inspect <file>`, `draft <file>`, `publish <file>`, `schedule <file>`, and `auth`.
- Implement session storage using Playwright storage state and Browserbase sessions; keep raw cookies out of Git-tracked files.
- Add session validation and explicit login refresh flow.

### Phase 2: Content Parsing Pipeline

- Convert Markdown to HTML as an intermediate representation.
- Configure Tiptap with a custom schema for Substack-specific editor nodes.
- Add custom nodes for paywall dividers, subscribe widgets, embeds, and callouts.
- Generate the final ProseMirror JSON payload and validate it before injection.
- Add schema-capture fixtures from user-created drafts so changes in Substack's private schema are visible in tests.

### Phase 3: Browser Automation Infrastructure

- Configure Browserbase for remote browser sessions and persistence.
- Initialize Playwright/Stagehand through Browserbase first; add Camoufox as an optional adapter after a compatibility spike.
- Centralize browser lifecycle, tracing, screenshots, and failure diagnostics.
- Add environment validation for Browserbase credentials and runtime options.

### Phase 4: Editor Injection and Publishing Workflow

- Use Stagehand to navigate semantically to the Substack draft creation page.
- Implement a paste/input draft creation path first, then add guarded Tiptap JSON editor-state injection.
- Use Stagehand actions for final publish, schedule, and confirmation flows.
- Capture post URL, final status, and execution artifacts.

## Non-Goals

- Automating accounts without explicit user authorization.
- CAPTCHA solving, access-control bypass, or deceptive traffic generation.
- Building a general-purpose scraper or unofficial Substack API service.
- Bulk spam publishing or engagement automation.
