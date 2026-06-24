# Release Checklist

Before cutting a release:

1. Run `npm test`
2. Run `npm run test:coverage` and confirm Codecov uploads successfully
3. Run `npm run quality`
4. Run `npm run smoke` (or `npm run test -- src/test/smoke.test.ts`)
5. Run `npm run bench` if parser or formatting changes are significant
6. Confirm `git status` is clean
7. Verify the GitHub Actions checks are green
8. Verify the release notes and npm version are correct
9. Run `npm pack --dry-run --json` and verify the package only includes `dist/`, metadata, docs, and registry metadata
10. Bump `package.json` to a version that has not already been published to npm
11. Publish the tag and confirm the GitHub Release is created
12. Confirm npm publication of `@edithatogo/substack-cli`
13. Submit/update MCP registry and Smithery metadata for the published version
14. For feature releases that change command options, MCP tools, JSON artifacts, run-log actions, or safe-surface status, update the API contract/versioning artifacts described in [Creator OS Completion and Hardening Roadmap](creator-os-completion-roadmap.md)
