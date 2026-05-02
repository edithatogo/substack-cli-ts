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
- **Status:** Planned
- **File:** [../tracks/17-publication-settings-branding.md](../tracks/17-publication-settings-branding.md)
- **Summary:** Programmatic management of publication branding — name, description, logo, colors, fonts, layout, SEO metadata, navigation. Requires endpoint discovery.

### Track 18: Custom Domain Management
- **Status:** Planned
- **File:** [../tracks/18-custom-domain-management.md](../tracks/18-custom-domain-management.md)
- **Summary:** Programmatic custom domain configuration — read/write domain, DNS verification guidance, SSL status, subdomain setup.

## Phase 6: Subscribers & Community

### Track 19: Subscriber Management
- **Status:** Planned
- **File:** [../tracks/19-subscriber-management.md](../tracks/19-subscriber-management.md)
- **Summary:** Subscriber CRUD, CSV import/export, segments, suppression lists, gift subscriptions. Requires endpoint discovery.

### Track 20: Comments & Moderation
- **Status:** Planned
- **File:** [../tracks/20-comments-moderation.md](../tracks/20-comments-moderation.md)
- **Summary:** Comment reading, moderation (approve/delete/pin/reply), spam/quarantine, commenter management.

### Track 21: Community Features
- **Status:** Planned
- **File:** [../tracks/21-community-features.md](../tracks/21-community-features.md)
- **Summary:** Notes (social posts), chat/DM, threads/Q&A, publication recommendations network.

## Phase 7: Analytics & Revenue

### Track 22: Analytics & Reporting
- **Status:** Planned
- **File:** [../tracks/22-analytics-reporting.md](../tracks/22-analytics-reporting.md)
- **Summary:** Post-level analytics, subscriber growth, email performance, revenue reporting. CSV/JSON export.

### Track 23: Revenue & Billing
- **Status:** Planned
- **File:** [../tracks/23-revenue-billing.md](../tracks/23-revenue-billing.md)
- **Summary:** Subscription tiers/pricing, payout history, tax forms, refunds, boosted posts. Financial data with extra redaction.

## Phase 8: Content Extensions

### Track 24: Email & Newsletter Design
- **Status:** Planned
- **File:** [../tracks/24-email-newsletter-design.md](../tracks/24-email-newsletter-design.md)
- **Summary:** Email template design, subject/preview text, test sends, broadcast history.

### Track 25: Podcast & Video Management
- **Status:** Planned
- **File:** [../tracks/25-podcast-video-management.md](../tracks/25-podcast-video-management.md)
- **Summary:** Podcast episodes/RSS, audio upload, distribution settings. Video upload and transcoding.

### Track 26: Cross-posting & Integrations
- **Status:** Planned
- **File:** [../tracks/26-cross-posting-integrations.md](../tracks/26-cross-posting-integrations.md)
- **Summary:** Cross-posting, WordPress/RSS import, Zapier/IFTTT/Discord/Slack integrations, API tokens.

## Phase 9: Team & Collaboration

### Track 27: Team Management
- **Status:** Planned
- **File:** [../tracks/27-team-management.md](../tracks/27-team-management.md)
- **Summary:** Team member listing, invites, role changes, activity log. Roles: admin, editor, contributor, reader.

---

## Summary

| Status | Count | Tracks |
|---|---|---|
| **Complete** | 13 | 01, 02, 03, 04, 05, 06, 07, 08, 09, 10, 11, 12, 16 |
| **Active** (ongoing) | 3 | 13, 14, 15 |
| **Planned** | 11 | 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27 |
| **Blocked** | 0 | — |
| **Total** | **27** | |

*Last updated: 2026-05-02* — Repository pushed to github.com/edithatogo/substack-cli-ts. Initial 16 tracks (Phases 1-4) complete — content pipeline, browser automation, API adapter, and quality tooling. 11 planned tracks (Phases 5-9) mapped covering publication management, subscribers & community, analytics & revenue, content extensions, and team collaboration. Feature coverage document at `docs/substack-feature-coverage.md` and comparison matrix at `docs/feature-matrix.md`.
