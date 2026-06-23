# Track 32: Vendored Substack API Source

## Status

**Complete**

## Goal

Bring the upstream `jakub-k-slys/substack-api` TypeScript client into this repository as editable vendored source, so the CLI can improve the library directly instead of depending on an opaque registry package.

## Completed Items

- [x] Compared the external package with this repo's local API layer and confirmed both are TypeScript.
- [x] Pulled the upstream `substack-api` source into `vendor/substack-api`.
- [x] Kept the vendor import Windows-safe by excluding upstream sample fixtures with `?` in their filenames.
- [x] Switched the dependency from the npm registry package to `file:vendor/substack-api`.
- [x] Included the vendored package metadata, source, and build outputs in the root package `files` list so npm distribution carries the local file dependency without nested `node_modules`.
- [x] Patched the vendored package scripts so npm-based installs can run `prepare` without requiring `pnpm`.
- [x] Verified the vendored package builds `dist/index.js` and `dist/index.d.ts` for the existing `SubstackClient` import.

## Implementation Notes

The upstream repository is `https://github.com/jakub-k-slys/substack-api`. A normal Git submodule checkout is not usable on Windows because the upstream `samples/` tree contains fixture filenames such as `343074721?types=like`, which NTFS rejects. The vendored copy therefore contains the source, package metadata, build config, README, and license, but not the problematic sample fixture tree.

The CLI still imports `SubstackClient` from `substack-api`; npm now resolves that name from the local vendored source path.

## Dependencies

- Track 21 (Community Features) — notes/following currently use the `SubstackClient` adapter.
- Track 30 (API Documentation) — architecture documentation needs to describe the local vendor boundary.

## Acceptance Criteria

- [x] `package.json` resolves `substack-api` from `file:vendor/substack-api`
- [x] `package.json#files` includes vendored `substack-api` package metadata, source, and build outputs
- [x] `package-lock.json` records the local file dependency
- [x] `vendor/substack-api/src` is present and editable in this repository
- [x] `vendor/substack-api/package.json` can build through npm-driven `prepare`
- [x] `npm run typecheck` passes
- [x] `npm run build` passes
- [x] `npm test` passes
