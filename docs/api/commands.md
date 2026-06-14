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
| `--source <source>` | `auto`, `env`, or `local-profile` (default: `auto`) |

### `api team list`

List publication team members.

**Options:**
| Flag | Description | Default |
|------|-------------|---------|
| `--source <source>` | `auto`, `env`, or `local-profile` | `auto` |

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

Update publication settings with a read-modify-write cycle. Requires either `--yes` or `--dry-run`.

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
| `--yes` | Confirm update without interactive prompt | `false` |

### `api publication upload-logo`

Upload a logo image and update publication settings. Requires `--yes`.

**Arguments:**
| Name | Description |
|------|-------------|
| `file` | Logo image file to upload |

**Options:**
| Flag | Description | Default |
|------|-------------|---------|
| `--source <source>` | `auto`, `env`, or `local-profile` | `auto` |
| `--yes` | Confirm upload without interactive prompt | — |

### `api publication upload-favicon`

Upload a favicon image and update publication settings. Requires `--yes`.

**Arguments:**
| Name | Description |
|------|-------------|
| `file` | Favicon image file to upload |

**Options:**
| Flag | Description | Default |
|------|-------------|---------|
| `--source <source>` | `auto`, `env`, or `local-profile` | `auto` |
| `--yes` | Confirm upload without interactive prompt | — |

### `api domain status`

Show custom domain status and DNS configuration.

**Options:**
| Flag | Description | Default |
|------|-------------|---------|
| `--source <source>` | `auto`, `env`, or `local-profile` | `auto` |

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

### `api analytics subscribers`

Fetch subscriber growth analytics.

**Options:**
| Flag | Description | Default |
|------|-------------|---------|
| `--source <source>` | `auto`, `env`, or `local-profile` | `auto` |

### `api analytics email`

Fetch email performance analytics.

**Options:**
| Flag | Description | Default |
|------|-------------|---------|
| `--source <source>` | `auto`, `env`, or `local-profile` | `auto` |
| `--limit <limit>` | Maximum number of emails to return | `10` |

### `api analytics revenue`

Fetch revenue analytics.

**Options:**
| Flag | Description | Default |
|------|-------------|---------|
| `--source <source>` | `auto`, `env`, or `local-profile` | `auto` |

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

### `api billing tiers`

List subscription tiers and pricing.

**Options:**
| Flag | Description | Default |
|------|-------------|---------|
| `--source <source>` | `auto`, `env`, or `local-profile` | `auto` |

### `api billing payouts`

Show payout history.

**Options:**
| Flag | Description | Default |
|------|-------------|---------|
| `--source <source>` | `auto`, `env`, or `local-profile` | `auto` |

### `api billing taxes`

Show tax form status.

**Options:**
| Flag | Description | Default |
|------|-------------|---------|
| `--source <source>` | `auto`, `env`, or `local-profile` | `auto` |

### `api email template`

Show current email template settings.

**Options:**
| Flag | Description | Default |
|------|-------------|---------|
| `--source <source>` | `auto`, `env`, or `local-profile` | `auto` |

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

Create a podcast episode draft from an audio file.

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
| `--yes` (required) | Confirm episode creation |

### `api podcast schedule <draft-id>`

Schedule a podcast episode for publication.

**Arguments:**
| Name | Description |
|------|-------------|
| `draft-id` | Draft ID to schedule |

**Options:**
| Flag | Description |
|------|-------------|
| `--at <iso-date>` (required) | ISO timestamp for scheduled publication |
| `--yes` (required) | Confirm scheduling |

### `api podcast video upload <file>`

Upload a video file.

**Arguments:**
| Name | Description |
|------|-------------|
| `file` | Video file path |

**Options:**
| Flag | Description | Default |
|------|-------------|---------|
| `--source <source>` | `auto`, `env`, or `local-profile` | `auto` |
| `--yes` (required) | Confirm video upload |

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

Cross-post a published article to another platform.

**Arguments:**
| Name | Description |
|------|-------------|
| `post-id` | Post ID to cross-post |

**Options:**
| Flag | Description |
|------|-------------|
| `--platform <platform>` (required) | Target platform (e.g., twitter, bluesky) |
| `--yes` (required) | Confirm cross-posting |

### `api integrations import wordpress <file>`

Import from WordPress.

**Arguments:**
| Name | Description |
|------|-------------|
| `file` | WordPress export file path |

**Options:**
| Flag | Description |
|------|-------------|
| `--yes` (required) | Confirm import |

### `api integrations import rss <url>`

Import from an RSS feed.

**Arguments:**
| Name | Description |
|------|-------------|
| `url` | RSS feed URL |

**Options:**
| Flag | Description |
|------|-------------|
| `--yes` (required) | Confirm import |

### `api integrations tokens`

List API tokens (redacted).

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
