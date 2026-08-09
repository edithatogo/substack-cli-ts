# GitHub Project policy

Project [#38](https://github.com/users/edithatogo/projects/38) is the hosted view of the Conductor programme. Conductor contracts and track artifacts remain the scope source of truth; issue relationships, Project fields, pull requests, checks, comments, and receipts are evidence.

## Hierarchy

- Programme issue #184 owns phase issues.
- Each phase owns its track issues.
- Canonical P00-P11 tracks own task issues from the maturity contract.
- Supplemental tracks own phase issues matching their approved Conductor plans.
- Duplicate records are detached and closed as not planned; they are never deleted to manufacture clean history.

## Automation

- Project #38 uses GitHub's enabled native `Auto-add sub-issues to project` workflow, so nested children do not require a broad repository or Project personal access token.
- The repository workflow `GitHub Programme Drift` checks the complete native issue hierarchy on pull requests, pushes to `master`, a daily schedule, and manual dispatch.
- Project fields and enabled native workflows are captured in `conductor/github-programme.json`; changes require a new hosted receipt because the Actions `GITHUB_TOKEN` is intentionally not granted user-Project administration.

## Solo-maintainer controls

- No second-person review, CODEOWNERS approval, or fictional sign-off is required.
- Required automated checks, resolved actionable comments, squash merge, linear history, and evidence receipts remain mandatory.
- External credentials, publication, registry acceptance, and release authority remain explicit gates.
