# Specification: Publication Admin Manual Write Boundary

## Overview

Make publication admin writes explicitly manual/admin for settings, domains, payments, payouts, taxes, and team membership. Read-only probes can remain, but write commands should not mutate admin state without future endpoint-capture evidence and a separate review.

## Existing Implementations To Learn From

- Local: publication, domain, billing, and team read/probe commands already exist.
- Local: some admin write commands are guarded by `--yes`; this track adds a stronger manual/admin boundary for the requested scope.
- External: unofficial implementations do not provide a safe settings/domain/payments/team write contract.

## Implementation Options

- Option A: Rely on existing `--yes` confirmations.
- Option B: Add safe-surface reporting and block admin writes lacking capture evidence.
- Option C: Expand admin write automation.

Selected option: B.

## Functional Requirements

- Expose publication admin writes as manual/admin.
- Preserve read-only probes for settings, domain, billing, and team list.
- Return structured blocked results for publication admin writes that lack capture evidence.

## Acceptance Criteria

- `coverage safe-surface --id publication-admin-writes` reports manual-admin status.
- Publication settings/logo/favicon write commands block without mutation.
- Tests cover the manual/admin report and write boundary helper.

## Out Of Scope

- Settings writes, DNS changes, payment/tax setup, payout changes, team invites/removals, or role changes.
