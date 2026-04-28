# Track 13: Dependency and Discovery Register

## Goal

Maintain a living register of missed work, open questions, and interdependencies discovered during implementation.

## Dependency Map

```text
06 API Auth
  -> 07 API Read Model
  -> 08 API Draft Write Model
  -> 11 API Prepublish/Publish/Schedule

01 Editor Schema + 02 Content Feature Parity
  -> 09 API Content Payload Compatibility
  -> 08 API Draft Write Model

06 API Auth + 09 Payload Compatibility
  -> 10 API Media Upload

Existing Browser Workflow + 08 Draft Write + 11 Publish/Schedule
  -> 12 Transport Selection and Fallback

12 Transport Selection and Fallback
  -> 03 Draft, Publish, and Schedule

14 Quality, CI, and Automation
  -> 15 MCP Integration
```

## Discovery Process

When new work is found:

1. Add it to the Open Discoveries table below.
2. Record the source: GitHub project, Substack UI observation, failing test, browser trace, or user request.
3. Identify dependencies and blocked tracks.
4. Promote it into a numbered track when it becomes implementation-ready.

## Open Discoveries

| ID   | Discovery                                                                                                 | Source                        | Depends On    | Blocks              | Status                                                                                       |
| ---- | --------------------------------------------------------------------------------------------------------- | ----------------------------- | ------------- | ------------------- | -------------------------------------------------------------------------------------------- |
| D001 | Determine whether schedule is available through a stable internal endpoint or must remain browser-only.   | Research matrix               | Tracks 07, 08 | Track 11            | Open                                                                                         |
| D002 | Decide whether subscriber/analytics export belongs in this CLI or a separate read/export command group.   | User goal: information in/out | Track 07      | Future export track | Open                                                                                         |
| D003 | Determine how to safely persist source-file-to-draft mappings without leaking private titles or content.  | Draft update requirement      | Tracks 08, 12 | Track 08            | Resolved: local-only `.substack-cli/draft-mappings.json` store with redacted output          |
| D004 | Identify license constraints before porting behavior from any open-source project.                        | GitHub research               | None          | All adapter tracks  | Open                                                                                         |
| D006 | Confirm the exact draft create/update/fetch request bodies and returned IDs for the live Substack editor. | Track 08 implementation       | Track 08      | Track 08, 11, 12    | Open; local capture, comparison, and fixture tools now available                             |
| D005 | Confirm the safest read-only endpoint for validating current user and publication from extracted cookies. | Track 06 implementation       | Track 06      | Track 07            | Resolved: use `/api/v1/handle/options` plus `/api/v1/user/{handle}/public_profile`           |
| D007 | Define the initial MCP surface for exposing CLI summaries and validation flows without leaking secrets.   | User request                  | Track 14      | Track 15            | Resolved: `mcp surface` manifest plus stdio MCP server with redacted read/review tool groups |

## Additional Improvements To Consider

- Add a `docs/decisions/` directory for architecture decision records.
- Extract stable reusable modules into local workspace packages only after the API surface settles.
- Add a `substack-cli doctor` command that checks config, auth, publication access, browser profile state, and ignored secret files.
- Add a `substack-cli export` command group for read-side backup once Track 07 is mapped.
- Add a controlled test publication before validating publish/schedule operations.
- Add CI that runs unit tests and a secret scan, while excluding any live Substack integration tests by default.
- Add a local draft endpoint capture fixture once D006 is resolved; `api draft fixture` and `api draft compare` now support local diffing.
