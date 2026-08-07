# CLI Commands Reference

All commands are run via `substack-cli <command> [options]`. Global options include `--help` and `--version`.

---

## `completion`

Generate shell completion scripts for bash, zsh, or PowerShell.

**Usage:**

```bash
substack-cli completion bash     # Bash completions
substack-cli completion zsh      # Zsh completions
substack-cli completion powershell  # PowerShell completions
```

**Installation:**

- **Bash / Zsh:** Add `source <(substack-cli completion <shell>)` to your `.bashrc` or `.zshrc`.
- **PowerShell:** Dot-source the shipped helper from your `$PROFILE`, or register a native completer with `substack-cli completion powershell` as its command source.
- **Script helpers:** `scripts/install-completions.sh` and `scripts/install-completions.ps1` are distributed as user-run helpers. They generate completions from the installed `substack-cli` binary at shell startup; the npm package does not ship generated `scripts/completions.*` artifacts.

---

## `inspect <file>`

Parse a Markdown file and print the generated Tiptap/ProseMirror payload.

**Arguments:**
| Name | Description |
|------|-------------|
| `file` | Markdown file to inspect |

---

## `doctor`

Check local configuration, transport readiness, and ignored runtime files. Prints a JSON diagnostic report.

---

## `policy`

Review the repository distribution and dependency policy. Prints a JSON policy report. Exits with code 1 on errors or warnings.

---

## `coverage`

Inspect the frontier coverage matrix, launch gates, and safe automation boundaries. These commands are read-only and never perform Substack mutations.

### `coverage validate`

Validate the frontier coverage matrix.

**Options:**
| Flag | Description |
|------|-------------|
| `--matrix <file>` | Optional matrix JSON fixture to validate instead of the built-in matrix |

### `coverage report`

Render the frontier coverage roadmap.

**Options:**
| Flag | Description | Default |
|------|-------------|---------|
| `--format <format>` | `json` or `markdown` | `json` |

### `coverage gaps`

Summarize coverage gaps and decision-recorded surfaces.

**Options:**
| Flag | Description |
|------|-------------|
| `--matrix <file>` | Optional matrix JSON fixture |
| `--status <status>` | Filter by status, such as `probe-only` or `manual-admin` |
| `--domain <domain>` | Filter by coverage domain |

### `coverage inspect`

Inspect a single coverage capability.

**Options:**
| Flag | Description |
|------|-------------|
| `--id <capability-id>` (required) | Capability ID to inspect |
| `--matrix <file>` | Optional matrix JSON fixture |

### `coverage safe-surfaces`

List the seven safe frontier surfaces and their planning, probe, manual, or unsupported boundaries.

### `coverage capture-validate`

Validate and minimize a redacted endpoint capture fixture.

**Options:**
| Flag | Description |
|------|-------------|
| `--fixture <file>` (required) | Capture evidence fixture JSON file |

### `coverage capture-inventory`

Render a JSON or Markdown endpoint inventory from one or more capture fixtures.

**Options:**
| Flag | Description | Default |
|------|-------------|---------|
| `--fixture <file...>` (required) | Capture evidence fixture JSON files | |
| `--format <format>` | `json` or `markdown` | `json` |
| `--out <file>` | Write output to a file instead of stdout | |

### `coverage capture-diff`

Compare two JSON endpoint inventory reports and block on added, removed, changed, or reverified endpoints.

**Options:**
| Flag | Description |
|------|-------------|
| `--before <file>` (required) | Previous JSON endpoint inventory |
| `--after <file>` (required) | Current JSON endpoint inventory |

### `coverage capture-graduation`

Check that probe-only, planning-only, and manual-admin surfaces have redacted capture, endpoint evidence, and manual validation evidence before status changes.

**Options:**
| Flag | Description |
|------|-------------|
| `--inventory <file>` (required) | JSON endpoint inventory report |
| `--matrix <file>` | Optional matrix JSON fixture |

### `coverage safe-surface`

Inspect one safe frontier surface.

**Options:**
| Flag | Description |
|------|-------------|
| `--id <surface-id>` (required) | Surface ID such as `native-video-live-automation` or `publication-admin-writes` |

### `coverage launch-check`

Validate external launch and admin follow-through gates without performing external actions.

### `coverage release-scorecard`

Report machine-readable local release readiness separately from external npm, GitHub release, MCP registry, marketplace, and Substack admin owner/admin gates. The output includes `localStatus`, `externalStatus`, aggregate counts, package metadata checks, owner-gated checklist detail, rollback notes, and prioritized `nextActions`.

### `coverage decisions`

Inspect decision records for coverage gaps and launch gates.

**Options:**
| Flag | Description |
|------|-------------|
| `--id <decision-id>` | Optional decision record ID |

---

## `mcp`

Inspect or run the MCP surface for redacted CLI summaries.

### `mcp surface`

Print the MCP surface manifest as a JSON summary.

### `mcp summary`

Print the redacted MCP summary resource as JSON.

### `mcp serve`

Run the MCP server over stdio.

---

## `prepublish <file>`

Validate the final publish or schedule payload without opening the browser.

**Arguments:**
| Name | Description |
|------|-------------|
| `file` | Markdown file to validate |

**Options:**
| Flag | Description | Default |
|------|-------------|---------|
| `--mode <mode>` | `publish` or `schedule` | `publish` |
| `--at <iso-date>` | ISO timestamp for scheduled publication | — |

Exits with code 1 if validation blocks the publish.

---

## `campaign`

Plan, validate, execute, and report Creator OS campaigns. These commands keep campaign orchestration local-first: validation and run-log planning happen in the CLI, while live Substack mutations remain behind the existing confirmed publish, schedule, and note commands.

### `campaign plan <file>`

Build a `campaign.json` artifact from a Markdown post.

**Options:**
| Flag | Description | Default |
|------|-------------|---------|
| `--publish-at <timestamp>` | Future ISO timestamp for publication | — |
| `--note-at <timestamp>` | Future ISO timestamp for a covering note. Repeatable | — |
| `--channels <channels>` | Comma-separated channels: `notes`, `linkedin`, `x`, `youtube` | `notes` |
| `--run-log-dir <dir>` | Run-log directory to include in planned commands | — |
| `--out <file>` | Write the campaign plan JSON to a file | — |

### `campaign validate`

Validate a campaign plan artifact.

**Options:**
| Flag | Description |
|------|-------------|
| `--plan <file>` (required) | Campaign plan JSON file |

### `campaign execute`

Validate campaign execution readiness and emit a run log if requested. This command does not add new live Substack mutations; it confirms that the plan can move through the existing explicit write commands.

**Options:**
| Flag | Description | Default |
|------|-------------|---------|
| `--plan <file>` (required) | Campaign plan JSON file | — |
| `--run-log-dir <dir>` | Override run-log directory for campaign execution audit | — |
| `--yes` | Confirm execution-readiness validation | `false` |

### `campaign report`

Summarize campaign and mutation run logs.

**Options:**
| Flag | Description |
|------|-------------|
| `--run-log-dir <dir>` (required) | Directory containing run-log JSON artifacts |

---

## Creator Media And Live Planning

### `media video plan`

Plan a native Substack video post without uploading the file.

**Options:**
| Flag | Description |
|------|-------------|
| `--file <file>` (required) | Video file to package |
| `--post <markdown>` (required) | Markdown post file with metadata |
| `--run-log-dir <dir>` | Write a local media planning run log |

### `media audio plan`

Plan a native Substack audio or podcast post without uploading the file.

**Options:**
| Flag | Description |
|------|-------------|
| `--file <file>` (required) | Audio file to package |
| `--post <markdown>` (required) | Markdown post file with metadata |
| `--run-log-dir <dir>` | Write a local media planning run log |

### `live plan`

Plan a Substack live video or RTMP event without creating it in the dashboard.

**Options:**
| Flag | Description | Default |
|------|-------------|---------|
| `--title <title>` (required) | Live video title | — |
| `--at <timestamp>` (required) | Future ISO timestamp for the live event | — |
| `--audience <audience>` | `everyone`, `subscribers`, or `paid` | `everyone` |
| `--run-log-dir <dir>` | Write a local live planning run log | — |

---

## Creator Analytics, Growth, And Community

### `analytics snapshot`

Capture or dry-run a Creator OS analytics snapshot. Live analytics are fetched only when `--dry-run` is omitted and a numeric `--post-id` is supplied.

**Options:**
| Flag | Description | Default |
|------|-------------|---------|
| `--post-url <url>` (required) | Post URL to attach to the snapshot | — |
| `--out <file>` (required) | Snapshot JSON output file | — |
| `--post-id <id>` | Numeric Substack post ID for live post analytics | — |
| `--campaign <id>` | Campaign ID to attach | — |
| `--source <source>` | `auto`, `env`, or `local-profile` | `auto` |
| `--run-log-dir <dir>` | Write a local analytics snapshot run log | — |
| `--dry-run` | Build the snapshot shape without fetching or writing live analytics | `false` |

### `analytics trend`

Summarize growth trends from local snapshot artifacts.

**Options:**
| Flag | Description |
|------|-------------|
| `--snapshots-dir <dir>` (required) | Directory containing snapshot JSON or JSONL files |

### `growth report`

Build a campaign growth report from a campaign plan and optional snapshots.

**Options:**
| Flag | Description |
|------|-------------|
| `--campaign <file>` (required) | Campaign plan JSON file |
| `--snapshots-dir <dir>` | Directory containing analytics snapshots |

---

## `warehouse`

Export local-first Creator OS warehouse tables, attribution reports, and funnel reports from existing campaign plans, analytics snapshots, and run logs. This surface writes local JSON/CSV only; it does not perform live Substack mutations or subscriber imports.

### `warehouse export`

Normalize campaigns, posts, Notes, referrers, subscriber growth probes, revenue probes, and run logs into local tables.

**Options:**
| Flag | Description | Default |
|------|-------------|---------|
| `--campaign <file>` | Campaign plan JSON file. Repeatable | — |
| `--analytics-dir <dir>` | Directory containing analytics snapshot JSON or JSONL files | — |
| `--run-log-dir <dir>` | Directory containing run-log JSON artifacts | — |
| `--out-dir <dir>` (required) | Directory for warehouse exports | — |
| `--format <format>` | `json`, `csv`, or `both` | `both` |

### `warehouse attribution`

Build a campaign/cohort attribution report from the same local inputs.

**Options:**
| Flag | Description | Default |
|------|-------------|---------|
| `--campaign <file>` | Campaign plan JSON file. Repeatable | — |
| `--analytics-dir <dir>` | Directory containing analytics snapshot JSON or JSONL files | — |
| `--run-log-dir <dir>` | Directory containing run-log JSON artifacts | — |
| `--out <file>` | Write attribution report JSON to a file | — |

### `warehouse funnel`

Build a campaign funnel report from the same local inputs, including planned posts, analytics-observed posts, scheduled Notes, successful run-log actions, views, read rate, email opens/clicks, subscriber net change, and revenue.

**Options:**
| Flag | Description | Default |
|------|-------------|---------|
| `--campaign <file>` | Campaign plan JSON file. Repeatable | — |
| `--analytics-dir <dir>` | Directory containing analytics snapshot JSON or JSONL files | — |
| `--run-log-dir <dir>` | Directory containing run-log JSON artifacts | — |
| `--out <file>` | Write funnel report JSON to a file | — |

---

## `backup`

Plan and validate redacted export-first backup snapshots. Restore remains a manual checklist because subscriber, revenue, and schedule recovery can expose private data or mutate publication state.

### `backup plan`

Write a redacted backup snapshot plan, validate local source artifacts, and record source
integrity manifests. File sources include size and SHA-256; directory sources are recorded as
directories without recursive hashing. The command blocks plans where the snapshot would be
written inside a source artifact.

**Options:**
| Flag | Description |
|------|-------------|
| `--snapshot <file>` (required) | Snapshot plan JSON output file |
| `--publication-url <url>` | Publication URL to redact into the plan |
| `--source <path>` | Local source path to validate. Repeatable |

### `backup validate`

Validate a backup snapshot plan and print the manual restore checklist.

**Options:**
| Flag | Description |
|------|-------------|
| `--snapshot <file>` (required) | Snapshot plan JSON file |

### `recommendations inspect`

Probe recommendations availability for the current publication.

**Options:**
| Flag | Description | Default |
|------|-------------|---------|
| `--source <source>` | `auto`, `env`, or `local-profile` | `auto` |

### `boost inspect`

Probe Boost availability for the current publication.

**Options:**
| Flag | Description | Default |
|------|-------------|---------|
| `--source <source>` | `auto`, `env`, or `local-profile` | `auto` |

### `comments triage`

Fetch and triage comments for follow-up, testimonials, and moderation.

**Options:**
| Flag | Description | Default |
|------|-------------|---------|
| `--post-id <id>` (required) | Post ID to triage | — |
| `--limit <limit>` | Maximum comments to inspect | `100` |
| `--source <source>` | `auto`, `env`, or `local-profile` | `auto` |

### `notes campaign`

Validate a campaign note schedule file without live note writes.

**Options:**
| Flag | Description |
|------|-------------|
| `--post-url <url>` (required) | Post URL expected in each campaign note |
| `--schedule-file <file>` (required) | JSON note schedule file |
| `--limit <limit>` | Maximum selected note items to validate |

---

## `trace`

Review stored browser workflow trace artifacts.

### `trace review <file>`

Review a saved browser workflow trace artifact.

**Arguments:**
| Name | Description |
|------|-------------|
| `file` | Workflow trace JSON file to review |

### `trace compare <expected-file> <actual-file>`

Compare two saved browser workflow trace artifacts. Exits with code 1 if not equal.

### `trace fixture <file>`

Write a normalized browser workflow trace fixture.

**Arguments:**
| Name | Description |
|------|-------------|
| `file` | Workflow trace JSON file to normalize |

**Options:**
| Flag | Description |
|------|-------------|
| `--out <file>` (required) | Fixture JSON output path |

---

## `draft <file>`

Create or update a Substack draft from Markdown.

**Arguments:**
| Name | Description |
|------|-------------|
| `file` | Markdown file to draft |

**Options:**
| Flag | Description | Default |
|------|-------------|---------|
| `--dry-run` | Print generated payload without opening a browser | `false` |
| `--session-id <id>` | Browserbase session ID to resume | — |
| `--trace-out <file>` | Write workflow result JSON to a file | — |
| `--experimental-inject-state` | Use experimental editor-state injection | `false` |
| `--transport <transport>` | `browser`, `api`, or `auto` | `auto` |

---

## `publish <file>`

Publish a Markdown file after explicit confirmation.

**Arguments:**
| Name | Description |
|------|-------------|
| `file` | Markdown file to publish |

**Options:**
| Flag | Description | Default |
|------|-------------|---------|
| `--dry-run` | Print generated payload without opening a browser | `false` |
| `--yes` | Confirm publishing without an interactive prompt | `false` |
| `--session-id <id>` | Browserbase session ID to resume | — |
| `--trace-out <file>` | Write workflow result JSON to a file | — |
| `--experimental-inject-state` | Use experimental editor-state injection | `false` |
| `--review-only` | Stop at the publish review screen without clicking Publish | `false` |
| `--transport <transport>` | `browser`, `api`, or `auto` | `auto` |

---

## `schedule <file>`

Schedule a Markdown file for future publication.

**Arguments:**
| Name | Description |
|------|-------------|
| `file` | Markdown file to schedule |

**Options:**
| Flag | Description | Default |
|------|-------------|---------|
| `--at <iso-date>` (required) | ISO timestamp for scheduled publication | — |
| `--dry-run` | Print generated payload without opening a browser | `false` |
| `--yes` | Confirm scheduling without an interactive prompt | `false` |
| `--session-id <id>` | Browserbase session ID to resume | — |
| `--trace-out <file>` | Write workflow result JSON to a file | — |
| `--experimental-inject-state` | Use experimental editor-state injection | `false` |
| `--review-only` | Stop at the schedule review screen without clicking Schedule | `false` |
| `--transport <transport>` | `browser`, `api`, or `auto` | `auto` |

---

## `schema`

Validate and capture ProseMirror schema fixtures.

### `schema validate <file>`

Validate a ProseMirror JSON file or captured fixture.

### `schema capture <markdown-file>`

Capture the generated payload for a Markdown file as a schema fixture.

**Options:**
| Flag | Description |
|------|-------------|
| `--out <file>` (required) | Fixture JSON output path |

### `schema compare <markdown-file> <fixture-file>`

Compare a Markdown file's current generated document with a saved fixture. Exits with code 1 if not equal.

---

## `api`

Read-only internal API probes and API transport tools.

### `api auth status`

Extract and validate API authentication material.

**Options:**
| Flag | Description | Default |
|------|-------------|---------|
| `--source <source>` | `auto`, `env`, or `local-profile` | `auto` |
| `--no-validate` | Skip read-only Substack validation probes | — |

### `api payload <file>`

Build the write-compatible Substack draft payload for a Markdown file.

### `api media <file>`

Inspect the parsed media manifest for a Markdown file.

### `api inventory`

Read user and publication inventory through read-only API probes.

**Options:**
| Flag | Description | Default |
|------|-------------|---------|
| `--source <source>` | `auto`, `env`, or `local-profile` | `auto` |
| `--post-limit <limit>` | Maximum number of recent posts to include | `10` |
| `--draft-limit <limit>` | Maximum number of drafts to include | `10` |

### `api draft create <file>`

Build and validate a draft creation request without publishing content.

**Options:**
| Flag | Description | Default |
|------|-------------|---------|
| `--source <source>` | `none`, `auto`, `env`, or `local-profile` | `none` |
| `--live` | Attempt the live write request after endpoint contract confirmation | `false` |

### `api draft unschedule`

Build a safe unschedule plan for an existing draft. Live execution is disabled pending endpoint confirmation.

**Options:**
| Flag | Description | Default |
|------|-------------|---------|
| `--draft-id <id>` (required) | Substack draft ID to unschedule | — |
| `--draft-url <url>` | Optional draft editor URL override | — |
| `--draft-limit <limit>` | Max drafts to inspect from API inventory | `50` |
| `--source <source>` | `auto`, `env`, or `local-profile` | `auto` |
| `--live` | Attempt live execution after endpoint confirmation (disabled by default) | `false` |

### `api draft revise`

Build a safe published-post revision plan that preserves URL. Live execution is disabled pending endpoint confirmation.

**Options:**
| Flag | Description | Default |
|------|-------------|---------|
| `--draft-id <id>` (required) | Substack draft ID to revise | — |
| `--published-url <url>` | Published URL to preserve | — |
| `--draft-limit <limit>` | Max drafts to inspect from API inventory | `50` |
| `--source <source>` | `auto`, `env`, or `local-profile` | `auto` |
| `--keep-url` | Preserve canonical URL when replacing content | `true` |
| `--live` | Attempt live execution after endpoint confirmation | `false` |

### `api draft probe`

Probe likely draft unschedule and revision endpoint shapes without performing writes.

**Options:**
| Flag | Description | Default |
|------|-------------|---------|
| `--draft-id <id>` (required) | Substack draft ID to probe | — |
| `--source <source>` | `auto`, `env`, or `local-profile` | `auto` |
| `--out <file>` | Write the probe artifact JSON report | — |

### `api draft inspect <file>`

Bundle payload compatibility, section resolution, duplicate lookup, and draft planning.

**Options:**
| Flag | Description | Default |
|------|-------------|---------|
| `--source <source>` | `auto`, `env`, or `local-profile` | `auto` |

### `api draft mappings`

List local source-file to Substack draft mappings.

### `api draft observe [url]`

Watch local browser traffic while manually creating or saving a draft.

**Options:**
| Flag | Description | Default |
|------|-------------|---------|
| `--timeout-seconds <seconds>` | How long to observe network traffic | `180` |

### `api draft contract <file>`

Infer likely draft create/update/fetch endpoints from a saved draft capture artifact.

### `api draft contract-matrix <files...>`

Merge multiple draft capture artifacts into one inferred contract matrix.

**Options:**
| Flag | Description |
|------|-------------|
| `--out <file>` | Write the matrix fixture to a file |

### `api draft contract-matrix-compare <expected-file> <actual-file>`

Compare two draft contract matrix fixtures. Exits with code 1 if not equal.

### `api draft review <file>`

Review a saved draft capture artifact and print a summary.

### `api draft compare <expected-file> <actual-file>`

Compare two saved draft capture artifacts. Exits with code 1 if not equal.

### `api draft fixture <file>`

Write a normalized draft capture fixture from a saved artifact.

**Options:**
| Flag | Description |
|------|-------------|
| `--out <file>` (required) | Fixture JSON output path |

### `api draft link <file>`

Record a local source-file to Substack draft mapping.

**Options:**
| Flag | Description |
|------|-------------|
| `--draft-id <id>` (required) | Substack draft ID |
| `--draft-url <url>` | Substack draft editor URL |
| `--title <title>` | Draft title to store |
| `--slug <slug>` | Draft slug to store |

### `api draft duplicates <file>`

Look up likely duplicate drafts using the read-only inventory and local mappings.

**Options:**
| Flag | Description | Default |
|------|-------------|---------|
| `--source <source>` | `auto`, `env`, or `local-profile` | `auto` |
| `--post-limit <limit>` | Maximum number of recent posts to inspect | `10` |

### `api draft section <file>`

Resolve a draft section against the current read-only inventory.

**Options:**
| Flag | Description | Default |
|------|-------------|---------|
| `--source <source>` | `auto`, `env`, or `local-profile` | `auto` |

### `api notes list`

List recent notes from your profile.

**Options:**
| Flag | Description | Default |
|------|-------------|---------|
| `--limit <limit>` | Maximum number of notes to list | `10` |
| `--source <source>` | `auto`, `env`, or `local-profile` | `auto` |

### `api notes get <id>`

Get full details for a specific note by ID.

**Options:**
| Flag | Description | Default |
|------|-------------|---------|
| `--source <source>` | `auto`, `env`, or `local-profile` | `auto` |

### `api notes create`

[EXPERIMENTAL] Publish a note immediately. This action cannot be undone.

**Options:**
| Flag | Description |
|------|-------------|
| `--body <text>` (required) | Note body text |
| `--yes` (required) | Confirm note publication |
| `--source <source>` | `auto`, `env`, or `local-profile` (default: `auto`) |

### `api notes delete <id>`

Delete a note. Requires `--yes`.

**Options:**
| Flag | Description |
|------|-------------|
| `--yes` (required) | Confirm note deletion |
| `--source <source>` | `auto`, `env`, or `local-profile` (default: `auto`) |

### `api notes like <id>`

Like a note. Requires `--yes`.

**Options:**
| Flag | Description |
|------|-------------|
| `--yes` (required) | Confirm note like |
| `--source <source>` | `auto`, `env`, or `local-profile` (default: `auto`) |

### `api notes reshare <id>`

Reshare a note. Requires `--yes`.

**Options:**
| Flag | Description |
|------|-------------|
| `--yes` (required) | Confirm note reshare |
| `--source <source>` | `auto`, `env`, or `local-profile` (default: `auto`) |

### `api notes reply <id> <text>`

[PROBE] Reply to a note. Requires `--yes`.

**Options:**
| Flag | Description |
|------|-------------|
| `--yes` (required) | Confirm note reply |
| `--source <source>` | `auto`, `env`, or `local-profile` (default: `auto`) |

### `api recommendation list`

[PROBE] List recommended and recommending publications.

**Options:**
| Flag | Description | Default |
|------|-------------|---------|
| `--source <source>` | `auto`, `env`, or `local-profile` | `auto` |

### `api recommendation status <publication-url>`

[PROBE] Check recommendation status for another publication.

**Options:**
| Flag | Description | Default |
|------|-------------|---------|
| `--source <source>` | `auto`, `env`, or `local-profile` | `auto` |

### `api recommendation add <publication-url>`

[PROBE] Recommend another publication. Requires `--yes`.

**Options:**
| Flag | Description |
|------|-------------|
| `--yes` (required) | Confirm recommendation |
| `--source <source>` | `auto`, `env`, or `local-profile` (default: `auto`) |

### `api recommendation remove <publication-url>`

[PROBE] Remove a publication recommendation. Requires `--yes`.

**Options:**
| Flag | Description |
|------|-------------|
| `--yes` (required) | Confirm recommendation removal |
| `--source <source>` | `auto`, `env`, or `local-profile` (default: `auto`) |

### `api comment list <post-id>`

List comments for a post.

**Options:**
| Flag | Description | Default |
|------|-------------|---------|
| `--source <source>` | `auto`, `env`, or `local-profile` | `auto` |
| `--limit <limit>` | Maximum comments to return | `50` |
| `--status <status>` | Optional status filter, such as `held` or `approved` | — |

### `api comment get <comment-id>`

Get a single comment by ID.

**Options:**
| Flag | Description | Default |
|------|-------------|---------|
| `--source <source>` | `auto`, `env`, or `local-profile` | `auto` |

### `api comment approve <comment-id>`

Approve a held comment. Requires `--yes`.

**Options:**
| Flag | Description |
|------|-------------|
| `--yes` (required) | Confirm moderation action |
| `--source <source>` | `auto`, `env`, or `local-profile` (default: `auto`) |

### `api comment delete <comment-id>`

Delete a comment. Requires `--yes`.

**Options:**
| Flag | Description |
|------|-------------|
| `--yes` (required) | Confirm moderation action |
| `--source <source>` | `auto`, `env`, or `local-profile` (default: `auto`) |

### `api comment pin <comment-id>`

Pin a comment. Requires `--yes`.

**Options:**
| Flag | Description |
|------|-------------|
| `--yes` (required) | Confirm moderation action |
| `--source <source>` | `auto`, `env`, or `local-profile` (default: `auto`) |

### `api comment reply <comment-id> <text>`

Reply to a comment as the publication. Requires `--yes`.

**Options:**
| Flag | Description |
|------|-------------|
| `--yes` (required) | Confirm reply |
| `--source <source>` | `auto`, `env`, or `local-profile` (default: `auto`) |

### `api comment settings <post-id>`

[PROBE] Show or update comment settings for a post. Updates require `--yes`.

**Options:**
| Flag | Description | Default |
|------|-------------|---------|
| `--source <source>` | `auto`, `env`, or `local-profile` | `auto` |
| `--require-paid` | Require paid subscribers to comment | `false` |
| `--require-subscriber` | Require subscribers to comment | `false` |
| `--hold-for-review` | Hold comments for moderation review | `false` |
| `--disable` | Disable commenting | `false` |
| `--auto-approve-repeated` | Auto-approve repeated commenters | `false` |
| `--yes` | Confirm settings update | `false` |

### `api commenter mute <user-id>`

[PROBE] Mute a commenter. Requires `--yes`.

**Options:**
| Flag | Description |
|------|-------------|
| `--yes` (required) | Confirm mute action |
| `--source <source>` | `auto`, `env`, or `local-profile` (default: `auto`) |

### `api commenter ban <user-id>`

[PROBE] Ban a commenter. Requires `--yes`.

**Options:**
| Flag | Description |
|------|-------------|
| `--yes` (required) | Confirm ban action |
| `--source <source>` | `auto`, `env`, or `local-profile` (default: `auto`) |

### `api team list`

List publication team members. Email addresses are redacted unless `--include-emails` is passed.

**Options:**
| Flag | Description | Default |
|------|-------------|---------|
| `--source <source>` | `auto`, `env`, or `local-profile` | `auto` |
| `--include-emails` | Include team member email addresses | `false` |

### `api team activity`

[PROBE] Show recent team activity if an endpoint is available.

**Options:**
| Flag | Description | Default |
|------|-------------|---------|
| `--source <source>` | `auto`, `env`, or `local-profile` | `auto` |

### `api team invite <email>`

[PROBE] Invite a collaborator. Requires `--yes`.

**Options:**
| Flag | Description |
|------|-------------|
| `--role <role>` (required) | `admin`, `editor`, `contributor`, or `reader` |
| `--source <source>` | `auto`, `env`, or `local-profile` (default: `auto`) |
| `--yes` (required) | Confirm team invitation |

### `api team remove <user-id>`

[PROBE] Remove a collaborator. Requires `--yes`.

**Options:**
| Flag | Description |
|------|-------------|
| `--source <source>` | `auto`, `env`, or `local-profile` (default: `auto`) |
| `--yes` (required) | Confirm team member removal |

### `api team role <user-id>`

[PROBE] Change a collaborator role. Requires `--yes`.

**Options:**
| Flag | Description |
|------|-------------|
| `--role <role>` (required) | `admin`, `editor`, `contributor`, or `reader` |
| `--source <source>` | `auto`, `env`, or `local-profile` (default: `auto`) |
| `--yes` (required) | Confirm team role update |

### `api publication get`

Fetch full publication details including branding fields.

**Options:**
| Flag | Description | Default |
|------|-------------|---------|
| `--source <source>` | `auto`, `env`, or `local-profile` | `auto` |

### `api publication settings`

Fetch publication settings (colors, fonts, branding).

**Options:**
| Flag | Description | Default |
|------|-------------|---------|
| `--source <source>` | `auto`, `env`, or `local-profile` | `auto` |

### `api publication get-details`

Alias for `api publication settings`. Fetches publication settings using `fetchPublicationSettings()`.

**Options:**
| Flag | Description | Default |
|------|-------------|---------|
| `--source <source>` | `auto`, `env`, or `local-profile` | `auto` |

### `api publication set`

Preview publication settings changes. Live settings writes are manual/admin only until safe endpoint captures exist; without `--dry-run`, the command returns a structured blocked result that points to `coverage safe-surface --id publication-admin-writes`.

**Options:**
| Flag | Description | Default |
|------|-------------|---------|
| `--source <source>` | `auto`, `env`, or `local-profile` | `auto` |
| `--from-json <file>` | JSON file with settings to apply | — |
| `--from-yaml <file>` | YAML file with settings to apply | — |
| `--name <name>` | Publication name | — |
| `--description <description>` | Publication description | — |
| `--hero-text <text>` | Hero text | — |
| `--logo-url <url>` | Logo URL | — |
| `--favicon-url <url>` | Favicon URL | — |
| `--primary-color <color>` | Primary color (hex) | — |
| `--secondary-color <color>` | Secondary color (hex) | — |
| `--background-color <color>` | Background color (hex) | — |
| `--text-color <color>` | Text color (hex) | — |
| `--font-heading <font>` | Heading font family | — |
| `--font-body <font>` | Body font family | — |
| `--seo-title <title>` | SEO meta title | — |
| `--seo-description <description>` | SEO meta description | — |
| `--og-image-url <url>` | Open Graph image URL | — |
| `--email-header-color <color>` | Email header color (hex) | — |
| `--email-footer-color <color>` | Email footer color (hex) | — |
| `--dry-run` | Preview changes without writing | `false` |
| `--yes` | Reserved for future verified write automation; currently blocked without safe captures | `false` |

### `api publication upload-logo`

Blocked manual/admin operation. Use the Substack dashboard for logo changes until upload and settings-write endpoint captures are proven safe. The CLI returns a structured blocked result when `--yes` is supplied.

**Arguments:**
| Name | Description |
|------|-------------|
| `file` | Logo image file to upload |

**Options:**
| Flag | Description | Default |
|------|-------------|---------|
| `--source <source>` | `auto`, `env`, or `local-profile` | `auto` |
| `--yes` | Required to reach the structured blocked response | — |

### `api publication upload-favicon`

Blocked manual/admin operation. Use the Substack dashboard for favicon changes until upload and settings-write endpoint captures are proven safe. The CLI returns a structured blocked result when `--yes` is supplied.

**Arguments:**
| Name | Description |
|------|-------------|
| `file` | Favicon image file to upload |

**Options:**
| Flag | Description | Default |
|------|-------------|---------|
| `--source <source>` | `auto`, `env`, or `local-profile` | `auto` |
| `--yes` | Required to reach the structured blocked response | — |

### `api domain status`

Show custom domain status and DNS configuration. Read-only; no confirmation required.

**Options:**
| Flag | Description | Default |
|------|-------------|---------|
| `--source <source>` | `auto`, `env`, or `local-profile` | `auto` |

### `api domain verify`

Refresh custom domain verification and SSL status without mutating settings.

**Options:**
| Flag | Description | Default |
|------|-------------|---------|
| `--source <source>` | `auto`, `env`, or `local-profile` | `auto` |

### `api domain set`

[PROBE] Attempt to set a custom domain for the publication. The Substack API domain mutation endpoint has not been confirmed, so this probes known paths (`/api/v1/publication/custom_domain`, `/api/v1/publication/domain`, `/api/v1/publication/update`) and reports availability. Requires `--yes`.

**Options:**
| Flag | Description | Default |
|------|-------------|---------|
| `--domain <domain>` (required) | Custom domain to set (e.g., `newsletter.example.com`) | — |
| `--source <source>` | `auto`, `env`, or `local-profile` | `auto` |
| `--yes` | Confirm domain change without interactive prompt | `false` |

### `api domain remove`

[PROBE] Attempt to remove the custom domain and revert to the Substack subdomain. The Substack API domain mutation endpoint has not been confirmed, so this probes known paths and reports availability. Requires `--yes`.

**Options:**
| Flag | Description | Default |
|------|-------------|---------|
| `--source <source>` | `auto`, `env`, or `local-profile` | `auto` |
| `--yes` | Confirm domain removal without interactive prompt | `false` |

### `api profile me`

Show own profile information.

**Options:**
| Flag | Description | Default |
|------|-------------|---------|
| `--source <source>` | `auto`, `env`, or `local-profile` | `auto` |

### `api profile show <handle>`

Show public profile by handle.

**Arguments:**
| Name | Description |
|------|-------------|
| `handle` | User handle or slug |

**Options:**
| Flag | Description | Default |
|------|-------------|---------|
| `--source <source>` | `auto`, `env`, or `local-profile` | `auto` |

### `api following`

Show users that the authenticated user follows.

### `api following list`

List followed users.

**Options:**
| Flag | Description | Default |
|------|-------------|---------|
| `--limit <limit>` | Maximum number of users to list | `10` |
| `--source <source>` | `auto`, `env`, or `local-profile` | `auto` |

### `api subscriber count`

Show subscriber count from the publication checklist.

**Options:**
| Flag | Description | Default |
|------|-------------|---------|
| `--source <source>` | `auto`, `env`, or `local-profile` | `auto` |

### `api subscriber list`

List subscribers for the publication with pagination support.

**Options:**
| Flag | Description | Default |
|------|-------------|---------|
| `--source <source>` | `auto`, `env`, or `local-profile` | `auto` |
| `--limit <limit>` | Maximum number of subscribers to return | `100` |
| `--offset <offset>` | Offset for pagination | `0` |
| `--status <status>` | Filter by status | — |
| `--tier <tier>` | Filter by tier | — |
| `--date-from <date>` | Filter by subscription date from | — |
| `--date-to <date>` | Filter by subscription date to | — |
| `--source-filter <source>` | Filter by subscriber source | — |

### `api subscriber export`

[PROBE] Export subscribers as CSV. This may be dashboard-only.

**Options:**
| Flag | Description | Default |
|------|-------------|---------|
| `--source <source>` | `auto`, `env`, or `local-profile` | `auto` |
| `--format <format>` | Export format, currently `csv` | `csv` |
| `--status <status>` | Filter by status | — |
| `--tier <tier>` | Filter by tier | — |

### `api subscriber import <csv-data>`

[PROBE] Import subscribers from CSV data or a CSV file path. Requires `--yes`.

**Options:**
| Flag | Description |
|------|-------------|
| `--yes` (required) | Confirm import |
| `--source <source>` | `auto`, `env`, or `local-profile` (default: `auto`) |

### `api subscriber segment list`

[PROBE] List subscriber segments or groups.

**Options:**
| Flag | Description | Default |
|------|-------------|---------|
| `--source <source>` | `auto`, `env`, or `local-profile` | `auto` |

### `api subscriber suppress <email>`

[PROBE] Add an email address to the suppression list. Requires `--yes`.

**Options:**
| Flag | Description |
|------|-------------|
| `--yes` (required) | Confirm suppression |
| `--source <source>` | `auto`, `env`, or `local-profile` (default: `auto`) |

### `api subscriber suppression-list list`

[PROBE] List suppression entries.

**Options:**
| Flag | Description | Default |
|------|-------------|---------|
| `--source <source>` | `auto`, `env`, or `local-profile` | `auto` |

### `api subscriber gift list`

[PROBE] List gift subscriptions.

**Options:**
| Flag | Description | Default |
|------|-------------|---------|
| `--source <source>` | `auto`, `env`, or `local-profile` | `auto` |

### `api analytics inventory`

Probe all analytics endpoints and report availability.

**Options:**
| Flag | Description | Default |
|------|-------------|---------|
| `--source <source>` | `auto`, `env`, or `local-profile` | `auto` |
| `--post-id <id>` | Post ID for post-level analytics | — |

### `api analytics post <post-id>`

Fetch analytics for a specific post.

**Arguments:**
| Name | Description |
|------|-------------|
| `post-id` | Post ID to fetch analytics for |

**Options:**
| Flag | Description | Default |
|------|-------------|---------|
| `--source <source>` | `auto`, `env`, or `local-profile` | `auto` |
| `--format <format>` | `json`, `csv`, or `table` | `json` |

### `api analytics subscribers`

Fetch subscriber growth analytics.

**Options:**
| Flag | Description | Default |
|------|-------------|---------|
| `--source <source>` | `auto`, `env`, or `local-profile` | `auto` |
| `--period <period>` | Growth period label: `daily`, `weekly`, or `monthly` | `daily` |
| `--format <format>` | `json`, `csv`, or `table` | `json` |

### `api analytics email`

Fetch email performance analytics.

**Options:**
| Flag | Description | Default |
|------|-------------|---------|
| `--source <source>` | `auto`, `env`, or `local-profile` | `auto` |
| `--limit <limit>` | Maximum number of emails to return | `10` |
| `--format <format>` | `json`, `csv`, or `table` | `json` |

### `api analytics revenue`

Fetch revenue analytics.

**Options:**
| Flag | Description | Default |
|------|-------------|---------|
| `--source <source>` | `auto`, `env`, or `local-profile` | `auto` |
| `--format <format>` | `json`, `csv`, or `table` | `json` |

### `api analytics snapshot`

Capture an analytics snapshot and append to local snapshot store.

**Options:**
| Flag | Description | Default |
|------|-------------|---------|
| `--source <source>` | `auto`, `env`, or `local-profile` | `auto` |
| `--interval <interval>` | `daily`, `weekly`, or `monthly` | `daily` |
| `--post-id <id>` | Post ID for post-level analytics | — |

### `api billing summary`

Probe all billing endpoints and report availability.

**Options:**
| Flag | Description | Default |
|------|-------------|---------|
| `--source <source>` | `auto`, `env`, or `local-profile` | `auto` |
| `--include-pii` | Include unredacted PII if returned by Substack | `false` |

### `api billing tiers`

List subscription tiers and pricing.

**Options:**
| Flag | Description | Default |
|------|-------------|---------|
| `--source <source>` | `auto`, `env`, or `local-profile` | `auto` |
| `--include-pii` | Include unredacted PII if returned by Substack | `false` |

### `api billing payouts`

Show payout history.

**Options:**
| Flag | Description | Default |
|------|-------------|---------|
| `--source <source>` | `auto`, `env`, or `local-profile` | `auto` |
| `--include-pii` | Include unredacted PII if returned by Substack | `false` |

### `api billing taxes`

Show tax form status.

**Options:**
| Flag | Description | Default |
|------|-------------|---------|
| `--source <source>` | `auto`, `env`, or `local-profile` | `auto` |
| `--include-pii` | Include unredacted PII if returned by Substack | `false` |

### `api billing refund <subscriber-id>`

[PROBE] Attempt to initiate a subscriber refund. Requires `--yes` and typed `--confirm refund`.

**Options:**
| Flag | Description |
|------|-------------|
| `--source <source>` | `auto`, `env`, or `local-profile` (default: `auto`) |
| `--amount <amount>` | Optional refund amount in dollars |
| `--reason <reason>` | Optional refund reason |
| `--yes` (required) | Confirm refund operation |
| `--confirm refund` (required) | Typed confirmation |

### `api billing promote`

[PROBE] List boosted post promotions.

**Options:**
| Flag | Description | Default |
|------|-------------|---------|
| `--source <source>` | `auto`, `env`, or `local-profile` | `auto` |
| `--include-pii` | Include unredacted PII if returned by Substack | `false` |

### `api email template`

Show current email template settings.

**Options:**
| Flag | Description | Default |
|------|-------------|---------|
| `--source <source>` | `auto`, `env`, or `local-profile` | `auto` |

### `api email set-template`

[PROBE] Update email template settings. Use `--dry-run` to preview or `--yes` to confirm.

**Options:**
| Flag | Description | Default |
|------|-------------|---------|
| `--source <source>` | `auto`, `env`, or `local-profile` | `auto` |
| `--header-html <html>` | Email header HTML content | — |
| `--footer-html <html>` | Email footer HTML content | — |
| `--logo-url <url>` | Email logo URL | — |
| `--primary-color <color>` | Email primary color | — |
| `--background-color <color>` | Email background color | — |
| `--text-color <color>` | Email text color | — |
| `--font-family <font>` | Email font family | — |
| `--dry-run` | Preview changes without writing | `false` |
| `--yes` | Confirm update without interactive prompt | `false` |

### `api email broadcast list`

Show broadcast history.

**Options:**
| Flag | Description | Default |
|------|-------------|---------|
| `--source <source>` | `auto`, `env`, or `local-profile` | `auto` |
| `--limit <limit>` | Maximum broadcasts to return | `20` |

### `api email broadcast cancel <broadcast-id>`

Cancel a scheduled broadcast.

**Arguments:**
| Name | Description |
|------|-------------|
| `broadcast-id` | Broadcast ID to cancel |

**Options:**
| Flag | Description |
|------|-------------|
| `--yes` (required) | Confirm cancellation |

### `api email send-test <draft-id>`

Send a test email for a draft.

**Arguments:**
| Name | Description |
|------|-------------|
| `draft-id` | Draft ID to send test for |

**Options:**
| Flag | Description |
|------|-------------|
| `--yes` (required) | Confirm sending test email |

### `api podcast section`

Show podcast section details.

**Options:**
| Flag | Description | Default |
|------|-------------|---------|
| `--source <source>` | `auto`, `env`, or `local-profile` | `auto` |

### `api podcast episodes`

List podcast episodes.

**Options:**
| Flag | Description | Default |
|------|-------------|---------|
| `--source <source>` | `auto`, `env`, or `local-profile` | `auto` |
| `--limit <limit>` | Maximum episodes to return | `20` |

### `api podcast settings`

Show podcast distribution settings.

**Options:**
| Flag | Description | Default |
|------|-------------|---------|
| `--source <source>` | `auto`, `env`, or `local-profile` | `auto` |

### `api podcast create <audio-file>`

Blocked native media write. Use `media audio plan --file <audio-file> --post <markdown>` for planning and perform native podcast/video uploads manually until safe endpoint captures exist.

**Arguments:**
| Name | Description |
|------|-------------|
| `audio-file` | Audio file path |

**Options:**
| Flag | Description |
|------|-------------|
| `--source <source>` | `auto`, `env`, or `local-profile` (default: `auto`) |
| `--title <title>` | Episode title |
| `--draft-id <id>` | Existing draft ID to attach audio to |
| `--yes` (required) | Required to reach the structured blocked response |

### `api podcast schedule <draft-id>`

Blocked native media write. Use campaign planning plus manual dashboard scheduling until safe endpoint captures exist.

**Arguments:**
| Name | Description |
|------|-------------|
| `draft-id` | Draft ID to schedule |

**Options:**
| Flag | Description |
|------|-------------|
| `--at <iso-date>` (required) | ISO timestamp for scheduled publication |
| `--yes` (required) | Required to reach the structured blocked response |

### `api podcast video upload <file>`

Blocked native video write. Use `media video plan --file <file> --post <markdown>` and `live plan` for planning-only workflows until safe endpoint captures exist.

**Arguments:**
| Name | Description |
|------|-------------|
| `file` | Video file path |

**Options:**
| Flag | Description | Default |
|------|-------------|---------|
| `--source <source>` | `auto`, `env`, or `local-profile` | `auto` |
| `--yes` (required) | Required to reach the structured blocked response |

### `api podcast video settings <post-id>`

Show video player settings for a post.

**Arguments:**
| Name | Description |
|------|-------------|
| `post-id` | Post ID to inspect |

**Options:**
| Flag | Description | Default |
|------|-------------|---------|
| `--source <source>` | `auto`, `env`, or `local-profile` | `auto` |

### `api integrations list`

List configured integrations and their status.

**Options:**
| Flag | Description | Default |
|------|-------------|---------|
| `--source <source>` | `auto`, `env`, or `local-profile` | `auto` |

### `api integrations crosspost <post-id>`

Blocked integrations write. Use manual dashboard cross-posting until destination consent, idempotency, and endpoint captures exist.

**Arguments:**
| Name | Description |
|------|-------------|
| `post-id` | Post ID to cross-post |

**Options:**
| Flag | Description |
|------|-------------|
| `--platform <platform>` (required) | Target platform (e.g., twitter, bluesky) |
| `--yes` (required) | Required to reach the structured blocked response |

### `api integrations import wordpress <file>`

Blocked import workflow. Use the Substack dashboard/manual import flow until safe endpoint captures exist.

**Arguments:**
| Name | Description |
|------|-------------|
| `file` | WordPress export file path |

**Options:**
| Flag | Description |
|------|-------------|
| `--yes` (required) | Required to reach the structured blocked response |

### `api integrations import rss <url>`

Blocked import workflow. Use the Substack dashboard/manual import flow until safe endpoint captures exist.

**Arguments:**
| Name | Description |
|------|-------------|
| `url` | RSS feed URL |

**Options:**
| Flag | Description |
|------|-------------|
| `--yes` (required) | Required to reach the structured blocked response |

### `api integrations tokens`

List API tokens (redacted).

**Options:**
| Flag | Description | Default |
|------|-------------|---------|
| `--source <source>` | `auto`, `env`, or `local-profile` | `auto` |

### `api integrations tokens list`

Alias for `api integrations tokens`; lists API tokens with token values redacted.

**Options:**
| Flag | Description | Default |
|------|-------------|---------|
| `--source <source>` | `auto`, `env`, or `local-profile` | `auto` |

---

## `config`

Manage non-secret local configuration.

### `config show`

Show effective CLI configuration without exposing secrets.

### `config set-publication <url>`

Set the default Substack publication URL.

### `config set-runtime <runtime>`

Set the browser runtime. Valid values: `browserbase`, `local`, `camoufox`.

### `config set-operator-mode <mode>`

Set operator defaults for `solo`, `team`, `agency`, or `ci` use. `config show`
prints the derived policy for confirmation posture, audit retention, secret
handling, and multi-publication review without exposing secrets or bypassing
write confirmations.

---

## `auth`

Manage authenticated browser sessions.

### `auth status`

Show configured publication and browser environment status.

### `auth login`

Start or resume a Browserbase session for manual Substack login.

**Options:**
| Flag | Description | Default |
|------|-------------|---------|
| `--session-id <id>` | Existing Browserbase session ID to resume | — |
| `--auto-login` | Attempt Substack login using `SUBSTACK_EMAIL` / `SUBSTACK_PASSWORD` | `false` |
| `--pause-before-password` | For local auto-login, stop after focusing the password field | `false` |
| `--wait-seconds <seconds>` | Keep session open for manual login before closing | `0` |

### `auth logout`

Forget the locally stored Browserbase session ID.

---

## `debug`

Diagnostic helpers.

### `debug local-page [url]`

Inspect visible links, buttons, and editor fields from the local browser profile.

### `debug publish-screen <url>`

Navigate to a draft URL and inspect the publish review screen structure.

**Options:**
| Flag | Description | Default |
|------|-------------|---------|
| `--capture` | Click Continue first to reveal the review overlay | `false` |

### `debug review-overlay <url>`

Navigate to a draft URL and inspect the review overlay.

**Options:**
| Flag | Description | Default |
|------|-------------|---------|
| `--capture` | Click Continue first to reveal the review overlay | `true` |

### `debug schedule-screen <url>`

Navigate to a draft URL and inspect the schedule picker UI.
