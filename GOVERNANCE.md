# Governance

This is a solo-maintainer repository. Automated quality, security, contract, and supply-chain gates replace mandatory second-person approval.

## Change policy

- Use focused pull requests against `master`.
- Require the active default-branch ruleset and its stable automated checks.
- Require zero human approvals, no CODEOWNERS approval, and no team assignment.
- Resolve actionable workflow, review, and issue comments before merging.
- Use squash merges and delete merged topic branches.
- Record Conductor task commits with Git notes and preserve hosted receipts.

## Recovery

Force pushes and default-branch deletion are prohibited. If a repository-setting failure prevents urgent recovery, the owner may temporarily disable the minimum necessary rule, record the reason and timestamps in an incident receipt, restore enforcement immediately afterward, and run the complete required suite.

## External actions

Releases, package publication, registry submissions, live publication writes, app installation, and credential-bearing actions require explicit authorization and verifiable receipts.
