# Privacy

This CLI is local-first. It does not operate a hosted service, subscriber database, or telemetry backend.

## Data the operator already owns

The operator supplies Substack credentials, publication URLs, Markdown, and optional browser storage-state. Those remain on the operator's machine in ignored paths (`.env`, `.substack-cli/`, traces, screenshots). This repository does not collect or store them.

## What the CLI may process locally

| Class | Examples | Persistence | Leave the machine? |
| --- | --- | --- | --- |
| Secrets | `SUBSTACK_EMAIL`, `SUBSTACK_PASSWORD`, cookies, Browserbase keys | Ignored local config only | Only when the operator runs an authenticated Substack or Browserbase command |
| Publication content | Markdown, drafts, fixtures the operator created | Workspace files the operator chooses | Only on explicit `--yes` after `--dry-run` |
| Diagnostics | Redacted logs, traces, doctor output | Local unless the operator copies them | No automatic export |
| Telemetry | Operation, outcome, format, mode, component | None by default | Only if a host registers an OpenTelemetry exporter and sets `SUBSTACK_TELEMETRY_EXPORT=host-provider` |

## Controls

- Structural redaction on diagnostic paths (`src/util/redact.ts`).
- Telemetry attribute allow-list; cookies, paths, content, and emails are dropped (`src/observability/telemetry.ts`).
- Default CI and `verify:agent` do not contact Substack.
- Secret scan (`npm run scan:secrets`) and GitHub push protection.

## Operator duties

Host applications that enable telemetry export own consent, retention, region, and exporter security. Do not commit private publication content or session files. See [observability](../operations/observability.md) and [SECURITY.md](../../SECURITY.md).
