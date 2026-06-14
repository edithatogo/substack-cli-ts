# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Package publishing setup (`package.json` metadata, `files`, `publishConfig`)
- Contributor documentation (`CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `SECURITY.md`, `CHANGELOG.md`)
- API documentation (`docs/api/commands.md`, `docs/api/architecture.md`)

### Fixed

- **Duplicate `api publication settings` command**: Removed duplicate registration in `cli.ts`; renamed first duplicate to `api publication get-details` alias
- **`--experimental-inject-state` flag**: Changed from throwing `BrowserWorkflowError` to emitting a `console.warn` and falling back to the paste-based path
- **`.gitignore`**: Changed `scripts/*.mjs` to selectively ignore only capture scripts; `secret-scan.mjs` is now tracked in version control
- **Test file syntax errors**: Fixed pre-existing extra `});` in `store.test.ts`, `client.test.ts`, and `payload.test.ts` that caused TypeScript compilation failures
- **Missing command documentation**: Added `api publication get-details`, `api publication set`, `api publication upload-logo`, `api publication upload-favicon`, `api subscriber list` to `docs/api/commands.md`
- **Documentation cleanup**: Removed phantom `api posts list` command, removed duplicate `api subscriber count` entries, removed duplicate `api following`/`api following list` entries, removed duplicate `api profile` section — all `###` headers in `docs/api/commands.md` are now unique

### Changed

- **README badges**: Removed npm badges (package is private); added Dependabot, Mutation testing, and MCP badges; fixed ordering
- **README content**: Cleaned up content, fixed formatting

### Security

- **`secret-scan.mjs` now tracked in git**: The security scanning script is no longer excluded from version control

## [0.1.0] - 2026-05-02

### Added

- Markdown to ProseMirror conversion with full feature parity
  - Front matter parsing (title, subtitle, tags, audience, slug, section)
  - HTML-to-Tiptap/ProseMirror JSON conversion
  - Custom placeholder nodes for paywall and subscribe widgets
  - Image, video, audio, embed, math, callout, blockquote, code block support
- Browser automation
  - Local Chrome via Playwright
  - Browserbase/Stagehand sessions for remote browser automation
  - Local Chrome profile management for persistent sessions
- Internal API transport
  - Read API probes (inventory, profile, posts, notes, subscriber count, team)
  - Draft write operations (create, update, link, mappings)
  - Publish and schedule operations
  - Media upload infrastructure
  - Auth session extraction and validation
- Dual-transport design (browser | api | auto)
  - Automatic transport selection and fallback
- MCP integration (21 tools)
  - MCP server over stdio
  - Surface manifest and summary resource
- Trace and diagnostic commands
  - Browser workflow trace capture and comparison
  - Publish screen, review overlay, and schedule screen diagnostics
  - Draft capture artifact review and contract inference
- Configuration management
  - Config store with local and effective merge
  - Credential redaction
  - Draft mappings (source file to Substack draft ID)
- Schema fixtures and validation
  - Payload capture and comparison for regression testing
- Quality toolchain
  - ESLint, Prettier, TypeScript strict mode
  - Vitest unit and coverage testing
  - Stryker mutation testing
  - Secret scanning

[unreleased]: https://github.com/edithatogo/substack-cli-ts/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/edithatogo/substack-cli-ts/releases/tag/v0.1.0
