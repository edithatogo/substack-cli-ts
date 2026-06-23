# Specification: Integrations, Import, Crosspost, And Token Safety

## Overview

Keep integrations, imports, cross-posting, and token workflows as probe/manual surfaces until safe endpoint captures exist. Listing integrations and redacted token metadata can remain, but destructive imports, cross-post sends, and secret-bearing token flows should not mutate state.

## Existing Implementations To Learn From

- Local: `src/substack-api/integrations.ts`, `api integrations list`, and redacted `api integrations tokens`.
- Local: existing import/crosspost commands are `--yes` guarded but should now be blocked until safe captures exist.
- External: WordPress Substack importer shows import directionality, but it is not a safe Substack admin automation contract.

## Implementation Options

- Option A: Keep existing `--yes` write commands.
- Option B: Add safe-surface reporting and block import/crosspost mutations lacking endpoint-capture evidence.
- Option C: Build full integration admin automation.

Selected option: B.

## Functional Requirements

- Expose integrations/import/crosspost/tokens as probe/manual.
- Preserve integration list and redacted token probe behavior.
- Return structured blocked results for import/crosspost writes without safe captures.

## Acceptance Criteria

- `coverage safe-surface --id integrations-import-crosspost-tokens` reports probe/manual status.
- Import and crosspost write commands block without mutation.
- Tests cover the safe-surface entry and write boundary helper.

## Out Of Scope

- Creating tokens, revealing token values, importing content, or cross-posting to external platforms.
