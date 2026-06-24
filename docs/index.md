# substack-cli-ts

A TypeScript CLI for publishing local Markdown files to a Substack publication.

## Quick Start

```shell
npm install
npm run build
node dist/cli.js inspect examples/basic.md
```

See the [README](https://github.com/edithatogo/substack-cli-ts) for full setup instructions.

## Key Features

- **Markdown to ProseMirror** — Converts Markdown (front matter, headings, lists, tables, images, embeds) into Substack-compatible ProseMirror JSON
- **Custom markers** — `{{paywall}}`, `{{subscribe: Label}}`, `{{youtube: URL}}`, `{{embed: URL}}`, `{{podcast: URL}}`
- **Dual transport** — Publish via Browserbase/Playwright browser automation or the Substack internal API
- **Draft lifecycle** — Create, inspect, review, compare, detect duplicates, capture fixtures
- **Publish & schedule** — Full publish and schedule workflows with dry-run, review-only, and trace capture
- **CAPTCHA handling** — Browser automation with manual login fallback and session persistence
- **MCP server** — Model Context Protocol server for AI-powered Substack interactions

## Documentation

- [Feature Matrix](feature-matrix.md) — Comparison with other Substack publishing tools
- [Substack Feature Coverage](substack-feature-coverage.md) — Detailed coverage of the Substack platform surface
- [Frontier Coverage Roadmap](frontier-coverage-roadmap.md) — Generated 100% coverage matrix view with evidence, alternatives, and decision records
- [Frontier Coverage Maintenance](frontier-coverage-maintenance.md) — How to update capabilities, evidence, decisions, and generated artifacts
- [Frontier Launch/Admin Checklist](frontier-launch-admin-checklist.md) — External launch, registry, Substack admin, support, security, and rollback gates
- [Frontier Drift Workflow](frontier-drift-workflow.md) — Official-doc and endpoint-capture drift refresh process
- [CI Hardening](ci-hardening.md) — Required gates, advisory strictness lanes, SBOM evidence, and branch protection recommendations
- [Creator OS Completion Roadmap](creator-os-completion-roadmap.md) — API versioning, evidence promotion, dependency, strictness, and CI/CD hardening roadmap
- [Autonomous Implementation Record](integrations/autonomous-implementation-record.md) — Completed execution record and external gates for integration tracks
- [AI Integration Readiness](integrations/ai-readiness-matrix.md) — MCP distribution status across AI clients and registries

## Examples & Workflows

- [Basic Workflow](examples/basic-workflow.md) — Draft, review, publish, and schedule
- [API Transport](examples/api-transport.md) — Publishing via Substack's internal API
- [Content Features](examples/content-features.md) — All supported Markdown features and custom markers
- [MCP Integration](examples/mcp-integration.md) — Using the Model Context Protocol server
- [Configuration](examples/configuration.md) — Publication URL, runtime, auth, and environment variables
- [Diagnostics & Traces](examples/diagnostics-and-traces.md) — Debugging with doctor, debug commands, and trace artifacts

## AI Client Setup

- [VS Code](integrations/vscode.md)
- [Claude](integrations/claude.md)
- [Gemini](integrations/gemini.md)
- [Codex](integrations/codex.md)
- [GitHub Copilot](integrations/copilot.md)
