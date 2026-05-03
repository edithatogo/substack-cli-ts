# Track 31: Remaining Platform Gaps — Non-Implementable via Current API Discovery

## Status

**Planned** — Tracked for awareness; implementation depends on endpoint discovery or Substack API changes.

## Goal

Document Substack platform features that are NOT implementable via the currently discovered API surface. These features either:
- Require browser-only interactions (no known API endpoint)
- Require proprietary upload pipelines (audio/video)
- Depend on OAuth or third-party integrations
- Have no known internal API endpoint from any reference project

## Current State

The following platform gaps reference features with NO known internal API endpoints based on research from:
- `ma2za/python-substack` (Python library)
- `conorbronsdon/substack-mcp` (MCP server)
- `jakub-k-slys/substack-api` (TypeScript entity client, 43 releases)
- Browser DevTools network captures
- The `api draft observe` command (which captures live API traffic)

---

### Analytics (Post Stats, Subscriber Growth, Email Performance, Revenue)

**Endpoint status: NO KNOWN API**

| Sub-feature | Known endpoint | Rationale |
|---|---|---|
| Post-level metrics (views, read rate, email opens, clicks, referrers) | None discovered | Dashboard-only. Likely server-rendered pages, not a REST API. No reference project has discovered analytics endpoints. |
| Subscriber growth (net change, sources, churn) | None discovered | Dashboard-only. Aggregate `subscriber_count` available but no trend data. |
| Email performance (delivery rate, open rate, click rate, unsubscribes) | None discovered | Dashboard-only. Per-email stats not exposed via API. |
| Revenue (new paid subscribers, churn, MRR) | None discovered | Dashboard-only. Tied to Stripe-connected billing backend. |
| CSV export | None discovered | Browser-based file download. |

**Verdict**: Browser automation might scrape the analytics dashboard pages but is inherently unreliable (DOM-dependent, rate-limiting risk, authentication complexity). Not suitable for a CLI tool. **Not implementable via API.**

---

### Revenue & Billing (Tiers, Pricing, Payouts, Tax Forms)

**Endpoint status: NO KNOWN API**

| Sub-feature | Known endpoint | Rationale |
|---|---|---|
| Subscription tiers and pricing | None discovered | May be embedded in publication settings but not yet mapped. Sensitive financial data. |
| Payout history and schedule | None discovered | Stripe-connected, dashboard-only. Deliberately excluded from CLI for security reasons. |
| Tax forms and settings | None discovered | Sensitive personally identifiable information (PII). Deliberately excluded. |
| Refund management | None discovered | Stripe-connected, dashboard-only. |
| Boosted posts / promotion | None discovered | Paid promotion flow, not discoverable from read-only surface. |
| `payments_state` (read-only) | Available on publication object | Already implemented. Gives free/paid/suspended status only. |

**Verdict**: `payments_state` is available read-only. Tiers/pricing may be partially discoverable. Payouts, refunds, and tax forms are sensitive financial data that should remain dashboard-only for security. **Partially implementable (tiers/pricing) but deliberately excluded for security.**

---

### Email & Newsletter Design (Templates, Header/Footer, Colors)

**Endpoint status: NO KNOWN API**

| Sub-feature | Known endpoint | Rationale |
|---|---|---|
| Email template design (header, footer, colors, logo) | None discovered | May be part of the publication settings payload (not yet confirmed). Dashboard-only configuration. |
| Subject line and preview text | Per-draft field (`should_send_email`) | Already partially available. Subject/preview likely in draft payload but not wired into frontmatter. |
| Test email sending | None discovered | Likely has an API endpoint but not yet discovered. |
| Broadcast history | None discovered | Dashboard-only. |

**Verdict**: Template settings may be partially in the publication payload (undiscovered). Subject/preview text is likely in draft fields. Broadcast history is not API-accessible. **Partially implementable.**

---

### Podcast Management (RSS Feed, Episodes, Audio Upload)

**Endpoint status: NO KNOWN API (separate audio upload pipeline)**

| Sub-feature | Known endpoint | Rationale |
|---|---|---|
| Audio file upload | None discovered | Image upload works via `POST /api/v1/image/upload` (base64 JSON). Audio likely uses a different pipeline (larger files, multipart upload, CDN streaming). |
| Episode scheduling | Possibly via draft fields | `draft_podcast_url` / `draft_podcast_duration` may exist in the draft payload. Not yet confirmed. |
| RSS feed management | None discovered | Dashboard-only. |
| Spotify/Apple Podcasts distribution | None discovered | OAuth-configured, dashboard-only. |

**Verdict**: Podcast scheduling may be partially feasible via undiscovered draft fields. Audio upload requires endpoint discovery for a separate file upload pipeline. Distribution is OAuth-configured. **Partially implementable (scheduling only).**

---

### Video Management (Native Upload, Transcoding, Thumbnails)

**Endpoint status: NO KNOWN API**

| Sub-feature | Known endpoint | Rationale |
|---|---|---|
| Native video upload | None discovered | Significantly different infrastructure from image upload. Transcoding pipeline is complex. No endpoint discovered in any reference project. |
| Video player settings | None discovered | Dashboard-only. |
| Thumbnail management | None discovered | Dashboard-only. |

**Verdict**: Video upload/transcoding is a fundamentally different infrastructure from the image upload pipeline and requires significant endpoint discovery. **Not implementable.**

---

### Cross-posting (To Other Platforms)

**Endpoint status: NO KNOWN API**

| Sub-feature | Known endpoint | Rationale |
|---|---|---|
| Cross-publish to other platforms | None discovered | Likely browser-based OAuth flow to each platform. Requires per-platform integration. |
| WordPress import | None discovered | Dashboard-only (file upload, mapping UI). |
| Zapier / IFTTT / Discord / Slack integrations | None discovered | OAuth configuration flows, inherently web-based. |
| External API tokens | None discovered | May have an undiscovered endpoint. |

**Verdict**: Cross-posting and integrations are inherently web-based OAuth configuration flows. **Not implementable via CLI.**

---

### Subscriber CRUD (Add, Remove, Import, Export)

**Endpoint status: AGGREGATE ONLY**

| Sub-feature | Known endpoint | Rationale |
|---|---|---|
| Subscriber list | `GET /api/v1/subscribers` — **NOT discovered** | No reference project has discovered a subscriber list endpoint. |
| CSV import/export | None discovered | Browser-based file upload/download. |
| Segments (by activity, tier, source) | None discovered | Dashboard-only. |
| Suppression / bounce management | None discovered | Dashboard-only. |
| Gift subscriptions | None discovered | Dashboard-only. |
| Referral programs | None discovered | Dashboard-only. |
| Aggregate subscriber count | `fetchPublicationChecklist()` | Already implemented via `api subscriber count`. |

**Verdict**: Aggregate count is available. Full list, import/export, segments, and management are not API-accessible. Common pattern across publishing platforms suggests `/api/v1/subscribers` is likely, but remains undiscovered. **Partially implementable (aggregate count only).**

---

### Comments — Write Operations (Moderate, Delete, Reply)

**Endpoint status: READ-ONLY AVAILABLE, WRITE NOT DISCOVERED**

| Sub-feature | Known endpoint | Rationale |
|---|---|---|
| Read comments on a post | `GET /api/v1/comments` (via substack-api library) | Already implemented via `api comment get` and `substack-adapter`. |
| Moderate (approve, delete, pin) | None discovered | Moderation endpoints not discovered. |
| Reply to comments | None discovered | Likely exists but not discovered. |
| Spam detection and quarantine | None discovered | Dashboard-only. |
| Commenter management (mute, ban) | None discovered | Dashboard-only. |
| Threaded reply settings | None discovered | Dashboard-only. |

**Verdict**: Read-only is implemented and working. Write endpoints (moderate, delete, reply) have not been discovered but may exist. **Partially implementable (read works, write needs discovery).**

---

### Publication Settings — Write Operations (Update Name, Logo, Colors)

**Endpoint status: READ-ONLY AVAILABLE, WRITE NOT DISCOVERED**

| Sub-feature | Known endpoint | Rationale |
|---|---|---|
| Read publication settings | Publication object via `fetchPublication()` | Already implemented with rich schema (name, subdomain, colors, fonts, logos, custom domain). Exposed via `api publication get` and `api publication settings`. |
| Update name, description | `POST /api/v1/publication/update` — **NOT discovered** | Write endpoint not found in any reference project. |
| Update logo, favicon | None discovered | Image upload + settings update. |
| Update colors, fonts | None discovered | Dashboard-only configuration. |
| Layout: featured posts, section ordering, homepage design | None discovered | Drag-and-drop UI, not CLI-accessible. |
| Navigation: custom links, pages, archives | None discovered | Dashboard-only. |
| SEO: custom domain, meta tags, Open Graph, Twitter cards | Partially available | Custom domain read is implemented (`fetchDomainStatus()`). SEO meta tags not discovered. |

**Verdict**: Rich read schema is implemented. Write endpoints for publication settings update have not been discovered. Homepage layout is inherently drag-and-drop. **Partially implementable (read works, write needs discovery).**

---

## Recommendations

### Tier 1: Invest effort to discover endpoints
These are high-value and likely have undiscovered API endpoints:
1. **Subscriber list** — common pattern across publishing platforms; check for `/api/v1/subscribers` or `/api/v1/publication/subscribers`
2. **Publication settings write** — check for `PUT /api/v1/publication` or `POST /api/v1/publication/update`
3. **Subject line and preview text** — likely already in the draft payload fields but not wired into frontmatter
4. **Comments — reply** — likely `POST /api/v1/comments/{id}/reply` or similar

### Tier 2: Browser automation fallback
These can be implemented via browser automation with lower reliability:
1. **CSV subscriber export** — navigate to dashboard, click export, capture download
2. **Analytics snapshots** — navigate to analytics pages, scrape data tables for post-level metrics
3. **Email template settings** — navigate to settings page, scrape current values for template/header/footer

### Tier 3: Leave to web UI
These are fundamentally web-based and low-value for CLI automation:
1. **OAuth integrations** (Zapier, Discord, Slack, Spotify, Apple Podcasts)
2. **Stripe-connected flows** (payouts, tax forms, refunds) — security-sensitive
3. **WordPress import** (file upload + mapping UI)
4. **Chat/DMs** (real-time WebSocket protocol)
5. **Drag-and-drop layout customization** (homepage design, section ordering)
6. **Audio/video upload** (requires proprietary transcoding pipeline)
7. **Revenue/billing management** (deliberately excluded for security)

## Dependencies

- Track 06 (API Auth) — all endpoint discovery requires authenticated sessions
- Track 07 (API Read Model) — patterns for new endpoint integration
- Track 13 (Dependency and Discovery Register) — ongoing endpoint discovery and documentation

## Acceptance Criteria

- All tracked platform gaps are documented with known-status (verified/exists/not-found)
- Each gap includes a verdict: implementable, partially implementable, or not implementable
- Each gap includes a rationale table organized by sub-feature
- Tier 1 endpoints have concrete next steps for discovery
- Tier 2 items have browser automation strategy sketches
- Tier 3 items document why they are excluded
- The document is linked from `docs/substack-feature-coverage.md`
