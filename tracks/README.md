# Conductor Tracks

This directory breaks the Substack CLI roadmap into implementation tracks that can be picked up independently. Track status reflects the current repository state after the initial working local draft proof of concept.

## Status Summary

| Track                                     | Status      | Current Position                                                                                         |
| ----------------------------------------- | ----------- | -------------------------------------------------------------------------------------------------------- |
| 01. Editor Schema Mapping                 | In progress | Basic Markdown, front matter, links, bold text, paywall and subscribe placeholders are covered by tests. |
| 02. Content Feature Parity                | Planned     | Needs coverage for images, tables, embeds, captions, callouts, code blocks, and footnotes.               |
| 03. Draft, Publish, and Schedule          | In progress | Local draft creation is validated; publish and schedule are scaffolded but not validated.                |
| 04. Browser Runtime Hardening             | In progress | Local Chrome profile works with manual CAPTCHA; Browserbase and Stagehand remain scaffolded.             |
| 05. External Project Research             | Planned     | Initial scan identified projects and feature ideas to review systematically.                             |
| 06. API Auth and Session Extraction       | In progress | Cookie extraction and read-only auth validation work against local browser profile sessions.             |
| 07. API Read Model                        | In progress | Maps user, publication, sections, and bounded recent posts; drafts and pagination remain.                |
| 08. API Draft Write Model                 | In progress | No-network draft write planning is implemented; live create/update waits on endpoint confirmation.       |
| 09. API Content Payload Compatibility     | In progress | API payload builder and unsupported-node preflight are implemented; captured draft comparison remains.   |
| 10. API Media Upload                      | In progress | Media parsing and inspection are implemented; live upload transport remains pending.                     |
| 11. API Prepublish, Publish, and Schedule | In progress | Local prepublish validation and review-only trace artifacts gate browser publish and schedule.           |
| 12. Transport Selection and Fallback      | In progress | Draft, publish, and schedule now accept transport selection; API writes still fail cleanly.              |
| 13. Dependency and Discovery Register     | Active      | Track missed work, open questions, and newly identified interdependencies.                               |
| 14. Quality, CI, and Automation           | Active      | Maintain linting, formatting, coverage, mutation testing, CI, and dependency automation.                 |
| 15. MCP Integration                       | Planned     | Expose selected CLI summaries and validation flows through MCP without leaking local secrets.            |

## Operating Rules

- Keep local credentials, browser profiles, traces, screenshots, and `.env` files out of Git.
- Prefer draft-first workflows. Publishing and scheduling require explicit confirmation.
- Do not add CAPTCHA solving or deceptive access bypass behavior.
- Treat undocumented direct API behavior as research input, not the default execution path.
- Update the relevant track file when a milestone is completed or deliberately deferred.
- Record newly discovered tasks or blockers in `tracks/13-dependency-and-discovery-register.md` before expanding scope.
