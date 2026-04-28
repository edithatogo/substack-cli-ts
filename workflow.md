# Conductor Development Workflow

## Delivery Strategy

Develop the CLI in four phases. Each phase should end with a working milestone, tests for the implemented behavior, and updated usage notes. The default path is draft-first and dry-run-friendly; publishing requires explicit confirmation.

## Phase 1: Scaffolding and Identity Management

### Milestone 1.1: TypeScript CLI Foundation

- Initialize `package.json`, `tsconfig.json`, source directories, and build scripts.
- Add CLI commands for `auth`, `draft`, `publish`, `schedule`, and `inspect`.
- Add typed configuration loading and validation.
- Acceptance: `substack-cli --help` runs from a local build.

### Milestone 1.2: Session and Credential Management

- Implement secure storage for Browserbase session IDs and Playwright storage state.
- Add `auth login`, `auth status`, and `auth logout`.
- Add optional `auth login --auto-login` using `SUBSTACK_EMAIL` and `SUBSTACK_PASSWORD` from ignored local environment variables.
- Validate that stored sessions belong to the configured publication.
- Acceptance: credentials and session files are never written to logs, Git-tracked files, or plain text config.

## Phase 2: Content Parsing Pipeline

### Milestone 2.1: Markdown to HTML

- Read local Markdown files with front matter support.
- Convert Markdown to normalized HTML.
- Extract title, subtitle, slug, tags, publish mode, and schedule time.
- Acceptance: `inspect <file>` prints parsed metadata and sanitized HTML.

### Milestone 2.2: Tiptap ProseMirror Payload

- Configure Tiptap with the required Substack-compatible schema.
- Add custom nodes for paywall dividers and subscribe widgets.
- Generate and validate the final ProseMirror JSON object.
- Add schema-capture fixtures from user-owned manual drafts.
- Acceptance: parser tests cover standard prose, headings, links, images, paywall markers, and subscribe widgets.

## Phase 3: Browser Automation Infrastructure

### Milestone 3.1: Browserbase Connection

- Add Browserbase client configuration and session lifecycle management.
- Support persistent session reuse by publication and workspace.
- Capture traces, screenshots, and diagnostic metadata on failure.
- Acceptance: a smoke test opens the configured publication in a persistent session.

### Milestone 3.2: Stagehand Browser Adapter

- Wire Stagehand to both local and Browserbase runtimes.
- Use local runtime as the default path for password-based Substack login.
- Use `observe()` to discover critical controls before `act()`.
- Centralize browser setup in a reusable browser adapter.
- Acceptance: Stagehand receives a Playwright page from the configured runtime.

### Milestone 3.3: Optional Camoufox Compatibility Spike

- Test `camoufox-js` or a Camoufox remote server as a Playwright-compatible runtime.
- Keep the implementation behind a runtime flag such as `SUBSTACK_BROWSER_RUNTIME=camoufox`.
- Acceptance: the same browser adapter contract works with the optional runtime or the spike is documented as unsupported.

## Phase 4: Editor Injection and Publishing Workflow

### Milestone 4.1: Draft Navigation

- Use Stagehand to navigate to the Substack draft creation page.
- Confirm the authenticated publication context before editing.
- Acceptance: `draft <file>` creates or opens a draft without publishing.

### Milestone 4.2: Editor Content Insertion

- Implement a paste/input path as the reliable baseline.
- Add direct Tiptap ProseMirror editor-state injection behind `--experimental-inject-state`.
- Verify rendered content against the generated payload.
- Acceptance: dry-run mode shows the payload; live mode saves a draft with matching content.

### Milestone 4.3: Publish and Schedule

- Use Stagehand semantic actions for publish, schedule, and confirmation controls.
- Require explicit confirmation unless `--yes` is provided.
- Return the final post URL and status.
- Acceptance: controlled end-to-end tests cover draft, publish, and schedule flows.

## Cross-Cutting Requirements

- Respect platform terms, rate limits, and user-owned account boundaries.
- Do not attempt CAPTCHA solving, access-control bypass, or deceptive traffic generation.
- Keep selectors isolated behind Stagehand/browser adapters when semantic navigation needs fallback logic.
- Add structured logs with secret redaction for every command.
- Prefer dry-run support for potentially destructive publishing actions.
- Treat undocumented direct API calls as research fixtures only, not the default product path.

## Active Conductor Tracks

Detailed track files live under `tracks/`:

- `tracks/01-editor-schema-mapping.md`
- `tracks/02-content-feature-parity.md`
- `tracks/03-draft-publish-schedule.md`
- `tracks/04-browser-runtime-hardening.md`
- `tracks/05-external-project-research.md`
- `tracks/06-api-auth-session-extraction.md`
- `tracks/07-api-read-model.md`
- `tracks/08-api-draft-write-model.md`
- `tracks/09-api-content-payload-compatibility.md`
- `tracks/10-api-media-upload.md`
- `tracks/11-api-prepublish-publish-schedule.md`
- `tracks/12-transport-selection-fallback.md`
- `tracks/13-dependency-and-discovery-register.md`

Current implementation status: local draft creation is validated with the local Chrome profile. Publish, schedule, image upload, table handling, advanced Substack blocks, Browserbase runtime validation, systematic external project research, and the TypeScript internal API adapter tracks remain open work.
