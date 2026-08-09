# Release Checklist

Before cutting a release:

See [Trusted publishing and release recovery](release-trusted-publishing.md). Live npm, tag, release, deprecation, and account-policy actions remain owner-gated.

1. Run `npm test`
2. Run `npm run test:coverage` and confirm Codecov uploads successfully
3. Run `npm run quality`
4. Run `npm run smoke` (or `npm run test -- src/test/smoke.test.ts`)
5. Run `npm run bench` if parser or formatting changes are significant
6. Confirm `git status` is clean
7. Verify the GitHub Actions checks are green
8. Verify the release notes and npm version are correct
9. Run `npm pack --dry-run --json` and verify the package only includes `dist/`, metadata, docs, and registry metadata
10. Run `npm run version:release -- vX.Y.Z` for a version not already published to npm
11. Confirm npm trusted publishing names workflow `publish.yml`; do not configure `NPM_TOKEN`
12. Push the tag and confirm the workflow publishes the exact tested tarball with attestations
13. Confirm npm publication of `@edithatogo/substack-publisher` and run the SLSA Verification workflow
14. Submit/update MCP registry and Smithery metadata for the published version
15. For feature releases that change command options, MCP tools, JSON artifacts, run-log actions, or safe-surface status, update the API contract/versioning artifacts described in [Creator OS Completion and Hardening Roadmap](creator-os-completion-roadmap.md)
