# Workflow

## Plan-only protocol
- Confirm git status and record the starting SHA.
- Refresh upstream facts from official sources and the repository itself.
- Install/update Conductor using the current official supported mechanism and run brownfield setup.
- Create the canonical contract and traceability system.
- Create/update all phases, tracks, plans, metadata and task lists.
- Create the nested GitHub issue hierarchy and project.
- Open the planning PR.
- Run and watch GitHub Actions with gh pr checks --watch or the current equivalent.
- Fix planning-artefact failures only; do not begin runtime implementation.
- Post a planning receipt and STOP.

## Track closeout
- Run the track test and required quality/security checks before marking the track complete.
- Merge the track PR and inspect all workflow, review, and issue comments.
- Confirm the completed track has no dirty disposable worktree and no open PR depending on it.
- Remove the completed track worktree, prune stale worktree metadata, and delete only merged or otherwise confirmed-unused local branches.
- Preserve the canonical worktree, active branches, unmerged branches, and any worktree containing uncommitted changes.
