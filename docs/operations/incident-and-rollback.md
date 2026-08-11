# Incident, rollback, and deprecation

Live npm deprecate/unpublish and GitHub release edits remain owner-gated.

## Local dry-run

```bash
npm run release:rollback:dry-run
```

This writes `reports/release/rollback-plan.json` and does not talk to npm.

## Incident notes

- Preserve provenance, SBOM, and verification receipts.
- Do not delete tags or force-push `master`.
- Do not claim a registry or npm rollback completed from a local dry-run.

## Related

- [Trusted publishing](../release-trusted-publishing.md)
- [Release checklist](../release-checklist.md)
