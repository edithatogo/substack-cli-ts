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
| 11. API Prepublish, Publish, and Schedule | Partial | Publish/schedule paths are wired, but depend on internal endpoints and live validation. |
| 12. Transport Selection and Fallback | Implemented | Browser/API/auto transport selection is exposed on publishing commands. |
| 13. Dependency and Discovery Register | Implemented | Discovery register exists; keep updating when scope changes. |
| 14. Quality, CI, and Automation | Implemented | CI, lint/format, typecheck, coverage, mutation, audit, and secret-scan hooks exist. |
| 15. MCP Integration | Implemented | MCP stdio server, tools, resources, prompts, and redaction boundaries are wired. |
| 16. Publish Navigation Diagnosis | Implemented | Two-step publish confirmation flow is documented and coded. |
| 17. Publication Settings & Branding | Read-only / Partial | Reads publication settings; write endpoints are not discovered/wired. |
| 18. Custom Domain Management | Read-only / Partial | Reads domain status and DNS guidance; domain mutation is not implemented. |
| 19. Subscriber Management | Read-only / Partial | Count and list are implemented; import/export/segments/suppression/gifts are not. |
| 20. Comments & Moderation | Partial | List and selected moderation actions exist; spam/quarantine/commenter management are not. |
| 21. Community Features | Partial | Notes and following are implemented; recommendations/chat/DM remain unsupported. |
| 22. Analytics & Reporting | Probe-only / Partial | Endpoint probes and graceful unsupported responses exist; dashboard parity is not claimed. |
| 23. Revenue & Billing | Probe-only / Partial | Billing/revenue probes and publication payment state exist; management actions are not supported. |
| 24. Email & Newsletter Design | Probe-only / Partial | Template/broadcast/test-email probes exist; full design/template editing is not supported. |
| 25. Podcast & Video Management | Probe-only / Partial | Podcast/video commands probe known paths; native platform parity is not claimed. |
| 26. Cross-posting & Integrations | Probe-only / Partial | Integration/import/token probes exist; actual dashboard-only cross-posting may be unsupported. |
| 27. Team Management | Read-only / Partial | Team member listing exists; invite/remove/role-change are not implemented. |
| 28. Package Publishing | Implemented | npm package metadata and packaging workflow are documented. |
| 29. Contributor Documentation | Implemented | Contributor, conduct, changelog, and security docs exist. |
| 30. API Documentation | Implemented | Architecture and command reference docs exist. |
| 31. Remaining Platform Gaps | Implemented | Gap catalogue exists; use it to prevent overclaiming. |
| 32. Vendored Substack API Source | Implemented | Vendored `substack-api` source is wired through `file:vendor/substack-api`. |
| 33. CI, Coverage, and Quality Hardening | In progress | Strict quality hardening continues; coverage acceptance criteria should match actual thresholds. |
| 34. Publication Routes & Registry Distribution | In progress | Distribution routes are mapped; registry/signing/provenance items remain open. |
| 35. MCP Registry Readiness | In progress | Registry metadata/docs exist; live registry submission remains external/manual. |
| 36. VS Code Integration Packaging | Planned | Track exists for VS Code setup/docs. |
| 37. Claude Integration Packaging | Planned | Track exists for Claude MCP setup/docs. |
| 38. Gemini Integration Packaging | Planned | Track exists for Gemini setup/docs. |
| 39. Codex Integration Packaging | Planned | Track exists for Codex setup/docs. |
| 40. Copilot Integration Packaging | Planned | Track exists for Copilot setup/docs. |

## Operating Rules

- Keep local credentials, browser profiles, traces, screenshots, and `.env` files out of Git.
- Prefer draft-first workflows. Publishing and scheduling require explicit confirmation.
- Do not add CAPTCHA solving or deceptive access bypass behavior.
- Treat undocumented direct API behavior as research input, not the default execution path.
- Update the relevant track file when a milestone is completed or deliberately deferred.
- Record newly discovered tasks or blockers in `tracks/13-dependency-and-discovery-register.md` before expanding scope.
