# Substack Feature Mapping & Contracts

> **Last updated:** 2026-05-13  
> **Status:** Living Document  
> **Purpose:** Map every Substack capability against CLI implementation status, API endpoint, and test coverage.

---

## Legend

| Icon | Meaning |
|------|---------|
| ✅ | Fully implemented and tested |
| 🔶 | Partially implemented (read-only, or CLI-accessible) |
| ❌ | Not implemented |
| 🔍 | Requires browser DevTools capture to discover endpoint |
| 📋 | Dashboard-only, no discoverable API endpoint |

---

## 1. Publication Core

### 1.1 Publication Settings

| Feature | Status | CLI Command | API Endpoint | Test File | Notes |
|---------|--------|-------------|--------------|-----------|-------|
| Publication details (name, subdomain) | ✅ | `api publication get` | `GET /api/v1/publication` | `publication.test.ts` | |
| Branding (colors, fonts, logos) | 🔶 | `api publication settings` | `GET /api/v1/publication` | `publication-settings.test.ts` | READ only |
| Logo upload | 📋 | `api publication upload-logo` | Capture needed | `safe-surfaces.test.ts` | Blocked manual/admin write |
| Favicon upload | 📋 | `api publication upload-favicon` | Capture needed | `safe-surfaces.test.ts` | Blocked manual/admin write |
| Settings write | 📋 | `api publication set --dry-run` | Capture needed | `publication-settings.test.ts` | Dry-run only; live write blocked |
| SEO metadata | 📋 | `api publication set --seo-title --dry-run` | Capture needed | `publication-settings.test.ts` | Dry-run only; live write blocked |

### 1.2 Custom Domain

| Feature | Status | CLI Command | Test File | Notes |
|---------|--------|-------------|-----------|-------|
| Domain status & DNS | ✅ | `api domain status` | `domain.test.ts` | |
| Domain set/remove | ❌ | — | — | Needs browser DevTools |

### 1.3 Team

| Feature | Status | CLI Command | Test File | Notes |
|---------|--------|-------------|-----------|-------|
| Team member list | ✅ | `api team list` | `team.test.ts` | |
| Team invite/remove/role | ❌ | — | — | Needs browser DevTools |

---

## 2. Content Creation

### 2.1 Draft Management

| Feature | Status | CLI Command | API Endpoint | Test File |
|---------|--------|-------------|--------------|-----------|
| Create draft | ✅ | `draft`, `api draft create --live` | `POST /api/v1/drafts` | `draft-write.test.ts` |
| Update draft | ✅ | `draft` (auto-update) | `PUT /api/v1/drafts/{id}` | `draft-write.test.ts` |
| ProseMirror content | ✅ | `api payload` | Draft body | `payload.test.ts` |
| Metadata (title, subtitle, tags) | ✅ | `draft`, `api draft inspect` | Via payload | `draft-inspect.test.ts` |
| Audience setting | ✅ | Front matter `audience` | Via payload | `payload.test.ts` |
| Section assignment | ✅ | Front matter `section` | Via `draft_section_id` | `draft-section.test.ts` |
| Comments setting | ✅ | Front matter `comments` | Via payload | `payload.test.ts` |
| Email toggle | ✅ | Front matter `shouldSendEmail` | Via `should_send_email` | `payload.test.ts` |
| Draft lookup | ✅ | `api draft inspect` | `GET /api/v1/drafts` | `draft-inspect.test.ts` |
| Draft mappings | ✅ | `api draft mappings` | Local file | `draft-mappings.test.ts` |
| Duplicate detection | ✅ | `api draft duplicates` | Via read model | `draft-lookup.test.ts` |
| Section resolution | ✅ | `api draft section` | Via read model | `draft-section.test.ts` |
| Optimistic concurrency | ✅ | `last_updated_at` | 409 handling | `draft-write.test.ts` |

### 2.2 Media & Embeds

| Feature | Status | CLI Command | Test File |
|---------|--------|-------------|-----------|
| Image upload (base64) | ✅ | Built into `--transport api` | `media-upload.test.ts` |
| Image with captions | ✅ | Markdown `![caption](url)` | `media.test.ts` |
| Local image inspection | ✅ | `api media` | `media.test.ts` |
| YouTube embed | ✅ | `{{youtube:...}}` | `markdown.test.ts` |
| Generic embed | ✅ | `{{embed:...}}` | `markdown.test.ts` |

---

## 3. Publishing & Scheduling

| Feature | Status | CLI Command | Test File |
|---------|--------|-------------|-----------|
| Browser workflow (editor, tags, audience) | ✅ | `draft` (browser) | `draft-capture.test.ts` |
| Publish review flow (Continue → Send) | ✅ | `publish` (browser) | `browser-workflow.test.ts` |
| Schedule UI | ✅ | `schedule` (browser) | `browser-workflow.test.ts` |
| CAPTCHA detection | ✅ | Built into workflow | `browser-workflow.test.ts` |
| Workflow trace capture | ✅ | `--trace-out` | `workflow-trace.test.ts` |
| Prepublish validation | ✅ | `prepublish` | `prepublish.test.ts` |
| Publish via API | ✅ | `publish --transport api` | `publish-write.test.ts` |
| Schedule via API | ✅ | `schedule --transport api --at` | `publish-write.test.ts` |
| Published URL capture | ✅ | Both browser and API | `publish-write.test.ts` |

---

## 4. Read-Only API Probes

| Feature | Status | CLI Command | Test File |
|---------|--------|-------------|-----------|
| Auth status / session | ✅ | `api auth status` | `auth.test.ts` |
| Publication inventory | ✅ | `api inventory` | `read-model.test.ts` |

---

## 5. Analytics & Revenue

| Feature | Status | CLI Command | Test File |
|---------|--------|-------------|-----------|
| Analytics inventory probe | ✅ | `api analytics inventory` | `analytics.test.ts` |
| Post analytics | ✅ | `api analytics post <id>` | `analytics.test.ts` |
| Subscriber growth | ✅ | `api analytics subscribers` | `analytics.test.ts` |
| Email performance | ✅ | `api analytics email` | `analytics.test.ts` |
| Revenue analytics | ✅ | `api analytics revenue` | `analytics.test.ts` |
| Analytics snapshot | ✅ | `api analytics snapshot` | `analytics.test.ts` |
| Billing summary | ✅ | `api billing summary` | `billing.test.ts` |
| Subscription tiers | ✅ | `api billing tiers` | `billing.test.ts` |
| Payout history | ✅ | `api billing payouts` | `billing.test.ts` |
| Tax form status | ✅ | `api billing taxes` | `billing.test.ts` |

---

## 6. Email, Podcast, Video, Integrations

| Feature | Status | CLI Command | Test File |
|---------|--------|-------------|-----------|
| Email template settings | ✅ | `api email template` | `email.test.ts` |
| Broadcast history | ✅ | `api email broadcast list` | `email.test.ts` |
| Cancel broadcast | ✅ | `api email broadcast cancel` | `email.test.ts` |
| Send test email | ✅ | `api email send-test <draft-id>` | `email.test.ts` |
| Podcast section | ✅ | `api podcast section` | `podcast.test.ts` |
| Podcast episodes | ✅ | `api podcast episodes` | `podcast.test.ts` |

---

## 7. MCP Surface

| Group | Tools Count | Status |
|-------|-------------|--------|
| Read (inventory, auth) | 2 | ✅ |
| Review (schema, media, trace, policy, doctor, coverage, launch) | 12 | ✅ |
| Capture (draft inspection, contracts, duplicates) | 9 | ✅ |
| Resources (surface, summary, coverage, launch) | 7 | ✅ |
| Prompts (overview, workflow review) | 2 | ✅ |
| **Total** | **27 tools + 7 resources + 2 prompts** | **✅** |

---

## 8. Coverage Gap Analysis

| Module | Est. Coverage | Missing Tests |
|--------|--------------|---------------|
| `parser/extensions.ts` | < 50% | Extension configuration |
| `mcp/catalog.ts` | ~60% | Tool registration edge cases |
| `mcp/resources.ts` | < 50% | Resource handler edge cases |
| `mcp/prompts.ts` | < 50% | Prompt registration |
| `mcp/server.ts` | < 50% | Server creation edge cases |
| `mcp/surface.ts` | ~60% | Surface manifest building |
| `substack-api/draft-write.ts` (execute) | ~60% | Error branches (409, 4xx, no draftId) |
| `substack-api/read-model.ts` | ~70% | Error branches, schema drift |
| `substack-api/payload.ts` | ~75% | Unsupported node/mark types |
| `substack-api/media-upload.ts` | ~65% | Upload failure paths |
| `config/store.ts` | ~70% | Update edge cases |
| `util/redact.ts` | ~60% | Redaction edge cases |
| `substack-api/client.ts` | ~70% | classifyFailure branches |
| `publish/prepare.ts` | ~60% | Post preparation error paths |
| `publish/title.ts` | ~80% | Title resolution |

---

## 9. Contracts

### 9.1 Draft Write Contract
```
POST /api/v1/drafts (create) or PUT /api/v1/drafts/{id} (update)
Request: { draft_title, draft_subtitle, draft_body, draft_section_id,
           section_chosen, draft_bylines, audience?, type?, last_updated_at? }
Response: { draftId?, draftUrl?, body? }
```

### 9.2 Media Upload Contract
```
POST /api/v1/image/upload
Request: { media_image: base64 data URL, media_type }
Response: { url?, status: "ok"|"failed", error? }
```

### 9.3 Quality Contract
```
formatCheck: ✅ (Prettier passes)
lint: ✅ (ESLint @ zero warnings)
typeCheck: ✅ (tsc --noEmit)
build: ✅ (tsc -p tsconfig.json)
testCoverage: current enforced baseline in `vitest.config.ts`; long-term target is statements/branches/functions/lines ≥ 91%
mutationBreak ≥ 50
auditProd: ✅
secretScan: ✅ (no false positives)
```

### 9.4 Security Contract
```
noSecretsInCode: ✅
noSecretsInOutput: ✅ (redact() on all output)
gitignoreExcludes: .env, config/master.key, .substack-cli/, browser artifacts
sessionStorage: local Chrome profile or env vars
renovateEnabled: ✅
dependabotEnabled: ✅
```

| Podcast settings | ✅ | `api podcast settings` | `podcast.test.ts` |
| Create episode | 📋 | `api podcast create <file>` | `safe-surfaces.test.ts` |
| Schedule episode | 📋 | `api podcast schedule <id>` | `safe-surfaces.test.ts` |
| Video upload | 📋 | `api podcast video upload <file>` | `safe-surfaces.test.ts` |
| Video settings | ✅ | `api podcast video settings <id>` | `podcast.test.ts` |
| Integration list | ✅ | `api integrations list` | `integrations.test.ts` |
| Cross-post | 📋 | `api integrations crosspost <id>` | `safe-surfaces.test.ts` |
| WordPress import | 📋 | `api integrations import wordpress` | `safe-surfaces.test.ts` |
| RSS import | 📋 | `api integrations import rss` | `safe-surfaces.test.ts` |
| API tokens | ✅ | `api integrations tokens` | `integrations.test.ts` |

| Sections | ✅ | `api inventory` | `read-model.test.ts` |
| Posts | ✅ | `api inventory` | `read-model.test.ts` |
| Drafts | ✅ | `api inventory` | `read-model.test.ts` |
| Own profile | ✅ | `api profile me` | `profile.test.ts` |
| Public profile | ✅ | `api profile show <handle>` | `profile.test.ts` |
| Subscriber count | ✅ | `api subscriber count` | `subscriber.test.ts` |
| Subscriber list | ✅ | `api subscriber list` | `subscriber-list.test.ts` |
| Comments (read/moderate) | ✅ | Built into adapter | `comment-list.test.ts` |
| Notes (list/get/create) | ✅ | `api notes` | `notes.test.ts` |
| Following list | ✅ | `api following list` | — |

| Podcast embed | ✅ | `{{podcast:...}}` | `markdown.test.ts` |
| Paywall divider | ✅ | `{{paywall}}` | `markdown.test.ts` |
| Subscribe widget | ✅ | `{{subscribe}}` | `markdown.test.ts` |
| GFM Tables | ✅ | Via markdown parser | `markdown.test.ts` |
