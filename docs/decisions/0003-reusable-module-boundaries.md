# ADR 0003: Reusable Module Boundaries

## Status

Accepted

## Context

Parts of this CLI, especially the Markdown-to-ProseMirror adaptation and media/payload normalization, may eventually be reusable elsewhere. The code is still changing, so splitting it into separate repositories or git submodules would slow iteration and make cross-module coordination harder.

## Decision

Keep reusable logic in this repository as internal modules for now. When a boundary stabilizes, extract it into a local workspace package or package-like module inside the repo. Do not use git submodules for this code.

## Consequences

- The main CLI remains the product shell while parser and payload logic stay easy to refactor.
- Shared code can get unit tests and fixtures before it is published or split out.
- If a module later proves broadly reusable, it can be extracted into a separate package with a stable API.
