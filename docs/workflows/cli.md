# CLI Workflow

Use this workflow when changing command behavior, parsing, auth, publish planning, or workflow traces.

## Sequence

1. Update the smallest shared module that owns the behavior.
2. Add or adjust a command in `src/cli.ts` only if the behavior needs a user-facing entrypoint.
3. Add focused tests beside the implementation.
4. Update the relevant track file and `README.md` examples.
5. Run `npm run quality` and `npm run scan:secrets`.

## Common Checks

- `inspect` and `schema` commands should remain local and deterministic.
- `prepublish`, `publish`, and `schedule` must stay confirmation-gated.
- Do not write secrets or session values into trace artifacts or stdout.

## Useful References

- `workflow.md`
- `tracks/01-editor-schema-mapping.md`
- `tracks/03-draft-publish-schedule.md`
- `tracks/11-api-prepublish-publish-schedule.md`
