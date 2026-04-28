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
```

## Discovery Process

When new work is found:

1. Add it to the Open Discoveries table below.
2. Record the source: GitHub project, Substack UI observation, failing test, browser trace, or user request.
3. Identify dependencies and blocked tracks.
4. Promote it into a numbered track when it becomes implementation-ready.

## Open Discoveries

| ID   | Discovery                                                                                                 | Source                        | Depends On    | Blocks              | Status |
| ---- | --------------------------------------------------------------------------------------------------------- | ----------------------------- | ------------- | ------------------- | ------ |
| D001 | Determine whether schedule is available through a stable internal endpoint or must remain browser-only.   | Research matrix               | Tracks 07, 08 | Track 11            | Open   |
| D002 | Decide whether subscriber/analytics export belongs in this CLI or a separate read/export command group.   | User goal: information in/out | Track 07      | Future export track | Open   |
| D003 | Determine how to safely persist source-file-to-draft mappings without leaking private titles or content.  | Draft update requirement      | Tracks 08, 12 | Track 08            | Open   |
| D004 | Identify license constraints before porting behavior from any open-source project.                        | GitHub research               | None          | All adapter tracks  | Open   |
| D005 | Confirm the safest read-only endpoint for validating current user and publication from extracted cookies. | Track 06 implementation       | Track 06      | Track 07            | Open   |

## Additional Improvements To Consider

- Add a `docs/decisions/` directory for architecture decision records.
- Add a `substack-cli doctor` command that checks config, auth, publication access, browser profile state, and ignored secret files.
- Add a `substack-cli export` command group for read-side backup once Track 07 is mapped.
- Add a controlled test publication before validating publish/schedule operations.
- Add CI that runs unit tests and a secret scan, while excluding any live Substack integration tests by default.
