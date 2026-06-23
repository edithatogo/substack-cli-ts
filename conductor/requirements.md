# Requirements: Substack Markdown Publisher CLI

> **Last updated:** 2026-05-13  
> **Status:** Living Document  
> **Methodology:** MoSCoW Prioritization (Must Have, Should Have, Could Have, Won't Have)

---

## M — Must Have (Critical Path)

### M1 — Markdown Parsing & Front Matter
| ID | Requirement | Verification |
|----|------------|--------------|
| M1.1 | Parse standard Markdown files (`.md`) | `inspect` command produces valid ProseMirror JSON |
| M1.2 | Extract YAML front matter (title, slug, subtitle, tags, audience, section, comments) | `preparePost()` returns `ParsedPost` with metadata |
| M1.3 | Render body as Tiptap/ProseMirror document (doc, paragraph, heading, text, bold, italic, code, link, strike, blockquote, list, codeBlock, horizontalRule, hardBreak) | Schema drift tests pass against fixtures |
| M1.4 | Support GFM tables | `@tiptap/extension-table` integration tests pass |
| M1.5 | Support image embedding with captions | `inspect` output includes image nodes |
| M1.6 | Support embed shortcodes: `{{youtube:}}`, `{{embed:}}`, `{{podcast:}}` | Embed nodes appear in ProseMirror output |
| M1.7 | Support paywall divider (`{{paywall}}`) and subscribe widget (`{{subscribe}}`) | Paywall node types are supported |

### M2 — Substack API Transport
| ID | Requirement | Verification |
|----|------------|--------------|
| M2.1 | Authenticate via extracted cookies (`substack.sid`) | `api auth status` validates session |
| M2.2 | Create drafts via `POST /api/v1/drafts` | `executeDraftWrite()` succeeds with `status: "created"` |
| M2.3 | Update drafts via `PUT /api/v1/drafts/{id}` | `executeDraftWrite()` succeeds with `status: "updated"` |
| M2.4 | Upload images to Substack via base64 data URLs | `uploadDraftMedia()` succeeds |
| M2.5 | Read publication inventory (user, publications, sections, posts, drafts) | `readApiInventory()` returns full inventory |
| M2.6 | Publish drafts via API prepublish/publish endpoints | `executePublishWrite()` succeeds |
| M2.7 | Schedule drafts via API | `executePublishWrite({ mode: "schedule" })` succeeds |

### M3 — Browser Automation
| ID | Requirement | Verification |
|----|------------|--------------|
| M3.1 | Launch local Chrome with persistent profile | `runLocalLogin()` opens browser window |
| M3.2 | Launch Browserbase remote session | `createStagehandSession()` returns connected session |
| M3.3 | Fill draft editor fields (title, subtitle, body) via Stagehand | `runBrowserWorkflow()` fills editor |
| M3.4 | Set metadata (tags, audience, section) via Stagehand | `runBrowserWorkflow()` sets metadata |
| M3.5 | Navigate publish review flow (Continue → Send) | `runBrowserWorkflow({ mode: "publish" })` completes |
| M3.6 | Handle CAPTCHA detection and retry | CAPTCHA detection runs after every navigation |

### M4 — CLI Commands
| ID | Requirement | Verification |
|----|------------|--------------|
| M4.1 | `inspect <file>` — parse and display ProseMirror output | Command exits 0 |
| M4.2 | `draft <file>` — create/update draft | `--dry-run` plans; live creates |
| M4.3 | `publish <file>` — publish after confirmation | `--yes` confirms; `--review-only` stops |
| M4.4 | `schedule <file> --at <iso>` — schedule publication | Works with both browser and API transport |
| M4.5 | `doctor` — check configuration and transport readiness | Reports status |
| M4.6 | `config show|set-publication|set-runtime` — config management | Commands work |
| M4.7 | `api auth status|inventory|payload|media` — API probes | Commands work |

### M5 — Security Fundamentals
| ID | Requirement | Verification |
|----|------------|--------------|
| M5.1 | No secrets in code or config output | `redact()` applied to all secrets |
| M5.2 | `substack.sid` stored only in local Chrome profile or env vars | Not in config files |
| M5.3 | `.gitignore` excludes `.env`, `config/master.key`, `.substack-cli/`, browser artifacts | Verified |

---

## S — Should Have (High Priority)

### S1 — Test Coverage
| ID | Requirement | Target |
|----|------------|--------|
| S1.1 | Unit test coverage > 90% (statements, branches, functions, lines) | Coverage threshold in vitest.config.ts |
| S1.2 | Mutation testing with Stryker (break threshold ≥ 50) | `npm run test:mutation` passes |
| S1.3 | Property-based testing for payload validation | `fast-check` tests for `validatePayloadCompatibility()` |
| S1.4 | Integration tests for API client with mocked fetch | `client.test.ts` covers error/success paths |

### S2 — CI/CD
| ID | Requirement | Verification |
|----|------------|--------------|
| S2.1 | GitHub Actions CI runs on PR and push to master | Workflow triggers |
| S2.2 | Quality gate: format:check → lint → typecheck → build → test:coverage | `npm run quality` passes |
| S2.3 | Mutation testing CI job | Reports uploaded as artifact |
| S2.4 | Manual E2E workflow_dispatch job | Reachable from Actions tab |
| S2.5 | Production dependency audit | `npm run audit:prod` |

### S3 — Documentation
| ID | Requirement | Verification |
|----|------------|--------------|
| S3.1 | README with badges, install/usage, examples | Present and comprehensive |
| S3.2 | CONTRIBUTING.md with development guide | Present |
| S3.3 | API command reference | `docs/api/commands.md` |
| S3.4 | Architecture documentation | `docs/api/architecture.md` |
| S3.5 | CHANGELOG.md | Present and maintained |

### S4 — MCP Integration
| ID | Requirement | Verification |
|----|------------|--------------|
| S4.1 | MCP stdio server with tool registration | `mcp serve` starts server |
| S4.2 | 27 MCP tools across read/review/capture/creator groups | All registered |
| S4.3 | 7 MCP resources (surface, summary, coverage, launch, safe-surface review) | All registered |
| S4.4 | MCP prompts (surface overview, workflow review) | Both registered |
| S4.5 | All MCP output redacted | No secrets exposed |

### S5 — Draft Management
| ID | Requirement | Verification |
|----|------------|--------------|
| S5.1 | Draft mapping persistence (source file → draft ID) | `draft-mappings.json` created |
| S5.2 | Optimistic concurrency via `serverUpdatedAt` | 409 conflict handling |
| S5.3 | Section resolution against inventory | `buildDraftSectionResolutionReport()` works |
| S5.4 | Duplicate draft detection | `buildDraftDuplicateLookupReport()` works |

---

## C — Could Have (Nice to Have)

### C1 — Additional API Modules
| ID | Requirement | Status |
|----|------------|--------|
| C1.1 | Publication settings (read) | Implemented — `fetchPublicationSettings()` |
| C1.2 | Publication settings (write) | Partially implemented — `updatePublicationSettings()` |
| C1.3 | Custom domain status | Implemented — `fetchDomainStatus()` |
| C1.4 | Team member listing | Implemented — `fetchTeamMembers()` |
| C1.5 | Subscriber count & list | Implemented — `getSubscriberCount()`, `fetchSubscriberList()` |
| C1.6 | Comments (read & moderate) | Implemented — `fetchCommentsForPost()`, `moderateComment()` |
| C1.7 | Notes (list, get, create) | Implemented — `listNotes()`, `getNote()`, `createNote()` |
| C1.8 | Analytics probes | Implemented — post, subscribers, email, revenue |
| C1.9 | Billing probes | Implemented — summary, tiers, payouts, taxes |
| C1.10 | Email template & broadcast | Implemented — `fetchEmailTemplate()`, `fetchBroadcastHistory()` |
| C1.11 | Podcast & video management | Implemented — section, episodes, settings; create, schedule, and upload writes blocked pending safe captures |
| C1.12 | Cross-posting & integrations | Implemented — list and redacted token probes; crosspost and imports blocked pending safe captures |
| C1.13 | Profile (own & public) | Implemented — `readOwnProfile()`, `readPublicProfile()` |
| C1.14 | Following list | Implemented — via `substack-api` vendored library |

### C2 — Quality of Life
| ID | Requirement | Verification |
|----|------------|--------------|
| C2.1 | Shell completion scripts (bash, zsh, powershell) | `completion` command generates |
| C2.2 | Workflow trace capture and review | `trace review`, `trace compare`, `trace fixture` |
| C2.3 | Draft capture and contract inference | `api draft capture`, `api draft contract` |
| C2.4 | Analytics snapshots | `api analytics snapshot` |
| C2.5 | Distribution policy check | `policy` command |

### C3 — Testing Depth
| ID | Requirement | Target |
|----|------------|--------|
| C3.1 | E2E tests with live Substack | Manual workflow_dispatch |
| C3.2 | Coverage badges | Present in README |
| C3.3 | Load/stress testing | Future consideration |

---

## W — Won't Have (Current Scope Exclusions)

| ID | Requirement | Reason |
|----|------------|--------|
| W1 | Native mobile apps | CLI-only scope |
| W2 | GUI/Web interface | CLI + MCP scope |
| W3 | Real-time chat/DM | WebSocket-based, not CLI-accessible |
| W4 | Recommendations engine | No endpoints discovered |
| W5 | Subscriber CRUD (import/export/segments) | No endpoints discovered |
| W6 | Chat/DM moderation | WebSocket-based, not CLI-accessible |
| W7 | Spam detection/quarantine | No endpoints discovered |
| W8 | Commenter management (mute/ban) | No endpoints discovered |
| W9 | Full publication settings write | Endpoint undiscovered (browser DevTools needed) |
| W10 | Custom domain set/remove | Endpoint undiscovered |
| W11 | Team invite/remove/role-change | Endpoint undiscovered |
| W12 | Gift subscriptions | No endpoints discovered |

---

## Cross-Cutting Concerns

| Concern | Approach |
|---------|----------|
| **Error Handling** | Typed error classes, 3 retries with exponential backoff, CAPTCHA detection |
| **Secrets Management** | Redacted output, env vars + local Chrome profile, `.gitignore` exclusion |
| **Dual Transport** | `--transport browser|api|auto` on draft/publish/schedule commands |
| **Observability** | Workflow traces, draft capture artifacts, analytics snapshots |
| **Dependency Management** | Renovate + Dependabot for automated PRs; production audit |
| **Quality Gates** | Format → Lint → TypeScript → Build → Test with enforced baseline coverage and incremental movement toward 91% → Mutation (break ≥ 50) |
