# Feature Comparison Matrix: Substack Publishing Tools

Reviewed: 2026-05-02

## Tools Compared

| Tool | Description | Language | Repository |
|---|---|---|---|
| **substack-cli** | TypeScript CLI for publishing local Markdown to Substack via browser automation and internal API | TypeScript | this project |
| **python-substack** | Python library + MCP for Substack draft/post management via internal API | Python | [ma2za/python-substack](https://github.com/ma2za/python-substack) |
| **substack-mcp** | MCP server for reading publications and managing drafts (no publish/delete by design) | TypeScript | [conorbronsdon/substack-mcp](https://github.com/conorbronsdon/substack-mcp) |
| **substack-api** | TypeScript entity client for Substack read/write operations | TypeScript | [jakub-k-slys/substack-api](https://github.com/jakub-k-slys/substack-api) |

## Feature Matrix

| Feature | substack-cli | python-substack | substack-mcp | substack-api |
|---|---|---|---|---|
| **Parse Markdown** | ✅ | ✅ | ✅ | ❌ |
| **Frontmatter metadata** | ✅ | ⚠️ | ❌ | ❌ |
| **Custom image nodes** | ✅ | ✅ | 🟡 | 🟡 |
| **Tables** | ✅ | 🟡 | 🟡 | 🟡 |
| **Embeds (YouTube, podcast)** | ✅ | ⚠️ | 🟡 | 🟡 |
| **Paywall/subscribe widgets** | ✅ | ✅ | ❌ | 🟡 |
| **Browser automation** | ✅ | ❌ | ❌ | ❌ |
| **CAPTCHA handling** | ✅ | ❌ | ❌ | ❌ |
| **Retry logic** | ⚠️ | 🟡 | 🟡 | 🟡 |
| **API draft/create** | ✅ | ✅ | ✅ | ✅ |
| **API publish** | ✅ | ✅ | ❌ | ✅ |
| **API schedule** | ✅ | 🟡 | ❌ | ❌ |
| **API media upload** | ✅ | ✅ | ✅ | 🟡 |
| **Draft update/reuse** | ✅ | ✅ | ✅ | 🟡 |
| **MCP integration** | ✅ | ✅ | ✅ | ❌ |
| **Transport fallback (browser/api/auto)** | ✅ | ❌ | ❌ | ❌ |
| **Trace/audit commands** | ✅ | ❌ | ❌ | ❌ |
| **Diagnostic commands** | ✅ | ❌ | ❌ | ✅ |
| **Section management** | ✅ | ✅ | ❌ | 🟡 |
| **Draft inventory** | ✅ | ❌ | ✅ | ✅ |
| **TypeScript/type safety** | ✅ | ❌ | ✅ | ✅ |
| **E2E tests** | ✅ | 🟡 | 🟡 | ✅ |
| **CI/quality tooling** | ✅ | ⚠️ | ⚠️ | ✅ |
| **License** | MIT | MIT | MIT | MIT |

### Legend

| Icon | Meaning |
|---|---|
| ✅ | Supported |
| ❌ | Not supported |
| ⚠️ | Partial / limited support |
| 🟡 | Unknown (not evident from documentation) |

## Detailed Notes

### substack-cli — Unique Advantages

1. **Dual-transport architecture** (`--transport browser|api|auto`) — this CLI is the only tool that supports both browser automation (safe, CAPTCHA-proof, manually reviewed) and direct internal API calls (fast, scriptable). The `auto` transport defaults to browser as the safe fallback. All three lifecycle commands (draft, publish, schedule) work across both transports.

2. **Browser automation with CAPTCHA handling** — Uses Stagehand, Browserbase, and local Playwright profiles to drive the real Substack editor. Login happens through the real Substack login page (manual or `--auto-login`), which avoids CAPTCHA and session-blocking issues that plague cookie-reuse approaches. The only tool with a real browser workflow.

3. **Comprehensive content pipeline** — Markdown → HTML → Tiptap/ProseMirror JSON with full support for: headings, bold/italic/links/inline code, images with captions, GFM tables, YouTube embeds, podcast embeds, generic URL embeds, horizontal rules, blockquotes, code blocks, lists, paywall dividers, and subscribe widget placeholders. Captured schema fixtures are validated on every test run to detect drift.

4. **Trace and audit commands** — The only tool with structured workflow trace capture (`trace review`, `trace compare`, `trace fixture`) and diagnostic commands (`doctor`, `policy`, `debug local-page`, `debug publish-screen`). These make non-reproducible browser issues debuggable.

5. **MCP integration** — Exposes 21 MCP tools, 2 redacted resources, and 2 prompts for read-only inventory, schema inspection, trace review, draft contract inference, duplicate detection, section resolution, diagnostics, media inspection, and Creator OS planning. Write flows (publish, schedule, draft, config, auth login) are intentionally excluded from the MCP surface for safety.

6. **Draft mapping and lifecycle tracking** — Persists local source-file-to-Substack-draft-ID mappings under `.substack-cli/draft-mappings.json`. Detects existing drafts and reuses them on re-run (PUT instead of POST). Supports duplicate draft detection against read-only inventory.

7. **Prepublish validation** — `prepublish` command validates payload compatibility, audience settings, tags, subtitle, and section before any network call. Provides a safety gate before publish/schedule.

8. **Quality and safety** — TypeScript strict mode, ESLint with type-aware rules, Prettier, Vitest with V8 coverage, Stryker mutation testing (CI-gated at 50% break threshold), GitHub Actions CI (format / lint / typecheck / coverage / audit / secret scan), Renovate for dependency updates, distribution policy checks, and ADRs documenting design decisions.

### python-substack (ma2za)

- Most complete Python option. Supports email/password **and** cookie auth.
- MCP FastMCP server included for agent integration.
- YAML-based post definitions are a unique approach to structured content.
- Limited pacing/schedule support. No browser automation. No trace/diagnostic commands.

### substack-mcp (conorbronsdon)

- Intentionally restricted to non-destructive operations (no publish, no delete, no schedule).
- Strong for AI-assisted draft creation and image upload.
- Cookie-based auth requires manual `connect.sid` extraction and periodic renewal (~90 day expiry).
- No browser workflow, no frontmatter parsing, no diagnostics.

### substack-api (jakub-k-slys)

- Most mature TypeScript client library (43 releases, 711 commits). ReadTheDocs documentation.
- Rich entity model: profiles, posts, notes, comments, likes, follows, pagination.
- No long-form draft creation from Markdown (HTML body only). No browser automation. No MCP.
- Best suited as a read-side library or reference for endpoint contracts.
