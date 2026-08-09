# Trusted publishing and release recovery

## One-time owner configuration

Configure npm trusted publishing for `@edithatogo/substack-publisher` with:

- provider: GitHub Actions
- repository: `edithatogo/substack-cli-ts`
- workflow: `publish.yml`
- allowed action: `npm publish`

After one successful OIDC release, restrict token-based publishing and revoke the obsolete automation token. These npm account operations remain owner-gated and cannot be claimed complete from repository code alone.

As of the T09-03 implementation review, the package name is not yet present on npm. The owner must claim or bootstrap the package using npm's current authenticated package flow before its package settings can be used to configure `publish.yml` as the trusted publisher. Any bootstrap publication must use interactive 2FA, publish the exact verified tarball, and be recorded as external evidence; it must not introduce a stored CI token.

## Release flow

1. Select a version that does not exist on npm and synchronize it with `npm run version:sync`.
2. Run `npm run version:release -- vX.Y.Z` and the normal quality suite.
3. Push the verified `vX.Y.Z` tag.
4. The workflow proves the tag commit is contained in remote `master` and the version is absent from npm.
5. The build job creates one tarball, clean-installs it, emits checksums/SBOM/receipt, and uploads those immutable inputs.
6. The publish job downloads the same tarball, verifies its checksum, creates build and SBOM attestations, publishes that file using OIDC, and attaches the same evidence to the GitHub release.
7. Confirm the follow-up SLSA Verification workflow passes.

## Rollback drill

Run `npm run release:rollback:dry-run -- X.Y.Z` to generate `reports/release/rollback-plan.json`. The owner selects a verified last-known-good version, deprecates rather than broadly unpublishes the affected package, marks the GitHub release as withdrawn/prerelease, updates registry listings, and publishes a corrected semver release.
