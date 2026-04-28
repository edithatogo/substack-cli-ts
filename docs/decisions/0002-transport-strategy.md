# ADR 0002: Transport Strategy

## Status

Accepted

## Context

The project now has two plausible transport paths: browser/editor automation and an internal API adapter inspired by existing Substack projects.

## Decision

Keep browser/editor automation as the safe default for draft creation. Develop the internal API adapter behind an explicit transport boundary, eventually exposed as `--transport api|browser|auto`.

## Consequences

- Direct internal endpoint work is isolated and can fail without breaking browser fallback.
- API work must begin with read-only probes, typed validation, and redacted errors.
- Publish and schedule remain gated by explicit confirmation regardless of transport.
