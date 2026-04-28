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
| 06. API Auth and Session Extraction       | Proposed    | Build safe cookie/session access for internal API probes.                                                |
| 07. API Read Model                        | Proposed    | Map users, publications, sections, drafts, posts, and available export surfaces.                         |
| 08. API Draft Write Model                 | Proposed    | Create/update/fetch drafts and handle duplicate detection.                                               |
| 09. API Content Payload Compatibility     | Proposed    | Bridge existing Markdown/Tiptap output to Substack's internal post payloads.                             |
| 10. API Media Upload                      | Proposed    | Upload local/remote images and preserve captions/alt text.                                               |
| 11. API Prepublish, Publish, and Schedule | Proposed    | Add gated prepublish, publish, and schedule flows after draft writes are reliable.                       |
| 12. Transport Selection and Fallback      | Proposed    | Let the CLI choose browser, API, or automatic fallback transports.                                       |
| 13. Dependency and Discovery Register     | Active      | Track missed work, open questions, and newly identified interdependencies.                               |
| 14. Quality, CI, and Automation           | Active      | Maintain linting, formatting, coverage, mutation testing, CI, and dependency automation.                 |

## Operating Rules

- Keep local credentials, browser profiles, traces, screenshots, and `.env` files out of Git.
- Prefer draft-first workflows. Publishing and scheduling require explicit confirmation.
- Do not add CAPTCHA solving or deceptive access bypass behavior.
- Treat undocumented direct API behavior as research input, not the default execution path.
- Update the relevant track file when a milestone is completed or deliberately deferred.
- Record newly discovered tasks or blockers in `tracks/13-dependency-and-discovery-register.md` before expanding scope.
