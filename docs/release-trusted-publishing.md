# Trusted publishing and release recovery

## One-time owner configuration

Configure npm trusted publishing for `@edithatogo/substack-publisher` with:

- provider: GitHub Actions
- repository: `edithatogo/substack-cli-ts`
- workflow: `publish.yml`
- allowed action: `npm publish`

After one successful OIDC release, restrict token-based publishing and revoke the obsolete automation token. These npm account operations remain owner-gated and cannot be claimed complete from repository code alone.

## Release flow

1. Select a version that does not exist on npm and synchronize it with `npm run version:sync`.
2. Run `npm run version:release -- vX.Y.Z` and the normal quality suite.
3. Push the verified `vX.Y.Z` tag.
4. The build job creates one tarball, clean-installs it, emits checksums/SBOM/receipt, and uploads those immutable inputs.
5. The publish job downloads the same tarball, verifies its checksum, creates build and SBOM attestations, publishes that file using OIDC, and attaches the same evidence to the GitHub release.
6. Confirm the follow-up SLSA Verification workflow passes.

## Rollback drill

Run `npm run release:rollback:dry-run -- X.Y.Z` to generate `reports/release/rollback-plan.json`. The owner selects a verified last-known-good version, deprecates rather than broadly unpublishes the affected package, marks the GitHub release as withdrawn/prerelease, updates registry listings, and publishes a corrected semver release.
