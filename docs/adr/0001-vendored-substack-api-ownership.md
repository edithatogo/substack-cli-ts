# ADR 0001: Vendored Substack API ownership

## Status

Accepted.

## Decision

The maintained CLI owns the vendored `jakub-k-slys/substack-api` snapshot as a packaged internal implementation asset. Runtime code imports `vendor/substack-api/dist/` directly; the public package no longer declares a repository-relative `file:` dependency. The vendored runtime dependencies are exact direct dependencies of the root package.

## Provenance and update process

- Upstream: `https://github.com/jakub-k-slys/substack-api`
- Snapshot version: `4.0.0`
- Licence: MIT, preserved in `vendor/substack-api/LICENSE`
- Local source and compiled output remain under `vendor/substack-api/` for auditability.
- Updates require upstream comparison, licence review, root test execution, clean-room tarball installation, and an updated divergence note.

## Divergence

The root repository supplies Windows-safe scripts and tests and integrates the client through `src/substack-api/substack-adapter.ts`. The upstream package is not separately published or resolved during installation.
