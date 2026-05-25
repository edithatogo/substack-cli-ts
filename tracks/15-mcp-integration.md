# Track 15: MCP Integration

## Goal

Expose the existing CLI capabilities through MCP so other local tools and agents can inspect, validate, and orchestrate Substack workflows without reimplementing the project logic.

## Scope

- Define the MCP surface for read-only inventory, schema inspection, and workflow review commands.
- Reuse existing CLI modules rather than duplicating Substack-specific logic.
- Keep secrets, browser sessions, and local state on the CLI side, not in MCP payloads.
- Prefer stable, typed responses that match the current track outputs.

## Dependencies

- Track 07 API Read Model.
- Track 08 API Draft Write Model.
- Track 11 API Prepublish, Publish, and Schedule.
- Track 14 Quality, CI, and Automation.

## Blocks

- None yet. This is a packaging and integration track, not a new Substack capability.

## Acceptance Criteria

- MCP exposes the key read and review flows used by the CLI.
- MCP commands return redacted summaries, not raw secrets or browser session material.
- MCP behavior is covered by tests and follows the same policy checks as the CLI.

## Current Progress

- Added to the roadmap as the tail track.
- Defined an initial redacted MCP surface manifest with `mcp surface`.
- Added `mcp summary` to print the redacted MCP summary resource.
- Added `api draft contract` as a redacted contract-inference helper for captured draft traffic.
- Added `api draft contract-matrix` as a redacted multi-capture contract aggregation helper.
- Added `api draft contract-matrix-compare` as a redacted matrix fixture comparison helper.
- Added `api draft duplicates` as a redacted duplicate lookup helper over the read inventory and local mappings.
- Added `api draft section` as a redacted section resolution helper over the read inventory.
- Added `api draft inspect` as a redacted composite draft inspection helper.
- Implemented a stdio MCP server with redacted read, review, and capture tools.
- Added read-only MCP resources for the manifest and redacted summary.
- Added redacted MCP prompts for surface overview and workflow review guidance.

## Alignment Audit (May 2026)

Audit results comparing the MCP tool surface against the CLI command surface:

| CLI Command      | MCP Equivalent          | Status |
|------------------|-------------------------|--------|
| `api inventory`  | `api.inventory`         | ✓      |
| `api auth status`| `api.auth.status`       | ✓      |
| `api media`      | `api.media`             | ✓ Added |
| `schema validate`| `schema.validate`       | ✓      |
| `trace review`   | `trace.review`          | ✓      |
| `trace compare`  | `trace.compare`         | ✓      |
| `policy`         | `policy`                | ✓      |
| `doctor`         | `doctor`                | ✓ Added |
| `api draft contract` | `api.draft.contract` | ✓      |
| `api draft inspect`   | `api.draft.inspect`   | ✓      |
| `api draft duplicates`| `api.draft.duplicates`| ✓      |
| `api draft section`   | `api.draft.section`   | ✓      |
| `api draft review`    | `api.draft.review`    | ✓      |
| `api draft compare`   | `api.draft.compare`   | ✓      |
| `api draft fixture`    | `api.draft.fixture`   | ✓      |
| `api draft contract-matrix` | `api.draft.contract.matrix` | ✓ |
| `api draft contract-matrix-compare` | `api.draft.contract.matrix.compare` | ✓ |
| `api payload`                       | `api.payload`                   | ❌ Not added |

**Key read/review flows**: All inventory, schema inspection, trace review, policy, diagnostics, and media inspection flows are covered.

**Write flows excluded intentionally**: `publish`, `schedule`, `draft`, `api draft create`, `api draft link`, `api draft observe`, `config set-*`, `auth login/logout`, `debug *` — these require interactive or write access and are intentionally kept out of MCP.

**Read flows not yet covered**:
- `api payload <file>` — builds the Substack draft payload from a Markdown file without network access. Currently CLI-only. Candidate for an MCP `review`-group tool (`api.payload`). Low priority since the same information is available through `api draft inspect` and `schema validate` which already have MCP equivalents.

## Maintenance Notes

- Keep the surface intentionally narrow around tools, read-only resources, and redacted prompts.
- Keep MCP output aligned with the CLI summaries used by the existing tracks.
