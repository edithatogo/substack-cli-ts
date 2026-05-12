# Architecture Overview

## Module Map

```
src/
├── cli.ts                 # Command surface — commander definitions, thin handlers
├── types.ts               # Shared TypeScript types and interfaces
│
├── auth/                  # Authentication
│   ├── local-login.ts     # Local Chrome profile login workflow
│   ├── session-store.ts   # Browserbase session persistence
│   ├── substack-login.ts  # Programmatic Substack credential login
│
├── browser/               # Browser automation
│   ├── local-browser.ts   # Local Playwright (Chromium) session
│   ├── stagehand.ts       # Browserbase/Stagehand remote session
│   ├── diagnostics.ts     # Publish screen, review overlay, schedule screen inspection
│   ├── draft-capture.ts   # HTTP traffic observation during manual draft editing
│   ├── draft-contract.ts  # Endpoint contract inference from captured traffic
│   ├── draft-contract-matrix.ts  # Multi-session contract aggregation
│
├── config/                # Configuration
│   ├── paths.ts           # State directory and file path resolution
│   ├── store.ts           # Config load/merge (local + env), update, validation
│
├── doctor/                # Diagnostics
│   ├── doctor.ts          # Configuration and runtime health checks
│
├── mcp/                   # Model Context Protocol integration
│   ├── server.ts          # stdio-based MCP server
│   ├── surface.ts         # Tool manifest and summary generation
│
├── parser/                # Content pipeline
│   ├── markdown.ts        # Markdown → HTML conversion (marked)
│   ├── html.ts            # HTML → Tiptap/ProseMirror JSON conversion
│   ├── media.ts           # Image/video/audio asset manifest extraction
│   ├── frontmatter.ts     # YAML front matter parsing
│   ├── plugins/           # Custom Tiptap extensions (paywall, subscribe)
│   ├── schema.ts          # ProseMirror schema definition
│
├── policy/                # Distribution policy
│   ├── distribution.ts    # Repository and dependency policy evaluation
│
├── publish/               # Publish pipeline
│   ├── prepare.ts         # Full post preparation (parse + convert + validate)
│   ├── prepublish.ts      # Pre-flight validation before publish/schedule
│   ├── title.ts           # Post title resolution
│   ├── transport.ts       # Transport selection (browser | api | auto)
│   ├── browser-workflow.ts # Browser-based publish/schedule orchestration
│   ├── workflow-trace.ts  # Workflow trace capture and comparison
│
├── schema/                # Schema fixtures
│   ├── fixtures.ts        # Payload capture, comparison, and validation
│
├── substack-api/          # Internal API adapter
│   ├── auth.ts            # Cookie/session material extraction and validation
│   ├── client.ts          # Low-level HTTP helpers (headers, request, error classification)
│   ├── substack-adapter.ts # Bridge to the vendored `substack-api` package
│   ├── read-model.ts      # Read-only inventory (user, publication, sections, posts, drafts)
│   ├── draft-write.ts     # Draft create/update planning and execution
│   ├── publish-write.ts   # Publish and schedule planning and execution
│   ├── payload.ts         # Substack draft payload construction
│   ├── draft-mappings.ts  # Local file → Substack draft ID persistence
│   ├── draft-lookup.ts    # Duplicate draft detection
│   ├── draft-inspect.ts   # Comprehensive draft inspection report
│   ├── draft-section.ts   # Section resolution against inventory
│   ├── publication.ts     # Publication info and checklist fetches
│   ├── domain.ts          # Custom domain status and DNS instructions
│   ├── notes.ts           # Notes CRUD (list, get, create)
│   ├── profile.ts         # Own and public profile reads
│   ├── media-upload.ts    # Image upload infrastructure
│   ├── subscriber.ts      # Subscriber count queries
│   ├── team.ts            # Team member queries
│
├── util/                  # Utilities
│   ├── redact.ts          # Credential and secret redaction
│
├── test/                  # Shared test utilities and fixtures
```

## Vendored Substack API Client

The `substack-api` package name resolves from `vendor/substack-api` via the local file dependency in `package.json`. This keeps the upstream TypeScript client editable in the repo while preserving the existing import path used by `src/substack-api/substack-adapter.ts`.

The vendored copy intentionally omits upstream sample fixtures with Windows-invalid `?` characters in filenames. Keep functional changes in `vendor/substack-api/src`, then run the root validation commands so the CLI and the vendored package stay compatible.

## Dual-Transport Design

The CLI supports two distinct methods for publishing content to Substack, selected via `--transport` (or the `TRANSPORT` config value):

### Browser Transport

Uses Playwright (locally) or Stagehand (via Browserbase) to drive the Substack editor web interface programmatically:

1. Opens the Substack publication dashboard in a real browser
2. Navigates to the text post editor
3. Pastes the generated HTML into Substack's rich text editor (Tiptap/ProseMirror)
4. Fills in title, subtitle, tags, and other metadata via DOM interaction
5. Clicks Publish or Schedule

**Best for**: Full visual fidelity, works exactly like a human editor, no reverse-engineering needed.

**Limitations**: Slower, requires browser automation dependencies, may break on Substack UI changes.

### API Transport

Uses Substack's internal JSON API directly:

1. Extracts authentication cookies from a local Chrome profile or environment variables
2. Validates the session against Substack's API
3. Constructs the draft payload (matching the same structure the web editor sends)
4. Sends a direct HTTP POST/PUT to Substack's internal API endpoints
5. Optionally executes publish or schedule via API

**Best for**: Speed and reliability, no browser needed, works in headless CI environments.

**Limitations**: Requires valid session cookies, depends on reverse-engineered API contracts, may break on API changes.

### Auto Selection

When `--transport auto` (the default), the system:

1. Checks whether valid API auth material is available
2. If yes, uses API transport for speed
3. If no, falls back to browser transport
4. Individual commands can override this with explicit `--transport browser` or `--transport api`

## Content Pipeline

```
Markdown (.md)
    │
    ▼
┌─────────────────────┐
│  Front Matter Parser │  ──  YAML metadata (title, subtitle, tags, etc.)
└─────────────────────┘
    │
    ▼
┌─────────────────────┐
│  Markdown → HTML     │  ──  marked library
└─────────────────────┘
    │
    ▼
┌─────────────────────┐
│  HTML → ProseMirror  │  ──  Tiptap HTML parser → ProseMirror JSON
│  JSON                │      Custom nodes: paywall, subscribe, mentions
└─────────────────────┘
    │
    ▼
┌─────────────────────┐
│  Draft Payload       │  ──  Substack-compatible JSON structure
│  Construction        │      (matches /api/v1/drafts endpoint contract)
└─────────────────────┘
    │
    ▼
┌─────────────────────┐          ┌─────────────────────┐
│  Browser Transport   │    OR    │  API Transport       │
│  (paste into editor) │          │  (HTTP POST/PUT)     │
└─────────────────────┘          └─────────────────────┘
    │                                  │
    ▼                                  ▼
┌─────────────────────┐          ┌─────────────────────┐
│  Substack Editor     │          │  Substack API        │
│  (web UI)            │          │  (internal)          │
└─────────────────────┘          └─────────────────────┘
```

## Authentication

The CLI supports three authentication sources for API transport:

1. **Local Chrome Profile** (`source: local-profile`) — Extracts `substack.sid` and related cookies from a locally configured Chrome user data directory. Requires a prior manual login via `auth login` or local profile seeding.

2. **Environment Variables** (`source: env`) — Reads `SUBSTACK_SESSION_ID` (and optionally `SUBSTACK_EMAIL` / `SUBSTACK_PASSWORD`) from environment or `.env`.

3. **Auto** (`source: auto`) — Tries environment variables first, then falls back to the local Chrome profile.

Authentication material is validated via a lightweight read-only probe (e.g., fetching the user profile) before any write operation.

For browser transport, authentication is handled by the real browser session — the user must be logged into Substack in the browser profile.

## Draft Mappings

The CLI maintains a local JSON file (`.substack-cli/draft-mappings.json`) that maps source Markdown files to their corresponding Substack draft IDs. This enables:

- **Idempotent draft updates** — re-running `draft` on the same file updates the existing draft instead of creating a duplicate.
- **API publish/schedule** — the publish and schedule commands require an existing draft ID obtained from a prior `draft` run.
- **Duplicate detection** — the system can scan recent posts and drafts to detect potential duplicates.

## Error Handling

- All API operations return structured `{ status, message, ... }` responses.
- Commands set `process.exitCode = 1` on failure (non-zero exit).
- Browser transport errors are captured in workflow trace artifacts for later review.
- Credentials and session tokens are redacted from all output and trace artifacts via `src/util/redact.ts`.

## Testing Strategy

| Layer              | Tool                    | Scope                                                            |
| ------------------ | ----------------------- | ---------------------------------------------------------------- |
| Unit tests         | Vitest                  | Individual module functions, parser output, payload construction |
| Fixture comparison | `schema compare`        | Regression testing of parser output against saved fixtures       |
| Contract matrix    | `draft contract-matrix` | API endpoint contract validation across browser captures         |
| Mutation testing   | Stryker                 | Test quality assessment                                          |
| E2E (planned)      | Vitest + Playwright     | Full browser workflow against live Substack                      |

## How to Add a New API Endpoint

1. Add the endpoint URL pattern to the relevant module in `src/substack-api/` (or create a new module).
2. Use the existing `client.ts` helpers (`apiHeaders`, `requestJson`, `classifyFailure`) for consistent HTTP handling.
3. Add auth material parameter — pass through `ApiAuthMaterial` from `auth.ts`.
4. Export typed request/response interfaces.
5. Wire the endpoint into `src/cli.ts` as a new command or subcommand.
6. Update `docs/api/commands.md` with the new command documentation.
7. Add tests covering success and failure cases.
