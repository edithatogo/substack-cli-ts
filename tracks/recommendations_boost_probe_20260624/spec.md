# Specification: Recommendations And Boost Probe-Only Coverage

## Overview

Keep Recommendations and Boost as probe-only discovery surfaces. The CLI should help users inspect availability, capture diagnostics, and understand manual next steps without creating recommendations, changing Boost settings, or spending promotional budget.

## Existing Implementations To Learn From

- Local: `src/creator/community.ts` probes recommendations and Boost endpoints with graceful `not-found` handling.
- Local: `recommendations inspect` and `boost inspect` expose read/probe diagnostics.
- External: unofficial API wrappers mention recommendations reads, but no safe Boost write workflow is established.

## Implementation Options

- Option A: Leave existing probe commands as-is.
- Option B: Add canonical safe-surface reporting and MCP-visible decision data.
- Option C: Add write/configuration automation behind `--yes`.

Selected option: B. Writes remain out of scope.

## Functional Requirements

- Expose Recommendations/Boost as `probe-only` in the safe-surface registry.
- Document existing probe commands and manual admin next steps.
- Provide endpoint-capture requirements before any future status upgrade.

## Acceptance Criteria

- `coverage safe-surface --id recommendations-boost-probe` reports probe-only status.
- Tests prove probe-only status, manual path, and no write commands are advertised.

## Out Of Scope

- Creating recommendation relationships, editing Boost settings, configuring paid promotions, or initiating paid spend.
