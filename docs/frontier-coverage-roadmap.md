# Frontier Coverage Roadmap

This generated roadmap is the human-readable view of the canonical Substack feature coverage matrix. It tracks the current support state, evidence, alternative execution paths, safety class, decision records, and launch/admin dependencies for every major product surface.

## Coverage Summary

| Metric | Count |
| --- | ---: |
| Capabilities | 20 |
| Validation issues | 0 |

## Status Summary

| Status | Count |
| --- | ---: |
| implemented | 8 |
| partial | 0 |
| read-only | 4 |
| probe-only | 5 |
| planning-only | 2 |
| manual-admin | 0 |
| unsupported | 1 |
| unknown | 0 |

## Domain Coverage

| Domain | Count |
| --- | ---: |
| Post/editor publishing | 2 |
| Native media | 2 |
| Live workflows | 1 |
| Creator OS | 1 |
| Notes, community, and discovery | 2 |
| Subscribers and growth | 2 |
| Analytics and revenue | 1 |
| Moderation | 2 |
| Publication/admin | 4 |
| Integrations/import/export | 1 |
| Distribution and agent surfaces | 2 |

## Capability Matrix

| Capability | Domain | Status | Primary | Fallback | Manual/Admin | Safety | Next action |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Draft, publish, and schedule posts | Post/editor publishing | implemented | cli | browser | manual-admin | write-with-confirmation | Keep browser and API transport fixtures current when Substack editor flows change. |
| Post metadata, audience, tags, sections, SEO, and social fields | Post/editor publishing | implemented | cli | browser | manual-admin | write-with-confirmation | Add endpoint evidence when Substack exposes new editor metadata fields. |
| Image media upload and Markdown image rendering | Native media | implemented | cli | browser | manual-admin | write-with-confirmation | Refresh media upload fixtures after any Substack upload contract change. |
| Native video posts, transcripts, thumbnails, clips, and podcast audio extraction | Native media | planning-only | cli | mcp-planning | manual-admin | planning-only | Capture safe dashboard traces for native video upload and transcript settings. |
| Live video, scheduled events, audience controls, recordings, and RTMP | Live workflows | planning-only | cli | mcp-planning | manual-admin | planning-only | Document manual RTMP setup and only automate after endpoint capture proves safe. |
| Campaign planning, validation, execution readiness, and reports | Creator OS | implemented | cli | local-only | manual-admin | read-only | Connect campaign coverage rows to generated roadmap output. |
| Notes create/list/get and campaign note schedule validation | Notes, community, and discovery | implemented | cli | api | manual-admin | write-with-confirmation | Keep campaign note validation aligned with post URL and schedule rules. |
| Recommendations, endorsements, digests, and Boost inspection | Notes, community, and discovery | probe-only | cli | browser | manual-admin | read-only | Capture recommendation and Boost dashboard endpoints, then decide whether write automation is appropriate. |
| Subscriber counts and subscriber list pagination | Subscribers and growth | read-only | cli | api | manual-admin | read-only | Keep exports/imports manual-admin until endpoint discovery proves safe. |
| Subscriber import, export, segments, suppression, gift, and referral flows | Subscribers and growth | probe-only | cli | browser | manual-admin | read-only | Define redacted fixtures and manual recovery paths before considering subscriber writes. |
| Post metrics, opens, clicks, read rate, growth, revenue, payouts, and taxes | Analytics and revenue | probe-only | cli | browser | manual-admin | read-only | Map dashboard-only metrics to endpoint captures or manual snapshot instructions. |
| Comments listing, replies, approve/delete/pin, and triage | Moderation | implemented | cli | api | manual-admin | write-with-confirmation | Add decision records for mute/ban/spam quarantine if endpoints remain unavailable. |
| Chat, direct messages, and live-chat moderation controls | Moderation | unsupported | n/a | n/a | manual-admin | unsupported | Keep manual/admin documentation current and revisit only if Substack publishes stable interfaces. |
| Publication settings, branding, welcome page, and checklist state | Publication/admin | read-only | cli | api | manual-admin | read-only | Keep writes manual-admin until safe update endpoints are captured. |
| Custom domain, DNS, and SSL status | Publication/admin | read-only | cli | api | manual-admin | read-only | Keep DNS mutation and registrar actions manual/admin. |
| Payments, subscription tiers, payouts, taxes, and paid publication setup | Publication/admin | probe-only | cli | browser | manual-admin | read-only | Maintain checklist-only support and avoid collecting payment/tax secrets. |
| Team member list and role visibility | Publication/admin | read-only | cli | api | manual-admin | read-only | Keep invite/remove/role changes manual-admin until safe endpoints are captured. |
| WordPress/RSS imports, cross-posting, YouTube connection, podcast distribution, and tokens | Integrations/import/export | probe-only | cli | browser | manual-admin | read-only | Add endpoint-capture records for each integration before write automation. |
| npm package, GitHub release metadata, provenance, changelog, and rollback notes | Distribution and agent surfaces | implemented | cli | manual-admin | manual-admin | external-gate | Require live npm publish and release actions to remain explicit owner/admin gates. |
| MCP registry, VS Code, Copilot, Claude, Gemini, and Codex setup verification | Distribution and agent surfaces | implemented | cli | manual-admin | manual-admin | external-gate | Keep marketplace/registry submission as external gates until authenticated publisher credentials are available. |

## Decision Records

### DR-native-video-capture

- Capability: Native video posts, transcripts, thumbnails, clips, and podcast audio extraction
- Status: planning-only
- Reason: Native video upload automation remains capture-first until dashboard endpoint contracts are verified with redacted fixtures.
- Next review: before marking this capability implemented

### DR-live-video-capture

- Capability: Live video, scheduled events, audience controls, recordings, and RTMP
- Status: planning-only
- Reason: Live video uses planning-only coverage because stream keys, audience gates, co-hosting, chat, and recordings are account/live-session sensitive.
- Next review: before marking this capability implemented

### DR-recommendations-boost

- Capability: Recommendations, endorsements, digests, and Boost inspection
- Status: probe-only
- Reason: Recommendations and Boost write/configuration endpoints are dashboard-gated; CLI coverage is inspection and diagnostics until safe endpoints are discovered.
- Next review: before marking this capability implemented

### DR-subscriber-admin

- Capability: Subscriber import, export, segments, suppression, gift, and referral flows
- Status: probe-only
- Reason: Subscriber mutation and export workflows are privacy-sensitive and remain manual/admin until endpoints and redaction rules are verified.
- Next review: before marking this capability implemented

### DR-analytics-dashboard

- Capability: Post metrics, opens, clicks, read rate, growth, revenue, payouts, and taxes
- Status: probe-only
- Reason: Many analytics and revenue views are dashboard-only; CLI coverage remains probe/read diagnostics plus local snapshots until contracts are verified.
- Next review: before marking this capability implemented

### DR-chat-dm-app-only

- Capability: Chat, direct messages, and live-chat moderation controls
- Status: unsupported
- Reason: Chat and DM surfaces are app/WebSocket oriented and are not safe CLI automation targets without a public contract.
- Next review: before marking this capability implemented

### DR-payments-admin

- Capability: Payments, subscription tiers, payouts, taxes, and paid publication setup
- Status: probe-only
- Reason: Payment and tax setup remains admin/manual because it involves sensitive account, tax, and payout data.
- Next review: before marking this capability implemented

### DR-integrations-admin

- Capability: WordPress/RSS imports, cross-posting, YouTube connection, podcast distribution, and tokens
- Status: probe-only
- Reason: Import, cross-post, and token workflows can be destructive or secret-bearing; unsupported endpoints remain probe/manual until verified.
- Next review: before marking this capability implemented


## Launch/Admin Gates

| Capability | Gate | Next action |
| --- | --- | --- |
| Subscriber import, export, segments, suppression, gift, and referral flows | Publication owner/admin access may be required for exports, imports, and segment changes. | Define redacted fixtures and manual recovery paths before considering subscriber writes. |
| Custom domain, DNS, and SSL status | Publication owner and DNS registrar credentials are external gates. | Keep DNS mutation and registrar actions manual/admin. |
| Payments, subscription tiers, payouts, taxes, and paid publication setup | Publication owner/admin must complete payment and tax setup. | Maintain checklist-only support and avoid collecting payment/tax secrets. |
| npm package, GitHub release metadata, provenance, changelog, and rollback notes | npm and GitHub release credentials are external gates. | Require live npm publish and release actions to remain explicit owner/admin gates. |
| MCP registry, VS Code, Copilot, Claude, Gemini, and Codex setup verification | Registry and client marketplace accounts are external gates. | Keep marketplace/registry submission as external gates until authenticated publisher credentials are available. |

## Maintenance Rules

- Refresh official Substack support-page evidence before marking a frontier feature implemented.
- Treat undocumented endpoints as capture-first until redacted fixtures and safety boundaries exist.
- Keep MCP coverage read-only or planning-only unless the CLI already exposes an explicitly confirmed write path.
- Do not mark probe-only, planning-only, or manual/admin rows as implemented without replacing the decision record with concrete evidence.
