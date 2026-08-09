# Requirements T09-03

## Must

- Use npm trusted publishing through GitHub OIDC without a long-lived publishing token.
- Build, test, checksum, attest, publish, and release the same npm tarball.
- Generate machine-readable clean-install and rollback receipts.
- Keep package, tag, contract, and registry versions synchronized.
- Remove repository-relative dependencies from the public package.
- Preserve live publication and npm account changes as explicit owner gates.

## Should

- Attach SPDX and CycloneDX SBOMs to each GitHub release.
- Verify published attestations in a follow-up workflow.
- Prefer deprecation and corrective releases over broad unpublish operations.

## Could

- Add staged npm publishing after owner configuration and operational experience.

## Won't

- Publish, tag, revoke credentials, deprecate packages, or change npm account settings during implementation.
