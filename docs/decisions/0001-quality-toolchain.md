# ADR 0001: Quality Toolchain

## Status

Accepted

## Context

This repository is a single TypeScript CLI, not a monorepo. It needs strong local quality gates without adding monorepo orchestration that would not yet pay for itself.

## Decision

Use npm scripts as the task runner, Vitest for tests and V8 coverage, fast-check for property-based tests, ESLint flat config with type-aware TypeScript rules, Prettier for formatting, Stryker as an opt-in mutation testing tool, GitHub Actions for CI, and Renovate for dependency updates.

Do not add Nx, Turborepo, Moon, Rush, Bazel, Lage, Buildkite, Harness, Argo CD, Dagger, Bun, or Deno at this stage.

## Consequences

- The quality path stays simple: `npm run quality`.
- Mutation testing is available but not part of default CI because it is slower.
- CI can run without live Substack credentials or browser sessions.
- Monorepo tooling can be reconsidered if this becomes a multi-package workspace.
