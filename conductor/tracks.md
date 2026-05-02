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

### Track 05: External Project Research
- **Status:** Complete
- **File:** [../tracks/05-external-project-research.md](../tracks/05-external-project-research.md)
- **Summary:** Source-level review of `ma2za/python-substack`, `conorbronsdon/substack-mcp`, `jakub-k-slys/substack-api`. Confirmed draft endpoints (`POST /api/v1/drafts`, `PUT /api/v1/drafts/{id}`, etc.), prepublish/publish/image/section endpoints, and ProseMirror body format. D006 partially resolved.

## Phase 3: Internal API Adapter

### Track 06: API Auth and Session Extraction
- **Status:** Complete
- **File:** [../tracks/06-api-auth-session-extraction.md](../tracks/06-api-auth-session-extraction.md)
- **Summary:** Cookie extraction, auth validation (`api auth status`), redacted summaries. Live session validated: 20 cookies including `substack.sid`, authenticated as rareinsights / "Edithatogo" on Rare Insights (ID 1569955, role admin).

### Track 07: API Read Model
- **Status:** Complete (draft inventory added)
- **File:** [../tracks/07-api-read-model.md](../tracks/07-api-read-model.md)
- **Summary:** Typed read model for user, publication, sections, recent posts, and drafts via `/api/v1/drafts` endpoint. Live inventory validated: 2 publications, 6 sections, 5+ posts. Draft inventory with `--draft-limit` option, `DraftSummary` type, pagination support (`hasMore`/`nextCursor`).

### Track 08: API Draft Write Model
- **Status:** Complete
- **File:** [../tracks/08-api-draft-write-model.md](../tracks/08-api-draft-write-model.md)
- **Summary:** D006 resolved from live capture. Typed API adapter and `--transport api` wired on `draft` command. Live validation: `POST /api/v1/drafts` created draft ID 196113994, re-run `PUT` updated it via local mapping. Draft mappings persisted under `.substack-cli/draft-mappings.json`.

### Track 09: API Content Payload Compatibility
- **Status:** Validated live
- **File:** [../tracks/09-api-content-payload-compatibility.md](../tracks/09-api-content-payload-compatibility.md)
- **Summary:** API payload builder produces live-verified payloads. `POST /api/v1/drafts` body with title, subtitle, body (ProseMirror), audience, tags confirmed working. Contract validation tests pass against `fixtures/drafts/live-draft-contract.json`. Image/embed compatibility pending Track 10.

### Track 10: API Media Upload
- **Status:** Complete
- **File:** [../tracks/10-api-media-upload.md](../tracks/10-api-media-upload.md)
- **Summary:** `uploadDraftMedia()` fully implemented from stub. E2E validated against live Substack — 6 images uploaded, 0 failed, draft created. Critical bug fixed: Substack API accepts base64 data URLs in JSON, not multipart FormData.

### Track 11: API Prepublish, Publish, and Schedule
- **Status:** Complete
- **File:** [../tracks/11-api-prepublish-publish-schedule.md](../tracks/11-api-prepublish-publish-schedule.md)
- **Summary:** All code gaps resolved. `publishedUrl` capture added to both local and browser workflows. Local: `waitForURL(/\/p\//)` after click. Browser: polling `session.page.url()` every 500ms. Publish navigation gap resolved: two-step flow (Continue → "Send to everyone now") implemented, validated via `--review-only` live test.

### Track 12: Transport Selection and Fallback
- **Status:** Complete
- **File:** [../tracks/12-transport-selection-fallback.md](../tracks/12-transport-selection-fallback.md)
- **Summary:** `--transport browser|api|auto` on all three commands. API transport wired for draft (create/update), publish (`POST /drafts/{id}/publish`), and schedule (`POST /drafts/{id}/schedule`). Explicit fallback messages.

## Phase 4: Quality & Automation

### Track 13: Dependency and Discovery Register
- **Status:** Active
- **File:** [../tracks/13-dependency-and-discovery-register.md](../tracks/13-dependency-and-discovery-register.md)
- **Summary:** All 7 discoveries (D001–D007) resolved — schedule API endpoint confirmed, export belongs in CLI, no license constraints, draft create/update contracts captured live, MCP surface defined. 4 new discoveries (D008–D011) added for bugs found during Track 10/11 parallel work (base64 media upload, dry-run fix, trace-out+review-only gap, hardcoded trace status), all resolved. Living register maintained.

### Track 14: Quality, CI, and Automation
- **Status:** Active
- **File:** [../tracks/14-quality-ci-automation.md](../tracks/14-quality-ci-automation.md)
- **Summary:** TypeScript strict, ESLint, Prettier, Vitest, Stryker (`thresholds.break: 50`, CI-gated), GH Actions, Renovate, ADRs, doctor command. E2E test scaffold added (Playwright, manual-only CI job). ADR 0004 for E2E strategy. 1 remaining: revisit pnpm if multi-package.

### Track 15: MCP Integration
- **Status:** Active (aligned)
- **File:** [../tracks/15-mcp-integration.md](../tracks/15-mcp-integration.md)
- **Summary:** Alignment audit completed: 17 MCP tools across 3 groups, 2 resources, 2 prompts. 2 gaps closed (added `doctor` + `api.media` MCP tools). No stale references, no secrets leak. All key read/review flows covered.

### Track 16: Publish Navigation Diagnosis
- **Status:** Complete
- **File:** [../tracks/16-publish-navigation-diagnosis.md](../tracks/16-publish-navigation-diagnosis.md)
- **Summary:** Diagnosed and fixed the publish navigation gap. Identified two-step flow: Continue (`button#publish`) → "Send to everyone now" (review dialog). Updated both local and browser workflows with correct selectors. All acceptance criteria met, validated via browser `--review-only` confirming review overlay opens correctly.

---

## Summary

| Status | Count | Tracks |
|---|---|---|---|
| **Complete** | 13 | 01, 02, 03, 04, 05, 06, 07, 08, 09, 10, 11, 12, 16 |
| **Active** (ongoing) | 3 | 13, 14, 15 |
| **In Progress** | 0 | — |
| **Planned** | — | — |
| **Blocked** | 0 | — |
| **Total** | **16** | |

*Last updated: 2026-05-02* (Final sweep — All 16 tracks implemented. Track 03/11/16 resolved the publish navigation two-step flow (Continue → "Send to everyone now") with `publishedUrl` capture working in both local and browser workflows. Track 10 E2E validated 6 live image uploads. Track 13 living register documents D001-D011 all resolved. Phase 4 tracks 13/14/15 remain Active for ongoing maintenance. Complete tracks: 01–12, 16. Active: 13, 14, 15.)
