# Conductor Tracks

This directory breaks the Substack CLI roadmap into implementation tracks that can be picked up independently. Track status should describe the current repository state, not intended scope.

## Status Labels

- **Implemented**: wired into CLI/MCP/source paths and covered by tests or documented manual validation.
- **Partial**: useful behavior exists, but important write paths, endpoints, or validation remain missing.
- **Probe-only**: code attempts known or likely endpoints and reports graceful not-found/unsupported responses; this is not full platform support.
- **Read-only**: inspection/listing exists, but mutation is not implemented or endpoint discovery is incomplete.
- **In progress**: active track with incomplete acceptance criteria.
- **Planned**: tracked but not substantially implemented.

## Status Summary

| Track | Status | Current Position |
| --- | --- | --- |
| 01. Editor Schema Mapping | Implemented | Markdown/frontmatter to HTML and ProseMirror schema mapping with fixtures and tests. |
| 02. Content Feature Parity | Implemented | Common Markdown, tables, images, embeds, and verification warnings are supported with tests. |
| 03. Draft, Publish, and Schedule | Implemented | Browser/API draft, publish, and schedule workflows are wired; live validation remains environment-dependent. |
| 04. Browser Runtime Hardening | Implemented | Error classes, Chrome detection, retries, and CAPTCHA detection are present. |
| 05. External Project Research | Implemented | External project review and endpoint research are documented. |
| 06. API Auth and Session Extraction | Implemented | Cookie extraction, validation, and redacted auth status are wired. |
| 07. API Read Model | Implemented | User/publication/sections/posts/drafts inventory with typed parsing and pagination support. |
| 08. API Draft Write Model | Implemented | Draft create/update and mapping persistence are wired for API transport. |
| 09. API Content Payload Compatibility | Implemented | Payload builder and contract validation exist for supported draft fields. |
| 10. API Media Upload | Implemented | Image upload path is implemented; broader media support remains partial. |
| 11. API Prepublish, Publish, and Schedule | Implemented | Publish/schedule paths are wired, review-only/dry-run/trace gaps are resolved, and remaining behavior is live-environment dependent. |
| 12. Transport Selection and Fallback | Implemented | Browser/API/auto transport selection is exposed on publishing commands. |
| 13. Dependency and Discovery Register | Implemented | Discovery register exists; keep updating when scope changes. |
| 14. Quality, CI, and Automation | Implemented | CI, lint/format, typecheck, coverage, mutation, audit, and secret-scan hooks exist. |
| 15. MCP Integration | Implemented | MCP stdio server, tools, resources, prompts, and redaction boundaries are wired. |
| 16. Publish Navigation Diagnosis | Implemented | Two-step publish confirmation flow is documented and coded. |
| 17. Publication Settings & Branding | Implemented | Reads publication settings and documents write endpoint gaps as platform-discovery limits. |
| 18. Custom Domain Management | Implemented | Reads domain status and DNS guidance; mutation remains an explicit platform-discovery gap. |
| 19. Subscriber Management | Implemented | Count/list are implemented and unsupported subscriber management paths are documented. |
| 20. Comments & Moderation | Implemented | List, approve/delete/pin, and reply paths are implemented with confirmation gates; unsupported moderation surfaces are documented. |
| 21. Community Features | Implemented | Notes and following are implemented; recommendations/chat/DM remain documented platform gaps. |
| 22. Analytics & Reporting | Implemented | Endpoint probes and graceful unsupported responses are implemented; dashboard parity is not overclaimed. |
| 23. Revenue & Billing | Implemented | Billing/revenue probes and publication payment state are implemented with sensitive-data boundaries. |
| 24. Email & Newsletter Design | Implemented | Template, broadcast, cancel, and test-email probes are implemented with confirmation gates. |
| 25. Podcast & Video Management | Implemented | Podcast/video commands and media-operation gates are implemented against discovered/probed paths. |
| 26. Cross-posting & Integrations | Implemented | Integration/import/token probes are implemented with redaction and confirmation gates. |
| 27. Team Management | Implemented | Team member listing is implemented and unsupported write paths are documented. |
| 28. Package Publishing | Implemented | npm package metadata and packaging workflow are documented. |
| 29. Contributor Documentation | Implemented | Contributor, conduct, changelog, and security docs exist. |
| 30. API Documentation | Implemented | Architecture and command reference docs exist. |
| 31. Remaining Platform Gaps | Implemented | Gap catalogue exists; use it to prevent overclaiming. |
| 32. Vendored Substack API Source | Implemented | Vendored `substack-api` source is wired through `file:vendor/substack-api`. |
| 33. CI, Coverage, and Quality Hardening | Implemented | Strict quality hardening, coverage gates, E2E dispatch, and secret scanning are complete. |
| 34. Publication Routes & Registry Distribution | Implemented | Distribution routes, release workflow, provenance, package metadata, and completion helpers are reconciled. |
| 35. MCP Registry Readiness | Implemented | Registry metadata, validation, publisher helper, and submission docs are complete; live submission is an external auth gate. |
| 36. VS Code Integration Packaging | Implemented | VS Code docs, workspace config, extension metadata, and validation checks are complete. |
| 37. Claude Integration Packaging | Implemented | Claude setup docs, manifest scaffold, safety boundaries, and validation checks are complete. |
| 38. Gemini Integration Packaging | Implemented | Gemini docs, project config, manifest scaffold, installed-CLI command validation, and validation checks are complete. |
| 39. Codex Integration Packaging | Implemented | Codex docs, manifest scaffold, isolated `codex mcp add/list` validation, and ChatGPT remote-MCP distinction are complete. |
| 40. Copilot Integration Packaging | Implemented | Copilot-through-VS-Code docs, workspace config, manifest scaffold, and validation checks are complete. |
| 41. Creator OS Upgrade | Implemented | Campaign planning, media/live planning, analytics snapshots/trends, growth reports, community triage, Creator OS front matter/run-log actions, and read-only MCP creator tools are complete. |
| 42. Frontier Coverage Roadmap | Implemented | Canonical 100% feature coverage roadmap, CLI/MCP review surfaces, launch/admin checklist, drift workflow, run-log actions, and maintenance docs are complete; external launches remain owner-approved gates. |
| 43. Creator OS Completion Hardening | Planned | API contract versioning, evidence promotion, capture kit, data warehouse, deliverability, backup, drift, strictness, CI/CD, and dependency lanes are documented for implementation. |

## Operating Rules

- Keep local credentials, browser profiles, traces, screenshots, and `.env` files out of Git.
- Prefer draft-first workflows. Publishing and scheduling require explicit confirmation.
- Do not add CAPTCHA solving or deceptive access bypass behavior.
- Treat undocumented direct API behavior as research input, not the default execution path.
- Update the relevant track file when a milestone is completed or deliberately deferred.
- Record newly discovered tasks or blockers in `tracks/13-dependency-and-discovery-register.md` before expanding scope.
- For Track 42 implementation, commit after each completed task, review and push after each phase, apply safe review fixes automatically, and check GitHub Actions after the track push.
- For Track 43 implementation, keep API contract changes, capture infrastructure, data warehouse work, CI hardening, and dependency experiments in separate branches where possible.
