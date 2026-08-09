# Requirements

## Must have

- **MUST-01 Canonical hierarchy:** One programme issue owns every registered phase; every phase owns its tracks; every track owns canonical tasks or supplemental plan phases.
- **MUST-02 Reuse history:** Retain completed issue lineages and close redundant bootstrap records as not planned without deletion.
- **MUST-03 Bidirectional mapping:** Store hosted issue numbers in canonical contract/traceability and supplemental Conductor configuration.
- **MUST-04 Drift prevention:** Validate titles, issue numbers, parent relationships, and duplicate identifiers on PR, `master`, schedule, and dispatch.
- **MUST-05 Project automation:** Preserve the enabled native auto-add-subissues workflow and the full Project governance field set.
- **MUST-06 Least privilege:** Use repository read permissions in CI and do not require a Project PAT for routine hierarchy checks.
- **MUST-07 Regeneration safety:** Canonical refresh tooling must preserve existing issue mappings and hosted evidence.
- **MUST-08 Solo maintainer:** Require automated evidence and actionable-comment resolution, not second-person approval.
- **MUST-09 Traceability:** Link P17 #497, T17-01 #498, child issues #499-#502, Project #38, commits, notes, PR, checks, comments, merge, archive, and cleanup.

## Should have

- **SHOULD-01 Daily warning:** Detect hosted hierarchy drift within 24 hours.
- **SHOULD-02 Native features:** Prefer GitHub native subissues, parent progress, linked PR, and Project automation fields over duplicate custom state.
- **SHOULD-03 Durable receipt:** Capture Project fields, workflows, item count, and reconciliation decisions in versioned evidence.

## Could have

- **COULD-01 Project API validation:** Add a narrowly scoped Project token later for hosted field/workflow drift checks from Actions.

## Won't have in this track

- Mandatory human reviewers, broad write tokens in CI, issue deletion, automatic issue mutation from untrusted pull requests, or claims that external gates have passed.
