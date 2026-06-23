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
- **Assigned agent:** Cline
- **Summary:** `publishedUrl` capture added to both local (`waitForURL`) and browser (polling `session.page.url()`) workflows. Publish navigation gap resolved: two-step flow (Continue → "Send to everyone now"). `--trace-out` and `--review-only` for API transport. 4 bugs fixed: dry-run ignored, trace-out+review-only gap, hardcoded status, and API prepublish planner routing to the publish endpoint. All acceptance criteria met. Track closed as complete.

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
- **Summary:** Current MCP surface is 27 tools across read/review/capture/creator groups, 7 resources, and 2 prompts. All key read/review flows are redacted; write flows remain CLI-only or manual.

### Track 16: Publish Navigation Diagnosis

- **Status:** Complete
- **File:** [../tracks/16-publish-navigation-diagnosis.md](../tracks/16-publish-navigation-diagnosis.md)
- **Summary:** Diagnosed and fixed the publish navigation gap. Identified two-step flow: Continue (`button#publish`) → "Send to everyone now". Updated both local and browser workflows. Validated via `--review-only` live test.

## Phase 5: Publication Management

### Track 17: Publication Settings & Branding

- **Status:** Complete
- **File:** [../tracks/17-publication-settings-branding.md](../tracks/17-publication-settings-branding.md)
- **Assigned agent:** Cline
- **Summary:** Full read and write support for publication settings via the Substack API. READ: `api publication get`, `api publication settings`, and `api publication get-details` commands fetch full publication details via `fetchPublication()`. WRITE: `api publication set` performs read-modify-write cycles via `POST /api/v1/publication/update`. Logo/favicon upload via `api publication upload-logo` and `api publication upload-favicon`. Rich schema support for colors, fonts, logos, SEO fields, and email branding. 18 test cases in `src/substack-api/publication-settings.test.ts`. Dry-run previews and `--yes` confirmation guards all write operations.

### Track 18: Custom Domain Management

- **Status:** Complete
- **File:** [../tracks/18-custom-domain-management.md](../tracks/18-custom-domain-management.md)
- **Assigned agent:** Cline
- **Summary:** READ implemented: `api domain status` and `api domain verify` via `fetchDomainStatus()` with SSL status mapping and DNS instruction generation for apex/subdomain. Set/remove commands are wired as confirmation-gated endpoint probes; mutation endpoints remain unconfirmed and require browser DevTools network capture.

## Phase 6: Subscribers & Community

### Track 19: Subscriber Management

- **Status:** Complete
- **File:** [../tracks/19-subscriber-management.md](../tracks/19-subscriber-management.md)
- **Assigned agent:** Cline
- **Summary:** Aggregate subscriber count via `fetchPublicationChecklist()` and `api subscriber count` command. Subscriber list via `fetchSubscriberList()` with filtering (`--status`, `--tier`, `--date-from`, `--date-to`, `--source-filter`) plus pagination. Probe-based CSV export (`api subscriber export`), CSV import (`api subscriber import --yes`), segment listing (`api subscriber segment list`), suppression management (`api subscriber suppress --yes`, `api subscriber suppression-list list`), and gift subscription listing (`api subscriber gift list`) all wired as multi-endpoint probes with graceful "not-found" responses. All write operations require `--yes` confirmation. Fully tested.

### Track 20: Comments & Moderation

- **Status:** Complete
- **File:** [../tracks/20-comments-moderation.md](../tracks/20-comments-moderation.md)
- **Assigned agent:** Cline
- **Summary:** Comment list via `fetchCommentsForPost()` from `GET /api/v1/post/{postId}/comments`. Moderation via `moderateComment()` (approve/delete/pin) and `replyToComment()`. Comment settings read/update probes via `fetchCommentSettings()`/`updateCommentSettings()`. Commenter management probes via `muteCommenter()`/`banCommenter()`. All destructive actions require `--yes`. Spam detection and quarantine remain unsupported.

### Track 21: Community Features

- **Status:** Complete
- **File:** [../tracks/21-community-features.md](../tracks/21-community-features.md)
- **Assigned agent:** Cline
- **Summary:** Notes (list/get/create/delete/like/reshare/reply) and following implemented via `src/substack-api/notes.ts` + `substack-api` library/direct probes. Recommendation probes implemented via `src/substack-api/recommendations.ts`. CLI commands: `api notes list|get|create|delete|like|reshare|reply`, `api recommendation list|status|add|remove`, `api following`. Recommendations and note reply are probe-only where endpoints are unconfirmed. Chat/DM is WebSocket-based and not CLI-accessible.

## Phase 7: Analytics & Revenue

### Track 22: Analytics & Reporting

- **Status:** Complete
- **File:** [../tracks/22-analytics-reporting.md](../tracks/22-analytics-reporting.md)
- **Assigned agent:** Cline
- **Summary:** Analytics endpoint probes implemented — post analytics, subscriber growth with `period` query propagation, email performance, revenue analytics, CSV/table/JSON formatting, and snapshots. Multi-endpoint discovery pattern tries known paths and returns graceful "not-found" responses when endpoints are dashboard-only.

### Track 23: Revenue & Billing

- **Status:** Complete
- **File:** [../tracks/23-revenue-billing.md](../tracks/23-revenue-billing.md)
- **Assigned agent:** Cline
- **Summary:** Billing endpoint probes implemented — subscription tiers, payout history, tax form status, refund, and promotions. `payments_state` from publication object included. Billing read/probe output redacts common PII fields by default with `--include-pii` opt-in. `refund` requires `--yes` AND `--confirm refund`. Tier configuration, coupon/discount management, and actual Stripe-based refund remain dashboard-only/unconfirmed.

## Phase 8: Content Extensions

### Track 24: Email & Newsletter Design

- **Status:** Complete
- **File:** [../tracks/24-email-newsletter-design.md](../tracks/24-email-newsletter-design.md)
- **Assigned agent:** Cline
- **Summary:** All 8 acceptance criteria wired. Template read (`email template`) and write (`email set-template`) with `--dry-run`/`--yes`, broadcast history/cancel, test email send, subject/preview via frontmatter, `should_send_email` pipeline. Write is probe-based and may be dashboard-only.

### Track 25: Podcast & Video Management

- **Status:** Complete
- **File:** [../tracks/25-podcast-video-management.md](../tracks/25-podcast-video-management.md)
- **Summary:** Podcast and video inspection/planning commands are implemented. Native audio/video creation, scheduling, and upload writes are now blocked behind the `native-video-live-automation` safe-surface decision until safe endpoint captures exist.

### Track 26: Cross-posting & Integrations

- **Status:** Complete
- **File:** [../tracks/26-cross-posting-integrations.md](../tracks/26-cross-posting-integrations.md)
- **Summary:** Integration listing and redacted token probes are implemented. Cross-post and import writes are now blocked behind the `integrations-import-crosspost-tokens` safe-surface decision until safe captures exist.

## Phase 9: Team & Collaboration

### Track 27: Team Management

- **Status:** Complete
- **File:** [../tracks/27-team-management.md](../tracks/27-team-management.md)
- **Assigned agent:** Cline
- **Summary:** READ implemented: `api team list` via `fetchTeamMembers()` from `GET /api/v1/publication/users` with id, name, email, role; emails are redacted by default unless `--include-emails` is passed. Activity, invite, remove, and role-change commands are wired as confirmation-gated probes. Endpoints remain unconfirmed and require browser DevTools network capture before promotion from probe-only support.

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
- **Summary:** Upstream `jakub-k-slys/substack-api` TypeScript source is vendored under `vendor/substack-api`, npm resolves `substack-api` through `file:vendor/substack-api`, and `package.json#files` includes the vendored package files without nested `node_modules`. Normal submodule checkout was avoided because upstream sample fixture filenames contain Windows-invalid `?` characters.

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
- **File:** [../tracks/archive/36-vscode-integration-packaging.md](../tracks/archive/36-vscode-integration-packaging.md)
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

- **Status:** Implemented
- **File:** [../tracks/frontier_coverage_roadmap_20260616/index.md](../tracks/frontier_coverage_roadmap_20260616/index.md)
- **Summary:** Canonical 100% feature coverage roadmap, CLI/MCP review surfaces, launch/admin checklist, drift workflow, run-log actions, and maintenance docs are implemented. External launches, registry submissions, and Substack admin actions remain explicit owner-approved gates.

---

## Summary

| Status | Count | Tracks |
| --- | ---: | --- |
| **Complete / Implemented** | 43 | 01–43 |
| **Partial / Read-only / Probe-only** | 0 | — |
| **In Progress** | 0 | — |
| **Planned** | 0 | — |
| **Blocked** | 0 | — |
| **Total** | **43** | |

_Last updated: 2026-06-24_ — Tracks 01–43 are locally implemented. Track 42 records external launch/admin gates explicitly rather than claiming account-gated actions were performed. Track 43 adds completion hardening, API contract versioning, capture evidence, Creator OS differentiators, dependency lanes, and CI/CD strictness.

---

- [x] **Track: Native video and live automation remains planning-only until safe endpoint captures exist.**
*Link: [../tracks/native_video_live_automation_20260624/](../tracks/native_video_live_automation_20260624/)*

---

- [x] **Track: Recommendations and Boost remain probe-only discovery surfaces.**
*Link: [../tracks/recommendations_boost_probe_20260624/](../tracks/recommendations_boost_probe_20260624/)*

---

- [x] **Track: Subscriber import, export, and segment workflows remain probe/manual due privacy risk.**
*Link: [../tracks/subscriber_import_export_segments_20260624/](../tracks/subscriber_import_export_segments_20260624/)*

---

- [x] **Track: Analytics and revenue dashboards remain probe-only with local snapshot/report alternatives.**
*Link: [../tracks/analytics_revenue_dashboards_20260624/](../tracks/analytics_revenue_dashboards_20260624/)*

---

- [x] **Track: Chat, DM, and live chat remain unsupported without a public contract.**
*Link: [../tracks/chat_dm_live_chat_contract_20260624/](../tracks/chat_dm_live_chat_contract_20260624/)*

---

- [x] **Track: Publication admin settings, domain, payments, and team writes remain manual/admin.**
*Link: [../tracks/publication_admin_manual_writes_20260624/](../tracks/publication_admin_manual_writes_20260624/)*

---

- [x] **Track: Integrations, import, crosspost, and token workflows remain probe/manual until safe captures exist.**
*Link: [../tracks/integrations_import_crosspost_tokens_20260624/](../tracks/integrations_import_crosspost_tokens_20260624/)*

---

- [x] **Track: Creator OS completion hardening with API contract versioning, evidence promotion, strict CI/CD, and dependency lanes.**
*Link: [../tracks/creator_os_completion_hardening_20260624/](../tracks/creator_os_completion_hardening_20260624/)*
