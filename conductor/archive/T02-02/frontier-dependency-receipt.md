# P02-02 Frontier Dependency Receipt

Generated: 2026-08-08

## Evidence

- Installed direct dependency state was captured with `npm ls --depth=0 --json`.
- The lockfile is npm lockfile v3 and records resolved tarball URLs for registry dependencies.
- The repository uses exact overrides for the Tiptap family and several transitive security-sensitive packages.
- No claim is made here that every upstream prerelease channel, release note, vulnerability, licence, or Renovate supersession has been independently verified.

## Verdict

`partial`. This receipt establishes the local provenance baseline only; upstream dist-tag and release-note evidence remains required before P02-02 can be considered implementation-complete.
