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

## Remaining Work

- Decide whether to implement an actual stdio MCP server next or keep the manifest as the contract for now.
- Add tests for redaction and command parity across the exposed surface.
- Keep MCP output aligned with the CLI summaries used by the existing tracks.
