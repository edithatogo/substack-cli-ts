# Plan T09-03

## Tasks
- [x] T09-03-TASK-01 Use npm OIDC trusted publishing and remove long-lived token dependence.
- [x] T09-03-TASK-02 Build once, test exact artefacts, sign/attest and publish.
- [x] T09-03-TASK-03 Synchronize all versions and generate release notes.
- [x] T09-03-TASK-04 Test rollback and clean-room installation.

## Contract IDs
- DEP-FRONTIER-MAINLINE-002
- DEP-COHERENCE-007
- DEP-PUBLIC-PACKAGE-008
- MCP-PACKAGING-007
- CI-ONE-COMMAND-006
- SEC-SUPPLY-CHAIN-008
- RELEASE-REPRODUCIBLE-010

## Existing issues

## Review fixes

- [x] Require the release tag SHA to be contained in remote `master` and fail closed unless npm returns E404 for the candidate version.
- [x] Record the unpublished-package bootstrap as an owner-gated external verification dependency.

## Risk controls
- Preserve native hierarchy and evidence-first progress.
