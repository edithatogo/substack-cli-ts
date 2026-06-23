# Specification: Native Video And Live Automation Safety

## Overview

Make native video and live/RTMP workflows operationally useful without performing unsafe uploads, event creation, stream-key reads, or live-chat mutations. The CLI should expose planning, diagnostics, endpoint-capture requirements, and manual runbooks until redacted dashboard captures prove safe endpoint contracts.

## Existing Implementations To Learn From

- Local: `src/creator/media-plan.ts`, `media video plan`, `media audio plan`, and `live plan` already provide planning-only behavior.
- Local: `src/substack-api/podcast.ts` has experimental podcast/video endpoints that must not be treated as safe native video/live automation without capture evidence.
- External: unofficial Substack libraries mostly cover posts, profiles, podcasts, recommendations, and subscriber/chat reads; none establish a safe native video/live write contract.

## Implementation Options

- Option A: Keep only existing planning commands and document the boundary.
- Option B: Add a canonical safe-surface registry/report that makes the planning-only decision inspectable by CLI and MCP.
- Option C: Attempt video/live endpoint automation from inferred dashboard routes.

Selected option: B. It creates reusable evidence and guardrails while avoiding unsafe writes.

## Functional Requirements

- Provide a canonical report entry for native video/live safety status.
- Include manual runbook steps, endpoint-capture prerequisites, and unsupported operations.
- Gate unsafe native video upload or live automation paths unless future endpoint-capture evidence is explicitly added.
- Keep `media video plan`, `media audio plan`, and `live plan` local-first and dry-run oriented.

## Acceptance Criteria

- `coverage safe-surfaces` includes the native video/live surface as `planning-only`.
- Unsafe video/live writes return a structured blocked result instead of mutating Substack.
- Unit and smoke tests cover the surface report and write boundary.

## Out Of Scope

- Uploading native videos, creating live events, retrieving stream keys, or moderating live chat.
