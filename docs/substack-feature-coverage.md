# Substack Feature Coverage

How much of Substack's platform surface the CLI can interact with.

Percentages are qualitative estimates, not audited API parity guarantees. Rows labeled as probes or read-only mean the CLI attempts known/likely internal endpoints and returns graceful unsupported/not-found results when Substack does not expose that capability to the current session.

## Coverage by Domain

| Domain | Coverage | CLI Capabilities |
|--------|----------|-----------------|
| **Article authoring** | ~90% | Full Markdown→ProseMirror pipeline. All common rich text. Missing: captionedImage, embeddedPublication, file attachments |
| **Draft management** | ~70% | Create, update, list, duplicate detection, mapping persistence. Missing: delete, fetch by ID, version history |
| **Publishing** | ~80% | Publish, schedule, prepublish validation, dual transport. Missing: unpublish, republish |
| **Metadata/frontmatter** | ~75% | Title, subtitle, tags, audience (4 tiers), section, comments, scheduleAt. Missing: SEO title/description, social preview image |
| **Media** | ~60% | Image upload (5 formats via base64), media manifest inspection, video upload probe. Missing: native video, audio, file attachments |
| **Publication settings** | ~60% | Read/write probes for name, branding fields, colors, fonts, logos, favicon, SEO/email branding with dry-run and confirmation guards. Missing: live-confirmed parity for every dashboard setting |
| **Custom domain** | ~25% | Read custom domain, verification/SSL status, DNS instructions, set/remove probes, read-only verify refresh. Missing: confirmed mutation endpoints and continuous SSL management |
| **Email/newsletter** | ~35% | `should_send_email` field, subject/preview via title/subtitle, email template read/write probes, broadcast history/cancel probe, test email probe. Missing: confirmed full visual designer parity |
| **Sections** | ~40% | List sections, assign post to section. Missing: create, update, delete sections |
| **Subscribers** | ~25% | Subscriber count/list with filters, CSV export/import probes, segments, suppression, gift subscription probes. Missing: confirmed dashboard endpoint parity |
| **Comments** | ~35% | Comment list, moderation (approve/delete/pin/reply), settings probes, commenter mute/ban probes. Missing: spam detection, quarantine, confirmed settings/commenter endpoints |
| **Analytics** | ~20% | Probe-only: post analytics, subscriber growth with period query, email performance, revenue analytics, `json/csv/table` formatting, snapshot store. Missing: dashboard-only features and guaranteed endpoint parity |
| **Recommendations** | ~15% | Recommendation list/status/add/remove probes and MCP read-only list. Missing: confirmed dashboard endpoint parity |
| **Team** | ~25% | Team member list with default email redaction, activity/invite/remove/role-change probes. Missing: confirmed team write/activity endpoints |
| **Billing** | ~20% | Read/probe-only: payments_state, tiers, payout history, tax form status, refund/promote probes, default PII redaction. Missing: tier writes, coupons, confirmed Stripe/refund execution |
| **Podcast** | ~15% | Probe-heavy: podcast section read, episode list probe, distribution settings probe, episode create/schedule paths, video upload/settings probe. Missing: verified RSS/feed/platform parity |
| **Video** | ~10% | Probe-only: video upload and settings paths. Missing: verified native hosting, transcoding, thumbnails |
| **Notes/social** | ~20% | Notes list/get/create, following list, like/reshare/delete/reply probe. Missing: chat/DM (WebSocket) |
| **Cross-posting** | ~5% | Probe-only: cross-post, WordPress import, RSS import, API token listing. Missing: verified actual cross-posting when dashboard-only |
| **Auth** | ~80% | Cookie, email/password, session validation, multi-publication. Missing: OAuth, 2FA |

## What the CLI Focuses On

The CLI is opinionated: it covers the **publishing pipeline** end-to-end (write → draft → review → publish/schedule) while leaving Substack's broader platform features (dashboard, subscribers, analytics, design, team, billing) to the native web UI. This is by design — those areas require interactive UIs and are low-value for CLI automation.

## What the Dashboard/Website Config Does That the CLI Doesn't

### Publication Branding & Layout
- Logo, favicon, colors, fonts, button style
- Layout: featured posts, section ordering, homepage design
- Navigation: custom links, pages, archives
- SEO: custom domain, meta tags, Open Graph, Twitter cards
- Email: template design, header/footer, logo placement, colors

### Subscriber Management
- List all subscribers (email, status, tier, date)
- Import/export CSV
- Segments by activity, tier, source
- Suppression/bounce management
- Gift subscriptions
- Referral programs

### Analytics Dashboard
- Post-level: views, read rate, email opens, clicks, referrers
- Subscriber growth: net change, sources, churn
- Email: delivery rate, open rate, click rate, unsubscribes
- Revenue: new paid subscribers, churn, MRR
- Export to CSV

### Comments & Community
- Moderate: approve, delete, pin, reply
- Spam detection and quarantine
- Commenter management: mute, ban, approve
- Threaded replies settings

### Financial
- Subscription tiers and pricing
- Payout history and schedule
- Tax forms and settings
- Refund management
- Boosted posts (promotion)

### Team
- Invite, remove collaborators
- Roles: admin, editor, contributor, reader
- Activity log

### Podcast
- RSS feed management
- Episode scheduling and distribution
- Audio file hosting
- Spotify/Apple integration

### Video
- Native upload and transcoding
- Video player settings
- Thumbnail management

### Recommendations
- Publication recommendations network
- Cross-publication promotion
- Recommend other publications

### Integrations
- Zapier, IFTTT, Discord, Slack
- WordPress import
- Custom RSS import
- API tokens (external applications)

## Endpoint Gap Analysis

Known Substack internal API endpoints the CLI does NOT use:

| Endpoint | Purpose | Found In |
|----------|---------|----------|
| `GET /api/v1/archive` | List all posts with pagination | substack-mcp |
| `GET /api/v1/posts/{id}` | Single post details | substack-api |
| `GET /api/v1/sections` | Sections list (alternate) | python-substack |
| `GET /api/v1/comments` | Comments on a post | substack-api |
| `GET /api/v1/subscribers` | Subscriber list | Unknown |
| `GET /api/v1/revenue` | Revenue data | Unknown |
| `POST /api/v1/drafts/{id}/delete` | Delete a draft | Unknown |
| `POST /api/v1/posts/{id}/unpublish` | Unpublish a post | Unknown |
| `POST /api/v1/publication/update` | Update publication settings | Unknown |
| `GET /api/v1/notes` | Notes/social feed | substack-api |

## Summary

The CLI achieves high coverage of the core publishing pipeline (write → draft → review → publish/schedule) but only narrow, often read-only or probe-only coverage of Substack's broader platform (dashboard, subscribers, analytics, design, community, financial). This is intentional — the CLI serves as a local-first authoring tool, not a Substack management console. The MCP surface enables AI agents to participate in review and validation stages without exposing broad write authority.
