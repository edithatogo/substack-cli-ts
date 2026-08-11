## Summary

Describe the focused change and why it is needed.

## Conductor and contracts

- Track/task or issue:
- Contract identifiers:

## Risk and external effects

- [ ] No credentials, browser state, private content, traces, or generated secrets are committed.
- [ ] Live writes, releases, registry submissions, and other external effects are identified and authorized.
- [ ] AI assistance is disclosed where material and its output has been reviewed.

## Validation

List the exact commands and hosted checks used as evidence. Human approval is not required.

```powershell
npm run verify:agent
```

Scoped alternative (say why the full gate was deferred):

- [ ] `npm run verify:agent` or a documented scoped equivalent passed.
- [ ] Tests cover the changed behavior and relevant regression risks.
- [ ] Generated artifacts, contracts, and documentation are synchronized.
- [ ] All actionable workflow, review, and issue comments have been addressed.

Required reviewers: **0**. Do not add CODEOWNERS or a review count.
