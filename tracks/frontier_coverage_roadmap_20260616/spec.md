# Track 42: Frontier Coverage Roadmap

## Overview

Create a comprehensive, evidence-backed roadmap that defines what "100% Substack CLI feature coverage" means for this repository and turns that roadmap into durable repo artifacts, validation tooling, first-wave implementation tasks, launch/admin checklists, and ongoing drift monitoring.

This track must build on Track 41 Creator OS instead of duplicating it. Track 41 added campaign planning, media/live planning, analytics snapshots, growth reports, community triage, and read-only MCP creator tools. This track defines the canonical coverage system around all current and future Substack surfaces, including multiple execution paths and external launch/admin follow-through.

"100% coverage" does not mean unsafe or undocumented writes must be automated. It means every known Substack capability has an explicit coverage state, evidence trail, supported path, fallback/manual path, and decision record when automation is not safe or not currently possible.

## Goals

- Establish a canonical Substack feature coverage matrix across CLI, MCP, browser/API automation, manual/admin flows, tests, docs, run logs, and launch readiness.
- Require multiple ways of doing meaningful work: primary path, fallback path, and documented manual/admin path.
- Prioritize fragile, authenticated, destructive, and external-gate workflows for stronger fallback coverage.
- Add launch/admin follow-through for npm, GitHub releases, MCP registry, client integrations, Substack account/admin setup, and operational support.
- Add first-wave implementation tasks for the highest-value missing or under-evidenced capabilities.
- Add evidence and drift-monitoring rules so completed tracks do not become stale as Substack changes.

## Functional Requirements

### 1. Canonical Coverage Matrix

Create a machine-readable and human-readable coverage matrix that inventories Substack capabilities by domain:

- Post/editor publishing: drafts, updates, publish, schedule, audience, tags, sections, SEO/social metadata, canonical URLs, embeds, paywalls, subscribe widgets, equations, teaser/preview behavior, and title testing.
- Native media: images, video posts, video uploads, transcripts, thumbnails, clips, audio extraction to podcast RSS, podcast episode flows, recording studio, TV/app playback considerations, and upload limits/diagnostics.
- Live workflows: mobile live video, desktop live video, RTMP stream keys, scheduled live events, audience selection, co-hosting, chat controls, recordings-as-drafts, and live-stat limitations.
- Creator OS/campaign workflows: campaign planning, notes scheduling, channel planning, UTM generation, run logs, campaign reports, growth snapshots, and trend analysis.
- Notes/community/discovery: Notes create/list/get, media notes, restacks, reply controls, following, profile visibility, recommendations, endorsements, digests, Boost, chat/DM surfaces, and app-only surfaces.
- Subscribers and growth: subscriber count/list/export/import, segments, suppression, gift/referral flows, attribution, network growth, source breakdowns, paid/free deltas, and retention.
- Analytics/revenue: post metrics, opens, delivery, clicks, read/view rate, traffic sources, Notes stats, growth page, earnings, retention, revenue, payouts, taxes, and unsupported dashboard-only endpoints.
- Moderation: comments list/reply/approve/delete/pin, spam/quarantine, mute/ban, chat moderation, live chat controls, and reply-locking.
- Publication/admin: settings, branding, welcome page, category/leaderboard, domain/DNS/SSL, payments, subscription tiers, team roles, permissions, support contact paths, and publication checklist state.
- Integrations/import/export: WordPress, RSS, Ghost/platform migration, cross-posting, YouTube connection, podcast distribution, API tokens, and third-party social channels.
- Distribution and agent surfaces: npm package, GitHub release/provenance, MCP registry, VS Code, Copilot, Claude, Gemini, Codex, docs, support, security, and rollback paths.

Each matrix row must include:

- Capability name and Substack domain.
- Current repo status: implemented, partial, read-only, probe-only, planning-only, manual/admin, unsupported, or unknown.
- Available paths: CLI, MCP read-only/planning, API, browser, local-only, manual/admin, external service.
- Primary path, fallback path, and manual/admin path.
- Safety classification: read-only, planning-only, write-with-confirmation, destructive, credential-sensitive, external-gate, or unsupported.
- Evidence links: source files, tests, docs, fixtures, run logs, live validation notes, official docs, endpoint captures, or decision records.
- Missing evidence and recommended next action.
- Owner/admin dependency when the agent cannot complete the step alone.

### 2. Strict Evidence Standard

A capability may only be marked covered when it has:

- CLI support or a documented reason no CLI path is appropriate.
- MCP-safe planning/read-only support where useful, without unsafe write tools.
- Browser/API/local/manual fallback as appropriate.
- Tests or explicit manual validation steps.
- Docs or examples.
- Run-log diagnostics for operational workflows.
- Official-doc or endpoint-capture evidence for Substack-specific behavior.
- An unsupported-feature decision record when automation is not safe or the endpoint is unavailable.

### 3. Multiple Execution Paths

Apply all three path strategies:

- Universal alternatives: every meaningful capability must name a primary path, fallback path, and manual/admin path.
- Risk-based alternatives: destructive, authenticated, external, dashboard-only, and private-endpoint workflows require stronger fallback and recovery coverage.
- Launch-first alternatives: npm/MCP/client setup, publishing, media/live, analytics, and admin gates receive first implementation priority.

### 4. First Implementation Wave

Implement the first wave of roadmap infrastructure, not just prose:

- Add coverage matrix artifacts under documentation or track-owned coverage paths.
- Add validation tooling that fails when matrix rows lack status, evidence, fallback, or decision-record fields.
- Add generated human-readable roadmap output from the machine-readable matrix.
- Add gap decision record templates for unsupported or capture-first surfaces.
- Add launch/admin checklist artifacts.
- Add run-log action names for coverage audits, launch checks, endpoint capture reviews, and drift checks.
- Add read-only MCP tools or resources for coverage matrix inspection, roadmap review, launch checklist review, and gap decision lookup.
- Add smoke/unit tests for matrix parsing, status validation, fallback completeness, and generated docs.

### 5. External Launch and Admin Follow-Through

Include explicit gates for:

- npm publish readiness and live publish confirmation.
- GitHub releases, tags, provenance, changelog, and rollback notes.
- MCP registry submission and validation.
- VS Code, GitHub Copilot, Claude, Gemini, and Codex setup verification.
- Substack test publication readiness.
- Publication permissions, team/admin access, settings, branding, domain/DNS, payments, subscription tiers, and media/live endpoint capture.
- Support/runbook readiness, security review, secret scanning, telemetry/diagnostics, drift monitoring, and user recovery guidance.

### 6. Delivery Discipline

Each implementation task in this track must end with:

- Focused local validation for that task.
- A self-review of changed files.
- Automatic application of review fixes when safe.
- A Git commit containing only the completed task.

Each implementation phase must end with:

- Full relevant project validation.
- A review pass across the phase diff.
- Automatic application of review fixes when safe.
- A push to the remote branch.

The completed track must end with:

- GitHub Actions monitoring for the pushed branch or pull request.
- Triage and fixes for failing checks.
- A final push after CI fixes.
- A clear record of any external/account-gated checks that could not be completed locally.

### 7. Drift Monitoring

Define an ongoing process for keeping the roadmap current:

- Refresh official Substack docs and support pages before marking future features complete.
- Record newly observed dashboard endpoints as capture-first until redacted fixtures and safety boundaries exist.
- Track app-only or dashboard-only features as manual/admin until safe automation is proven.
- Emit diagnostics when a previously supported endpoint becomes unavailable or changes shape.
- Keep status labels conservative and avoid overclaiming probe-only behavior as full support.

## Non-Functional Requirements

- Preserve local-first behavior and explicit confirmation boundaries.
- Do not add broad MCP write tools.
- Do not automate CAPTCHA solving, access-control bypass, deceptive engagement, or account actions outside user-owned publications.
- Redact secrets, cookies, tokens, publication-private data, traces, screenshots, and subscriber personal data.
- Keep undocumented direct API use behind evidence, diagnostics, and fallback paths.
- Prefer existing repo patterns: TypeScript, commander, thin CLI handlers, strict schemas, tests near implementation, and Conductor track registry updates.
- Preserve the repo's existing flat track files for normal implementation tracks unless a skill explicitly requires directory artifacts.

## Acceptance Criteria

- [ ] A canonical feature coverage matrix exists in machine-readable and human-readable form.
- [ ] Matrix validation enforces status, evidence, fallback/manual path, safety class, and next-action fields.
- [ ] All major Substack domains listed in this spec are represented in the matrix.
- [ ] Every meaningful capability has primary, fallback, and manual/admin paths or an explicit decision record.
- [ ] Unsupported, app-only, dashboard-only, or capture-first features have decision records and safe next steps.
- [ ] First-wave roadmap tooling is implemented and covered by tests.
- [ ] Launch/admin checklists cover npm, GitHub releases, MCP registry, client integrations, Substack admin setup, and support/security operations.
- [ ] MCP exposes only safe read/review/planning surfaces for the coverage roadmap.
- [ ] Docs explain how to update the matrix, add evidence, classify gaps, and avoid overclaiming coverage.
- [ ] The implementation history contains a focused commit for each completed task.
- [ ] Each phase has a review pass, fixes applied where safe, and a pushed remote branch state.
- [ ] The completed track has GitHub Actions checked, failing checks addressed, and remaining external gates documented.
- [ ] Validation passes with `npm run typecheck`, `npm test`, and the project's relevant CI/smoke checks.

## Out of Scope

- Unsafe or undocumented live writes without explicit confirmation and verified endpoint contracts.
- CAPTCHA bypass, anti-abuse circumvention, scraping private data, or engagement manipulation.
- Claiming full automation for app-only/dashboard-only features before endpoint capture proves it safe.
- Replacing Track 41 Creator OS commands; this track extends coverage governance around them.
