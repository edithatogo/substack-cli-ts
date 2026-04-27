# Technology Stack

## Runtime and Language

- Node.js with TypeScript for the CLI runtime.
- ESM-first package structure for modern Playwright, Stagehand, and Tiptap compatibility.
- Package manager to be selected during implementation; prefer `npm` unless the project adopts `pnpm` or `yarn`.

## CLI Framework

- Use `commander` for commands and options.
- Keep commands thin and delegate work to modules under `src/`.
- Expected command modules:
  - `src/cli.ts`
  - `src/auth/`
  - `src/parser/`
  - `src/browser/`
  - `src/publish/`

## Automation Engine

- Playwright provides browser control, tracing, screenshots, and page evaluation.
- Browserbase provides optional persistent cloud browser sessions and remote execution.
- Local Stagehand runs a visible local browser with `.substack-cli/chrome-profile` for password-based login and development.
- Stagehand handles semantic navigation and actions so workflows are less dependent on brittle CSS selectors.
- Camoufox is an optional browser adapter to evaluate after the core Browserbase path works. The JavaScript ecosystem exists, but the most documented Camoufox path is still Playwright-compatible browser launch/connect rather than a first-party Substack solution.

## Content Pipeline

- Front matter parsing extracts title, subtitle, slug, tags, publish mode, and schedule time.
- Markdown parser converts local Markdown to normalized HTML.
- Tiptap converts normalized HTML into ProseMirror JSON using server-compatible utilities.
- Custom Tiptap extensions represent Substack-specific editor features:
  - paywall divider
  - subscribe widget
  - embeds
  - callout or note blocks
- Zod validates generated payload shape before browser execution.

## Browser Workflow

- `inspect`: parse and validate content without opening a browser.
- `draft`: create or update a draft, defaulting to a non-publishing flow.
- `publish`: publish only after confirmation or `--yes`.
- `schedule`: schedule only after validating an explicit timestamp.
- Browser automation should use Stagehand `observe()` before critical `act()` calls where possible.
- Direct editor-state injection remains experimental; paste/input fallback is required.

## Configuration and Secrets

- Environment variables:
  - `BROWSERBASE_API_KEY`
  - `BROWSERBASE_PROJECT_ID`
  - `STAGEHAND_MODEL`
  - `SUBSTACK_PUBLICATION_URL`
  - `SUBSTACK_EMAIL`
  - `SUBSTACK_PASSWORD`
- Local config file:
  - `.substack-cli/config.json` for non-secret defaults.
- Secure credential storage:
  - Browserbase persistent session IDs or Playwright `storageState`.
  - OS keychain adapter later if raw credentials are ever required.
  - Never commit `.env`, storage-state files, traces, or screenshots that may contain account data.

## Testing and Quality

- Unit tests for Markdown parsing, Tiptap schema output, and config validation.
- Integration tests with mocked browser/session adapters.
- Optional end-to-end tests against a controlled test publication.
- Use TypeScript strict mode, ESLint, Prettier, and Vitest.
