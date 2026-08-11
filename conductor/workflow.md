# Workflow

## Solo-maintainer rules

- Required approving reviews: 0. No CODEOWNERS. No team assignment.
- Automated CI, contracts, and receipts are the merge gate.
- Fail-closed on live Substack writes, npm publish, and registry submissions.
- Windows/PowerShell agents: do not chain with `&&`; use `;`.

## Plan-only protocol

Used only when a planning-only invocation is explicitly requested.

- Confirm git status and record the starting SHA.
- Refresh upstream facts from official sources and the repository itself.
- Create/update phases, tracks, plans, metadata and task lists without starting runtime implementation.
- Open the planning PR and watch GitHub Actions.
- Fix planning-artefact failures only, then STOP.

## Implementation protocol

1. Read `AGENTS.md`, this file, and the active track plan.
2. Inspect `git status` and leave unrelated dirty work untouched.
3. Mark the active task `[~]`.
4. Implement the smallest reversible change. Keep parser, config, browser, and publish boundaries.
5. Add or update a test in the matching taxonomy modality.
6. Run `npm run verify:agent`. Expand to `npm run test:assurance` or `npm run quality` when the change warrants it.
7. Mark the task `[x]` only with commands and evidence. Do not claim hosted publish from local output.

## Track closeout

- Run the track test and required quality/security checks before marking the track complete.
- Merge the track PR (squash) after required checks are green. Human approval is not required.
- Confirm the completed track has no dirty disposable worktree and no open PR depending on it.
- Remove only merged or otherwise confirmed-unused local branches.
- Preserve the canonical worktree, active branches, unmerged branches, and any worktree containing uncommitted changes.
