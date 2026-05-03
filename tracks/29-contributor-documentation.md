# Track 29: Contributor Documentation

## Status

**Complete**

## Goal

Create the standard open-source project governance and contributor documents that are currently missing: `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `CHANGELOG.md`, and `SECURITY.md`.

## Completed Items

### CONTRIBUTING.md

- [x] Development setup guide (node version, install, build)
- [x] How to run tests (`npm test`, `npm run typecheck`, `npm run quality`)
- [x] Code style conventions (TypeScript strict, ESLint, Prettier)
- [x] How to add new CLI commands
- [x] How to add new ProseMirror node types
- [x] How to capture and update fixtures
- [x] Pull request process (what to include, what to verify before submitting)
- [x] How to report bugs and request features
- [x] Link to ADRs for design decisions
- [x] Link to Track 14 (Quality, CI, and Automation) for CI pipeline details

### CODE_OF_CONDUCT.md

- [x] Adopted the Contributor Covenant v2.1
- [x] Customized with project-specific email

### CHANGELOG.md

- [x] Follows Keep a Changelog format
- [x] Retrocactive entries for initial release (0.1.0)
- [x] Unreleased section for current development
- [x] Version compare links at the bottom

### SECURITY.md

- [x] How to report security vulnerabilities (private email)
- [x] Supported versions
- [x] Disclosure policy
- [x] Reference to `scripts/secret-scan.mjs` for automated scanning

## Dependencies

- None — standalone documentation work

## Acceptance Criteria

- [x] All four files exist at repository root
- [x] CONTRIBUTING.md includes complete setup, test, build, and PR workflow instructions
- [x] CODE_OF_CONDUCT.md adopts Contributor Covenant v2.1
- [x] CHANGELOG.md has retroactive entries for all shipped features
- [x] SECURITY.md includes private reporting instructions
