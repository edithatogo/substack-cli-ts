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
- Mutation testing runs in CI as a separate job gated by Stryker's break
  threshold (currently 50). If the score drops below the break threshold the
  job fails, blocking the PR.
- CI can run without live Substack credentials or browser sessions.
- E2E tests against a live publication are available via `npm run test:e2e`
  but excluded from default CI (manual trigger only).
- Monorepo tooling can be reconsidered if this becomes a multi-package workspace.
