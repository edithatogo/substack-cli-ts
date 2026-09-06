1. Update `src/substack-api/draft-lookup.test.ts` to add a test for unhandled exceptions in `buildDraftDuplicateLookupReport`.
2. The test will provide an invalid `ProseMirrorNode` (e.g., with an unsupported type like `"unsupportedNode"`) in the `post` input. This will cause `buildSubstackDraftPayload` to throw an error.
3. Verify that `assert.throws` catches the expected `Error` with the message containing "Unsupported Substack payload content".
4. Run tests to ensure the new test passes and coverage is improved.
5. Complete pre commit steps to make sure proper testing, verifications, reviews and reflections are done.
6. Submit the change with a descriptive title and description.
