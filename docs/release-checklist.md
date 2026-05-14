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
9. Publish the tag and confirm the GitHub Release is created
