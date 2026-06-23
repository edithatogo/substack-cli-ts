# Specification: Subscriber Import, Export, And Segments Safety

## Overview

Treat subscriber import, export, segmentation, suppression, gifts, and referral workflows as privacy-sensitive manual/admin surfaces. Existing subscriber count and paginated list probes remain available, but bulk export/import and segment mutations must not be automated without endpoint captures, redaction rules, and recovery paths.

## Existing Implementations To Learn From

- Local: `api subscriber count` and `api subscriber list` provide read-only visibility.
- Local: frontier coverage already marks subscriber import/export/segments as probe-only.
- External: issue-level proposals and gists describe subscriber export workflows, but they do not establish privacy-safe contracts for this CLI.

## Implementation Options

- Option A: Leave unsupported workflows undocumented beyond the coverage matrix.
- Option B: Add safe-surface reporting with privacy controls, manual path, and capture requirements.
- Option C: Add CSV export/import commands behind `--yes`.

Selected option: B. Bulk subscriber movement remains manual/admin.

## Functional Requirements

- Expose a safe-surface report entry for subscriber import/export/segments.
- Include privacy hazards, allowed read-only commands, and blocked operations.
- Do not add broad subscriber export/import/segment write tools.

## Acceptance Criteria

- `coverage safe-surface --id subscriber-import-export-segments` reports `manual-admin`.
- Tests verify the privacy risk and blocked-operation list.

## Out Of Scope

- Exporting subscriber PII, importing CSVs, segment mutation, gift subscriptions, referral edits, or suppression-list writes.
