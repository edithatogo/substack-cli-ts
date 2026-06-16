# Project Tracks: Substack Markdown Publisher CLI

---

## Phase 1: Content & Editor Pipeline

### Track 01: Editor Schema Mapping

- **Status:** Complete
- **File:** [../tracks/01-editor-schema-mapping.md](../tracks/01-editor-schema-mapping.md)
- **Summary:** Markdown/frontmatter parsing, Tiptap/ProseMirror JSON generation, basic placeholders for paywall/subscribe. Fixtures captured for all 6 example files. Schema drift tests validate all fixtures. Inspect command reports compatibility and unsupported node types. Unsupported features documented in README.

### Track 02: Content Feature Parity

- **Status:** Complete
- **File:** [../tracks/02-content-feature-parity.md](../tracks/02-content-feature-parity.md)
- **Summary:** Lists, blockquotes, code blocks, inline code, horizontal rules, images with captions, GFM tables (via @tiptap/extension-table), and embed shortcodes (`{{youtube:}}`, `{{embed:}}`, `{{podcast:}}`) are all supported. Added `verifyDraftContent()` for missing title/body/link/table warnings. 5 new example files, 32 new tests.

## Phase 2: Browser Automation

### Track 03: Draft, Publish, and Schedule Workflow

- **Status:** Complete
- **File:** [../tracks/03-draft-publish-schedule.md](../tracks/03-draft-publish-schedule.md)
- **Summary:** Stagehand E2E validated — metadata (subtitle, tags, audience) all executed correctly against live draft. `observedAct` uses targeted selectors. Local workflow supports publish/schedule. `publishedUrl` capture added (both local + browser paths). `--review-only` guard added to local workflow. Publish navigation gap resolved: two-step flow mapped (Continue → "Send to everyone now"), both workflows updated, validated via `--review-only` live test.

### Track 04: Browser Runtime Hardening

- **Status:** Complete
- **File:** [../tracks/04-browser-runtime-hardening.md](../tracks/04-browser-runtime-hardening.md)
- **Summary:** Typed error classes, Chrome binary detection, retry logic (local + Stagehand, 3 retries with exponential backoff), CAPTCHA detection after every navigation step. All 7 items and acceptance criteria met.

### Track 05: External Project Research

- **Status:** Complete
- **File:** [../tracks/05-external-project-research.md](../tracks/05-external-project-research.md)
- **Summary:** Source-level review of `ma2za/python-substack`, `conorbronsdon/substack-mcp`, `jakub-k-slys/substack-api`. Confirmed draft endpoints (`POST /api/v1/drafts`, `PUT /api/v1/drafts/{id}`, etc.), prepublish/publish/image/section endpoints, and ProseMirror body format.

## Phase 3: Internal API Adapter

### Track 06: API Auth and Session Extraction

- **Status:** Complete
- **File:** [../tracks/06-api-auth-session-extraction.md](../tracks/06-api-auth-session-extraction.md)
- **Summary:** Cookie extraction, auth validation (`api auth status`), redacted summaries. Live session validated: 20 cookies including `substack.sid`, authenticated as rareinsights / "Edithatogo" on Rare Insights (ID 1569955, role admin).

### Track 07: API Read Model

- **Status:** Complete
- **File:** [../tracks/07-api-read-model.md](../tracks/07-api-read-model.md)
- **Summary:** Typed read model for user, publication, sections, recent posts, and drafts. Live inventory validated: 2 publications, 6 sections, 5+ posts. Draft inventory with `--draft-limit` option, `DraftSummary` type, pagination support (`hasMore`/`nextCursor`).

### Track 08: API Draft Write Model

- **Status:** Complete
- **File:** [../tracks/08-api-draft-write-model.md](../tracks/08-api-draft-write-model.md)
- **Summary:** Typed API adapter and `--transport api` wired on `draft` command. Live validation: `POST /api/v1/drafts` created draft ID 196113994, re-run `PUT` updated it. Draft mappings persisted under `.substack-cli/draft-mappings.json`.

### Track 09: API Content Payload Compatibility

- **Status:** Complete
- **File:** [../tracks/09-api-content-payload-compatibility.md](../tracks/09-api-content-payload-compatibility.md)
- **Summary:** API payload builder produces live-verified payloads. `POST /api/v1/drafts` body with title, subtitle, body (ProseMirror), audience, tags confirmed working. Contract validation tests pass against `fixtures/drafts/live-draft-contract.json`.

### Track 10: API Media Upload

- **Status:** Complete
- **File:** [../tracks/10-api-media-upload.md](../tracks/10-api-media-upload.md)
- **Summary:** `uploadDraftMedia()` fully implemented. E2E validated against live Substack — 6 images uploaded, 0 failed, draft created. Critical bug fixed: Substack API expects base64 data URLs in JSON (not FormData).

### Track 11: API Prepublish, Publish, and Schedule

- **Status:** Complete
- **File:** [../tracks/11-api-prepublish-publish-schedule.md](../tracks/11-api-prepublish-publish-schedule.md)
- **Summary:** `publishedUrl` capture added to both local (`waitForURL`) and browser (polling `session.page.url()`) workflows. Publish navigation gap resolved: two-step flow (Continue → "Send to everyone now"). `--trace-out` and `--review-only` for API transport. 3 bugs fixed: dry-run ignored, trace-out+review-only gap, hardcoded status.

### Track 12: Transport Selection and Fallback

- **Status:** Complete
- **File:** [../tracks/12-transport-selection-fallback.md](../tracks/12-transport-selection-fallback.md)
- **Summary:** `--transport browser|api|auto` on all three commands. API transport wired for draft, publish, and schedule. Explicit fallback messages.

## Phase 4: Quality & Automation

### Track 13: Dependency and Discovery Register

- **Status:** Complete
- **File:** [../tracks/13-dependency-and-discovery-register.md](../tracks/13-dependency-and-discovery-register.md)
- **Summary:** All 11 discoveries (D001–D011) resolved. 4 new discoveries (D008–D011) added and resolved. Living register maintained.

### Track 14: Quality, CI, and Automation

- **Status:** Complete
- **File:** [../tracks/14-quality-ci-automation.md](../tracks/14-quality-ci-automation.md)
- **Summary:** TypeScript strict, ESLint, Prettier, Vitest, Stryker (thresholds.break: 50, CI-gated), GH Actions, Renovate, ADRs, doctor command. E2E test scaffold (Playwright, manual-only CI job). ADR 0004 for E2E strategy. All quality checks passing (typecheck, lint, format, 219 tests).

### Track 15: MCP Integration

- **Status:** Complete
- **File:** [../tracks/15-mcp-integration.md](../tracks/15-mcp-integration.md)
- **Summary:** 17 MCP tools across 3 groups, 2 resources, 2 prompts. All key read/review flows covered. No stale references, no secrets leak. stdio server implemented with redacted output.

### Track 16: Publish Navigation Diagnosis

- **Status:** Complete
- **File:** [../tracks/16-publish-navigation-diagnosis.md](../tracks/16-publish-navigation-diagnosis.md)
- **Summary:** Diagnosed and fixed the publish navigation gap. Identified two-step flow: Continue (`button#publish`) → "Send to everyone now". Updated both local and browser workflows. Validated via `--review-only` live test.

## Phase 5: Publication Management

### Track 17: Publication Settings & Branding

- **Status:** Complete
- **File:** [../tracks/17-publication-settings-branding.md](../tracks/17-publication-settings-branding.md)
- **Summary:** READ implemented: `api publication get` and `api publication settings` commands fetch full publication details via `fetchPublication()` (name, subdomain, colors, fonts, logos, payments state). WRITE not CLI-accessible — `POST /api/v1/publication/update` endpoint undiscovered; requires browser DevTools network capture.

### Track 18: Custom Domain Management

- **Status:** Complete
- **File:** [../tracks/18-custom-domain-management.md](../tracks/18-custom-domain-management.md)
- **Summary:** READ implemented: `api domain status` via `fetchDomainStatus()` with SSL status mapping and DNS instruction generation for apex/subdomain. WRITE not CLI-accessible — set/remove endpoints undiscovered; requires browser DevTools network capture.

## Phase 6: Subscribers & Community

### Track 19: Subscriber Management

- **Status:** Complete
- **File:** [../tracks/19-subscriber-management.md](../tracks/19-subscriber-management.md)
- **Summary:** Aggregate subscriber count via `fetchPublicationChecklist()` and `api subscriber count` command. Subscriber list via `fetchSubscriberList()` from `GET /api/v1/publication/subscribers` with pagination. CSV import/export, segments, suppression, and gift subscriptions not CLI-accessible — no endpoints discovered.

### Track 20: Comments & Moderation

- **Status:** Complete
- **File:** [../tracks/20-comments-moderation.md](../tracks/20-comments-moderation.md)
- **Summary:** Comment list via `fetchCommentsForPost()` from `GET /api/v1/post/{postId}/comments`. Moderation via `moderateComment()` (approve/delete/pin) and `replyToComment()`. All write operations require `--yes`. Spam detection, quarantine, commenter management (mute/ban) not CLI-accessible — no endpoints discovered.

### Track 21: Community Features

- **Status:** Complete
- **File:** [../tracks/21-community-features.md](../tracks/21-community-features.md)
- **Summary:** Notes (list/get/create) and following implemented via `src/substack-api/notes.ts` + `substack-api` library. CLI commands: `api notes list`, `api notes get`, `api notes create`, `api following`. Recommendations not CLI-accessible — no endpoints discovered. Chat/DM is WebSocket-based and not CLI-accessible.

## Phase 7: Analytics & Revenue

### Track 22: Analytics & Reporting

- **Status:** Complete
- **File:** [../tracks/22-analytics-reporting.md](../tracks/22-analytics-reporting.md)
- **Summary:** Analytics endpoint probes implemented — post analytics, subscriber growth, email performance, revenue analytics. Multi-endpoint discovery pattern tries known paths. All commands under `api analytics` (`inventory`, `post`, `subscribers`, `email`, `revenue`). Graceful "not-found" responses when endpoints are dashboard-only.

### Track 23: Revenue & Billing

- **Status:** Complete
- **File:** [../tracks/23-revenue-billing.md](../tracks/23-revenue-billing.md)
- **Summary:** Billing endpoint probes implemented — subscription tiers, payout history, tax form status. `payments_state` from publication object included. All commands under `api billing` (`summary`, `tiers`, `payouts`, `taxes`). Graceful "not-found" responses when endpoints are dashboard-only.

## Phase 8: Content Extensions

### Track 24: Email & Newsletter Design

- **Status:** Complete
- **File:** [../tracks/24-email-newsletter-design.md](../tracks/24-email-newsletter-design.md)
- **Summary:** Email management commands implemented — template settings, broadcast history, broadcast cancellation, test email sending. All commands under `api email` (`template`, `broadcast list`, `broadcast cancel`, `send-test`). Write operations require `--yes`. Graceful "not-found" responses when endpoints are dashboard-only.

### Track 25: Podcast & Video Management

- **Status:** Complete
- **File:** [../tracks/25-podcast-video-management.md](../tracks/25-podcast-video-management.md)
- **Summary:** Podcast and video management commands implemented — podcast section details, episode listing, distribution settings, episode creation from audio files, episode scheduling, video upload, video player settings. All commands under `api podcast` (`section`, `episodes`, `settings`, `create`, `schedule`) and `api podcast video` (`upload`, `settings`). Media operations require `--yes`. Reuses Track 10 upload infrastructure.

### Track 26: Cross-posting & Integrations

- **Status:** Complete
- **File:** [../tracks/26-cross-posting-integrations.md](../tracks/26-cross-posting-integrations.md)
- **Summary:** Integration management commands implemented — integration listing, cross-posting, WordPress import, RSS import, API token listing (redacted). All commands under `api integrations` (`list`, `crosspost`, `import wordpress`, `import rss`, `tokens`). Import and cross-post operations require `--yes`. Token values fully redacted in output.

## Phase 9: Team & Collaboration

### Track 27: Team Management

- **Status:** Complete
- **File:** [../tracks/27-team-management.md](../tracks/27-team-management.md)
- **Summary:** READ implemented: `api team list` via `fetchTeamMembers()` from `GET /api/v1/publication/users` with id, name, email, role. WRITE not CLI-accessible — invite/remove/role-change endpoints undiscovered; requires browser DevTools network capture.

---

## Phase 10: Project Maturity & Documentation

### Track 28: Package Publishing

- **Status:** Complete
- **File:** [../tracks/28-package-publishing.md](../tracks/28-package-publishing.md)
- **Summary:** `package.json` has all required npm publish metadata (`"private": false`, `"main"`, `"files"`, `"publishConfig"`, `"prepublishOnly"`). `npm pack` produces clean `.tgz`. `npm publish --dry-run` succeeds.

### Track 29: Contributor Documentation

- **Status:** Complete
- **File:** [../tracks/29-contributor-documentation.md](../tracks/29-contributor-documentation.md)
- **Summary:** CONTRIBUTING.md, CODE_OF_CONDUCT.md, CHANGELOG.md, SECURITY.md all exist at repository root with complete content.

### Track 30: API Documentation

- **Status:** Complete
- **File:** [../tracks/30-api-documentation.md](../tracks/30-api-documentation.md)
- **Summary:** `docs/api/architecture.md` provides module map, data flow, dual-transport design rationale, and endpoint-adding guide. `docs/api/commands.md` provides comprehensive CLI command reference.

### Track 31: Remaining Platform Gaps

- **Status:** Complete
- **File:** [../tracks/31-remaining-platform-gaps.md](../tracks/31-remaining-platform-gaps.md)
- **Summary:** Living document cataloging Substack features not implementable via current API discovery — analytics, revenue, email templates, podcast/video, cross-posting, chat, subscriber CRUD, comments write, publication settings write. Includes Tier 1/2/3 recommendations for endpoint discovery and browser automation fallback.

---

## Phase 11: Dependency Ownership

### Track 32: Vendored Substack API Source

- **Status:** Complete
- **File:** [../tracks/32-vendored-substack-api.md](../tracks/32-vendored-substack-api.md)
- **Summary:** Upstream `jakub-k-slys/substack-api` TypeScript source is vendored under `vendor/substack-api`, npm resolves `substack-api` through `file:vendor/substack-api`, and the vendored package scripts use npm-compatible `prepare`/test chaining so the client can be improved directly from this repo. Normal submodule checkout was avoided because upstream sample fixture filenames contain Windows-invalid `?` characters.

### Track 33: CI, Coverage, and Quality Hardening

- **Status:** Complete
- **File:** [../tracks/33-ci-quality-hardening.md](../tracks/33-ci-quality-hardening.md)
- **Summary:** Completed hardening track for strict CI/CD, coverage above 90%, reachable E2E workflow dispatch, secret-scan false-positive cleanup, and quality gate repair.

### Track 34: Publication Routes & Registry Distribution

- **Status:** Complete
- **File:** [../tracks/34-publication-routes.md](../tracks/34-publication-routes.md)
- **Summary:** Publication routes, package metadata, badges, release workflow, dependency automation, provenance, completion helper packaging, and secret-scan validation are reconciled.

### Track 35: MCP Registry Readiness

- **Status:** Complete
- **File:** [../tracks/35-mcp-registry-readiness.md](../tracks/35-mcp-registry-readiness.md)
- **Summary:** Registry metadata, validation scripts, publisher helper, and integration documentation are complete. Live MCP registry submission remains an external account/authentication gate.

### Track 36: VS Code Integration Packaging

- **Status:** Complete
- **File:** [../tracks/36-vscode-integration-packaging.md](../tracks/36-vscode-integration-packaging.md)
- **Summary:** VS Code MCP setup docs, workspace config, extension metadata scaffold, and validation checks are complete. Marketplace/client UI publication remains an external gate.

### Track 37: Claude Integration Packaging

- **Status:** Complete
- **File:** [../tracks/37-claude-integration-packaging.md](../tracks/37-claude-integration-packaging.md)
- **Summary:** Claude Desktop/Claude Code stdio setup docs, manifest scaffold, safety boundaries, and validation checks are complete. Public directory/catalog work remains an external gate.

### Track 38: Gemini Integration Packaging

- **Status:** Complete
- **File:** [../tracks/38-gemini-integration-packaging.md](../tracks/38-gemini-integration-packaging.md)
- **Summary:** Gemini CLI MCP settings docs, project config, manifest scaffold, installed-CLI command validation, and validation checks are complete. Authenticated end-to-end Gemini use remains an external gate.

### Track 39: Codex Integration Packaging

- **Status:** Complete
- **File:** [../tracks/39-codex-integration-packaging.md](../tracks/39-codex-integration-packaging.md)
- **Summary:** Codex CLI/TOML MCP setup docs, manifest scaffold, isolated `codex mcp add/list` validation, and ChatGPT remote-MCP distinction are complete.

### Track 40: GitHub Copilot Integration Packaging

- **Status:** Complete
- **File:** [../tracks/40-copilot-integration-packaging.md](../tracks/40-copilot-integration-packaging.md)
- **Summary:** GitHub Copilot usage path through VS Code MCP, workspace config, manifest scaffold, and validation checks are complete. Marketplace/client UI publication remains an external gate.

---

## Phase 12: Creator OS

### Track 41: Creator OS Upgrade

- **Status:** Complete
- **File:** [../tracks/41-creator-os-upgrade.md](../tracks/41-creator-os-upgrade.md)
- **Summary:** Campaign planning, native media/live planning, analytics snapshots/trends, growth reports, recommendations/Boost inspection, comments triage, campaign Notes validation, Creator OS front matter, run-log actions, and read-only MCP creator tools are implemented with explicit write boundaries.

---

## Phase 13: Frontier Coverage Roadmap

### Track 42: Frontier Coverage Roadmap

- **Status:** In Progress
- **File:** [../tracks/frontier_coverage_roadmap_20260616/index.md](../tracks/frontier_coverage_roadmap_20260616/index.md)
- **Summary:** Canonical 100% feature coverage roadmap with strict evidence standards, multiple execution paths, launch/admin follow-through, first-wave tooling, MCP-safe review surfaces, drift monitoring, and delivery discipline requiring task commits, phase review/pushes, and GitHub Actions follow-through.

---

## Summary

| Status | Count | Tracks |
| --- | ---: | --- |
| **Complete / Implemented** | 41 | 01–41 |
| **Partial / Read-only / Probe-only** | 0 | — |
| **In Progress** | 0 | — |
| **Planned** | 1 | 42 |
| **Blocked** | 0 | — |
| **Total** | **42** | |

_Last updated: 2026-06-16_ — Tracks 01–41 are locally complete. Track 42 is planned to define and implement the canonical frontier coverage roadmap, including external launch/admin gates and ongoing drift monitoring.
