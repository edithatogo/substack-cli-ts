# GitHub Project policy

Project [#38](https://github.com/users/edithatogo/projects/38) is the hosted view of the Conductor programme. Conductor contracts and track artifacts remain the scope source of truth; issue relationships, Project fields, pull requests, checks, comments, and receipts are evidence.

## Hierarchy

- Programme issue #184 owns phase issues.
- Each phase owns its track issues.
- Canonical P00-P11 and P18 tracks own task issues from the maturity contract.
- Supplemental tracks own phase issues matching their approved Conductor plans.
- Duplicate records are detached and closed as not planned; they are never deleted to manufacture clean history.
- Issue types are not enabled on this user-owned repository; use `conductor`, `conductor-phase`, `conductor-track`, and `conductor-task` labels instead. No milestones are in use.

## Automation

- Project #38 is linked to `edithatogo/substack-cli-ts` and uses GitHub's enabled native workflows: `Auto-add sub-issues to project`, `Item added to project`, `Item closed`, `Pull request merged`, `Auto-close issue`, and `Pull request linked to issue`.
- Nested children therefore join the Project without a repository PAT. GraphQL can list and delete Project workflows but cannot create the missing native `Auto-add to project` (on issue open) workflow.
- The repository workflow `Add issues to programme project` adds newly opened, reopened, or transferred issues to Project #38 with `PROGRAMME_PROJECT_TOKEN`.
- The repository workflow `GitHub Programme Drift` checks the complete native issue hierarchy on pull requests, pushes to `master`, a daily schedule, and manual dispatch.
- Project fields and enabled native workflows are captured in `conductor/github-programme.json`; changes require a new hosted receipt because the Actions `GITHUB_TOKEN` is intentionally not granted user-Project administration.
- The Project `Reviewers` field stays unused. Do not add CODEOWNERS or required human reviewers.

## Solo-maintainer controls

- No second-person review, CODEOWNERS approval, or fictional sign-off is required.
- Required automated checks, resolved actionable comments, squash merge, linear history, and evidence receipts remain mandatory.
- External credentials, publication, registry acceptance, and release authority remain explicit gates.
