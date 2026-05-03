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
- **Status:** Active
- **File:** [../tracks/13-dependency-and-discovery-register.md](../tracks/13-dependency-and-discovery-register.md)
- **Summary:** All 7 discoveries (D001–D007) resolved. 4 new discoveries (D008–D011) added and resolved. Living register maintained.

### Track 14: Quality, CI, and Automation
- **Status:** Active
- **File:** [../tracks/14-quality-ci-automation.md](../tracks/14-quality-ci-automation.md)
- **Summary:** TypeScript strict, ESLint, Prettier, Vitest, Stryker (thresholds.break: 50, CI-gated), GH Actions, Renovate, ADRs, doctor command. E2E test scaffold (Playwright, manual-only CI job). ADR 0004 for E2E strategy.

### Track 15: MCP Integration
- **Status:** Active
- **File:** [../tracks/15-mcp-integration.md](../tracks/15-mcp-integration.md)
- **Summary:** 17 MCP tools across 3 groups, 2 resources, 2 prompts. 2 gaps closed (added `doctor` + `api.media`). No stale references, no secrets leak. All key read/review flows covered.

### Track 16: Publish Navigation Diagnosis
- **Status:** Complete
- **File:** [../tracks/16-publish-navigation-diagnosis.md](../tracks/16-publish-navigation-diagnosis.md)
- **Summary:** Diagnosed and fixed the publish navigation gap. Identified two-step flow: Continue (`button#publish`) → "Send to everyone now". Updated both local and browser workflows. Validated via `--review-only` live test.

## Phase 5: Publication Management

### Track 17: Publication Settings & Branding
- **Status:** In Progress
- **File:** [../tracks/17-publication-settings-branding.md](../tracks/17-publication-settings-branding.md)
- **Summary:** READ implemented: `api publication get` and `api publication settings` commands fetch full publication details via `fetchPublication()` (name, subdomain, colors, fonts, logos, payments state). WRITE not implemented — `POST /api/v1/publication/update` endpoint undiscovered.

### Track 18: Custom Domain Management
- **Status:** In Progress
- **File:** [../tracks/18-custom-domain-management.md](../tracks/18-custom-domain-management.md)
- **Summary:** READ implemented: `api domain status` via `fetchDomainStatus()` with SSL status mapping and DNS instruction generation for apex/subdomain. WRITE not implemented — set/remove endpoints undiscovered.

## Phase 6: Subscribers & Community

### Track 19: Subscriber Management
- **Status:** In Progress
- **File:** [../tracks/19-subscriber-management.md](../tracks/19-subscriber-management.md)
- **Summary:** Aggregate subscriber count implemented via `fetchPublicationChecklist()` and `api subscriber count` command. CRUD not implemented — subscriber list endpoint (`GET /api/v1/subscribers`) remains undiscovered.

### Track 20: Comments & Moderation
- **Status:** In Progress
- **File:** [../tracks/20-comments-moderation.md](../tracks/20-comments-moderation.md)
- **Summary:** READ implemented: `api comment get <id>` via `client.commentForId()` through substack-adapter. Moderation not implemented — approve/delete/pin/reply endpoints undiscovered.

### Track 21: Community Features
- **Status:** In Progress
- **File:** [../tracks/21-community-features.md](../tracks/21-community-features.md)
- **Summary:** Notes (list/get/create) and following implemented via `src/substack-api/notes.ts` + `substack-api` library. CLI commands: `api notes list`, `api notes get`, `api notes create`, `api following`. Chat/DM, recommendations, threads not implemented.

## Phase 7: Analytics & Revenue

### Track 22: Analytics & Reporting
- **Status:** Planned (no discovered endpoints)
- **File:** [../tracks/22-analytics-reporting.md](../tracks/22-analytics-reporting.md)
- **Summary:** No API endpoints discovered for post-level analytics, subscriber growth, email performance, or revenue reporting. Dashboard-only features.

### Track 23: Revenue & Billing
- **Status:** Planned (no discovered endpoints)
- **File:** [../tracks/23-revenue-billing.md](../tracks/23-revenue-billing.md)
- **Summary:** No API endpoints discovered for subscription tiers, payouts, tax forms, refunds, or boosted posts. `payments_state` read-only via publication object.

## Phase 8: Content Extensions

### Track 24: Email & Newsletter Design
- **Status:** Planned (no discovered endpoints)
- **File:** [../tracks/24-email-newsletter-design.md](../tracks/24-email-newsletter-design.md)
- **Summary:** No API endpoints discovered for email templates, test sends, or broadcast history. `should_send_email` draft field partially supported.

### Track 25: Podcast & Video Management
- **Status:** Planned (no discovered endpoints)
- **File:** [../tracks/25-podcast-video-management.md](../tracks/25-podcast-video-management.md)
- **Summary:** No API endpoints discovered for podcast episodes, audio upload, video upload, or distribution settings. Distinct upload pipelines from image upload.

### Track 26: Cross-posting & Integrations
- **Status:** Planned (no discovered endpoints)
- **File:** [../tracks/26-cross-posting-integrations.md](../tracks/26-cross-posting-integrations.md)
- **Summary:** No API endpoints discovered for cross-posting, WordPress/RSS import, or third-party integrations. OAuth-based web flows, not CLI-accessible.

## Phase 9: Team & Collaboration

### Track 27: Team Management
- **Status:** In Progress
- **File:** [../tracks/27-team-management.md](../tracks/27-team-management.md)
- **Summary:** READ implemented: `api team list` via `fetchTeamMembers()` from `GET /api/v1/publication/users` with id, name, email, role. Invites, role changes, remove, and activity log not implemented.

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

## Summary

| Status | Count | Tracks |
|---|---|---|
| **Complete** | 17 | 01, 02, 03, 04, 05, 06, 07, 08, 09, 10, 11, 12, 16, 28, 29, 30, 31 |
| **Active** (ongoing) | 3 | 13, 14, 15 |
| **In Progress** (partial impl.) | 6 | 17, 18, 19, 20, 21, 27 |
| **Planned** (no endpoints) | 5 | 22, 23, 24, 25, 26 |
| **Blocked** | 0 | — |
| **Total** | **31** | |

*Last updated: 2026-05-04* — Final implementation sweep. Audited all 31 tracks against actual codebase state in `src/cli.ts`, `src/substack-api/`, and `docs/`. Updated track files 17-27 with accurate status reflecting partially implemented functionality. Added Phase 10 (Tracks 28-31) all marked Complete. Key changes: READ operations for publication settings, custom domain, subscribers (count only), comments, notes/following, and team list all confirmed implemented with CLI commands; WRITE operations for all six remain pending due to undiscovered endpoints.
