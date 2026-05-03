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
- **PowerShell:** Add `substack-cli completion powershell | Out-String | Invoke-Expression` to your `$PROFILE`.
- **Script helpers:** See `scripts/install-completions.sh` and `scripts/install-completions.ps1`.

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

### `api profile`
Show own or public Substack profile information.

**Options:**
| Flag | Description | Default |
|------|-------------|---------|
| `--handle <handle>` | Show public profile by handle/slug | — |
| `--source <source>` | `auto`, `env`, or `local-profile` | `auto` |

### `api posts list`
List recent posts from your Substack profile.

**Options:**
| Flag | Description | Default |
|------|-------------|---------|
| `--limit <limit>` | Maximum number of posts to list | `10` |
| `--source <source>` | `auto`, `env`, or `local-profile` | `auto` |

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

### `api following`
Show users that the authenticated user follows.

**Options:**
| Flag | Description | Default |
|------|-------------|---------|
| `--limit <limit>` | Maximum number of followed users to list | `10` |
| `--source <source>` | `auto`, `env`, or `local-profile` | `auto` |

### `api subscriber count`
Show subscriber count from the publication checklist.

**Options:**
| Flag | Description | Default |
|------|-------------|---------|
| `--source <source>` | `auto`, `env`, or `local-profile` | `auto` |

### `api team list`
List publication team members.

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
