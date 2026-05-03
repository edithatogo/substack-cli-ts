# Track 30: API Documentation & Architecture Overview

## Status

**Complete**

## Goal

Create comprehensive API reference documentation and an architecture overview so that contributors and integrators can understand the module boundaries, data flow, and how to extend the CLI.

## Completed Items

### Architecture overview document (`docs/api/architecture.md`)

- [x] High-level module map (all `src/` directories)
- [x] Data flow diagrams (Markdown → parser → payload → transport → Substack)
- [x] Dual-transport design explanation with rationale
- [x] Transport selection logic (browser vs API vs auto)
- [x] How draft mappings work
- [x] Error handling patterns
- [x] Testing strategy (unit, fixture, E2E)
- [x] How to add a new API endpoint

### API reference (`docs/api/commands.md`)

- [x] Comprehensive list of all CLI commands and subcommands
- [x] All options documented with types and defaults
- [x] Arguments documented with descriptions

## Dependencies

- None — documentation-only work

## Acceptance Criteria

- [x] `docs/api/architecture.md` exists with module map, data flow, and transport selection explanation
- [x] `docs/api/commands.md` exists with comprehensive command reference
- [x] The architecture doc explains how to add a new API endpoint
- [x] The architecture doc explains the dual-transport design rationale
- [x] All documentation passes `prettier --check`
