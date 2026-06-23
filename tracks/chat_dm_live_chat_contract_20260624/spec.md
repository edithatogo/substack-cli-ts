# Specification: Chat, DM, And Live Chat Contract Boundary

## Overview

Keep chat, DM, and live-chat automation unsupported unless Substack publishes a stable public contract or a safe read-only endpoint capture exists. The CLI should provide an explicit status report and manual moderation guidance rather than WebSocket scraping or message automation.

## Existing Implementations To Learn From

- Local: frontier coverage marks chat/DM/live chat as unsupported.
- External: unofficial libraries mention subscriber chats and threads, but no public contract suitable for safe CLI automation was found.

## Implementation Options

- Option A: Leave as a static coverage matrix row.
- Option B: Add safe-surface reporting with contract requirements and manual alternatives.
- Option C: Attempt WebSocket capture and replay.

Selected option: B. WebSocket capture/replay remains out of scope.

## Functional Requirements

- Expose chat/DM/live chat as unsupported.
- Include public-contract requirements and manual moderation path.
- Make unsupported status visible from CLI and MCP-safe reporting.

## Acceptance Criteria

- `coverage safe-surface --id chat-dm-live-chat` reports unsupported status.
- Tests verify no executable write/read automation is advertised.

## Out Of Scope

- Reading private chats, sending DMs, moderating live chat, WebSocket scraping, or notification automation.
