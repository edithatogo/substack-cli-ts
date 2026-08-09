# Track T17-01: Reconcile Conductor issues and GitHub Project automation

## Overview

Reconcile every registered Conductor phase and track with one canonical native GitHub hierarchy, preserve supplemental track phases as nested issues, capture the existing Project #38 configuration, and add deterministic drift detection without requiring a personal access token in CI.

## Acceptance criteria

- P00/P01 duplicate bootstrap records are detached and closed without deleting history.
- P00-P11 contract phases, tracks, and tasks match one canonical nested issue lineage.
- P13-P17 supplemental phases, tracks, and plan phases are nested below programme issue #184.
- Project #38 contains the complete hierarchy through its enabled native auto-add-subissues workflow and retains all governance fields.
- Pull requests, pushes to `master`, daily schedules, and manual dispatch validate hierarchy drift read-only.
- Canonical refresh tooling preserves issue mappings.

## Out of scope

- Replacing native Project workflows with a PAT-backed repository Action.
- Reopening completed implementation tracks.
- Treating Project status as evidence of external publication or registry acceptance.
